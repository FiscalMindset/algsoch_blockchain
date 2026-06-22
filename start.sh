#!/usr/bin/env bash
# =============================================================================
# AgentSwarmEscrow — ONE-COMMAND FULL STACK LAUNCHER
# =============================================================================
# Usage:  ./start.sh                    # Starts everything, prompts for goal
#         ./start.sh --workers=5        # Start with 5 workers instead of 3
#         ./start.sh --goal="Build a weather engine" # Auto-submit this goal
#
# What it starts (ALL in parallel, you just type your goal):
#   1. Hardhat node (port 8545)
#   2. Contract deployment via Ignition
#   3. Frontend dev server (port 5173)
#   4. Worker agent swarm (3 workers by default) in background
#   5. Manager agent in FOREGROUND (you type the goal here)
#
# Requirements: node >= 18, python3 >= 3.10, pip
# =============================================================================

set -euo pipefail

# -------------------------------------------------------------------
# Args
# -------------------------------------------------------------------
WORKERS=3
AUTO_GOAL=""
for arg in "$@"; do
  case $arg in
    --workers=*) WORKERS="${arg#*=}" ;;
    --goal=*) AUTO_GOAL="${arg#*=}" ;;
  esac
done

# -------------------------------------------------------------------
# Paths
# -------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOCKCHAIN_DIR="$SCRIPT_DIR/blockchain"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_DIR="$SCRIPT_DIR/logs"

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
info()  { printf "\n[INFO]  %s\n" "$*"; }
ok()    { printf "[OK]    %s\n" "$*"; }
warn()  { printf "[WARN]  %s\n" "$*" >&2; }
fail()  { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

mkdir -p "$LOG_DIR"
rm -f "$LOG_DIR"/*.log

# Track PIDs
HARDHAT_PID=""
VITE_PID=""
WORKER_PID=""
MANAGER_PID=""
API_PID=""

# -------------------------------------------------------------------
# Cleanup handler — kills ALL background services on exit
# -------------------------------------------------------------------
cleanup() {
  echo ""
  echo "==================================================================="
  echo "  🛑 Shutting down all services..."
  echo "==================================================================="
  for pid in "$WORKER_PID" "$VITE_PID" "$HARDHAT_PID" "$API_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  echo ""
  echo "✅ All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# -------------------------------------------------------------------
# Step 0: Prerequisite checks
# -------------------------------------------------------------------
cat <<'ASCII'

╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🐝  Autonomous M2M Agentic Swarm Escrow Protocol                ║
║                                                                   ║
║   One command → Full stack: Hardhat + Contract + Frontend         ║
║   + Worker Swarm + Manager Agent                                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
ASCII

info "Checking prerequisites..."

if ! command -v node &>/dev/null; then fail "node not found. Install Node.js 18+"; fi
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then fail "Node.js 18+ required, found v$NODE_VERSION"; fi
ok "node v$NODE_VERSION"

if ! command -v python3 &>/dev/null; then fail "python3 not found. Install Python 3.10+"; fi
PY_VERSION=$(python3 --version 2>&1 | sed 's/Python //')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
if [[ "$PY_MAJOR" -lt 3 ]] || [[ "$PY_MAJOR" -eq 3 && "$PY_MINOR" -lt 10 ]]; then
  fail "Python 3.10+ required, found $PY_VERSION"
fi
ok "python3 $PY_VERSION"

if ! python3 -m pip --version &>/dev/null; then
  fail "pip not available. Run: python3 -m ensurepip --upgrade"
fi
ok "pip available"

# -------------------------------------------------------------------
# Step 1: Start Hardhat node
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "(1/5) Starting Hardhat node..."
cd "$BLOCKCHAIN_DIR"

if [[ ! -d node_modules ]]; then
  info "   Installing blockchain deps..."
  npm install
fi

npx hardhat node > "$LOG_DIR/hardhat.log" 2>&1 &
HARDHAT_PID=$!
ok "Hardhat node starting (PID $HARDHAT_PID)"

END_TIME=$((SECONDS + 30))
while true; do
  if curl -s -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://127.0.0.1:8545 | grep -q '"result"'; then
    break
  fi
  if [[ $SECONDS -ge $END_TIME ]]; then
    fail "Hardhat node failed to start in 30s. Check $LOG_DIR/hardhat.log"
  fi
  sleep 1
done
ok "Hardhat node ready at http://127.0.0.1:8545"

# -------------------------------------------------------------------
# Step 2: Deploy contract
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "(2/5) Deploying smart contract..."
DEPLOY_OUTPUT=$(npx hardhat ignition deploy ignition/modules/Escrow.js --network localhost 2>&1)
if [[ $? -ne 0 ]]; then
  echo "$DEPLOY_OUTPUT" > "$LOG_DIR/deploy.log"
  fail "Contract deployment failed. Check $LOG_DIR/deploy.log"
fi

echo "$DEPLOY_OUTPUT" > "$LOG_DIR/deploy.log"
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE '0x[a-fA-F0-9]+' | grep -v '^0x0000' | head -1)
if [[ -z "$CONTRACT_ADDRESS" ]]; then
  fail "Could not extract contract address. Check $LOG_DIR/deploy.log"
fi
export CONTRACT_ADDRESS
ok "Contract deployed at $CONTRACT_ADDRESS"

# -------------------------------------------------------------------
# Step 3: Backend setup (.env + venv)
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "(3/5) Configuring Python backend..."
cd "$BACKEND_DIR"

if [[ ! -d venv ]]; then
  info "   Creating Python virtual environment..."
  python3 -m venv venv || fail "Failed to create venv"
fi

source venv/bin/activate
info "   Installing Python packages..."
pip install --quiet -r requirements.txt

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# Update CONTRACT_ADDRESS, NVIDIA_API_KEY, MODEL in .env
python3 - <<PYEOF
import os

contract_addr = os.environ.get('CONTRACT_ADDRESS', '')
root_env_path = os.path.join('$SCRIPT_DIR', '.env')
backend_env_path = '.env'

# Read root .env for NVIDIA vars (handles lowercase root keys → uppercase backend keys)
nvidia_key = ''
model_name = ''
if os.path.exists(root_env_path):
    with open(root_env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith('nvidia_api_key='):
                nvidia_key = line.split('=', 1)[1].strip()
            elif line.startswith('model='):
                model_name = line.split('=', 1)[1].strip()
else:
    print('[WARNING] Root .env not found at', root_env_path)

# Read existing backend .env
with open(backend_env_path, 'r') as f:
    content = f.read()

lines = content.split('\n')
updated = False
found = {'CONTRACT_ADDRESS': False, 'NVIDIA_API_KEY': False, 'MODEL': False}

for i, line in enumerate(lines):
    key = line.split('=')[0].strip() if '=' in line else ''
    if key == 'CONTRACT_ADDRESS':
        lines[i] = f'CONTRACT_ADDRESS={contract_addr}'
        found['CONTRACT_ADDRESS'] = True
        updated = True
    elif key == 'NVIDIA_API_KEY':
        if nvidia_key:
            lines[i] = f'NVIDIA_API_KEY={nvidia_key}'
            found['NVIDIA_API_KEY'] = True
            updated = True
        else:
            found['NVIDIA_API_KEY'] = True  # already set; warn below
    elif key == 'MODEL':
        if model_name:
            lines[i] = f'MODEL={model_name}'
            found['MODEL'] = True
            updated = True
        else:
            found['MODEL'] = True

# Append missing keys
if not found['CONTRACT_ADDRESS'] and contract_addr:
    lines.append(f'CONTRACT_ADDRESS={contract_addr}')
    updated = True
if not found['NVIDIA_API_KEY'] and nvidia_key:
    lines.append(f'NVIDIA_API_KEY={nvidia_key}')
    updated = True
elif not nvidia_key:
    print('[WARNING] NVIDIA_API_KEY not found in root .env — AI features will use fallback')
if not found['MODEL'] and model_name:
    lines.append(f'MODEL={model_name}')
    updated = True

with open(backend_env_path, 'w') as f:
    f.write('\n'.join(lines) + '\n')

print('.env updated')
PYEOF
ok "Backend configured"

# -------------------------------------------------------------------
# Step 4: Start worker swarm (background)
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "(4/5) Starting Worker Swarm ($WORKERS agents in background)..."
python launcher.py "$WORKERS" > "$LOG_DIR/workers.log" 2>&1 &
WORKER_PID=$!
ok "Worker swarm running (PID $WORKER_PID, $WORKERS agents) — log: logs/workers.log"
# Give workers a moment to open connections
sleep 2

# -------------------------------------------------------------------
# Step 5: Start frontend dev server (background)
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "(5/5) Starting frontend dev server..."
cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  info "   Installing frontend deps..."
  npm install
fi

# Update contract address in frontend
sed -i.bak "s/^export const CONTRACT_ADDRESS = '[^']*'/export const CONTRACT_ADDRESS = '$CONTRACT_ADDRESS'/" src/utils/contracts.js
rm -f src/utils/contracts.js.bak

npm run dev > "$LOG_DIR/vite.log" 2>&1 &
VITE_PID=$!
ok "Frontend starting (PID $VITE_PID) — log: logs/vite.log"

END_TIME=$((SECONDS + 30))
while true; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -qE '200|304'; then
    break
  fi
  if [[ $SECONDS -ge $END_TIME ]]; then
    warn "Frontend slow to start. Still checking..."
    break
  fi
  sleep 1
done
ok "Frontend at http://localhost:5173"

# -------------------------------------------------------------------
# Step 6: Start AI API server (background)
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "(6/6) Starting AI API server..."
cd "$BACKEND_DIR"
source venv/bin/activate

nohup python3 api_server.py > "$LOG_DIR/api_server.log" 2>&1 &
API_PID=$!
echo $API_PID > "$LOG_DIR/api_server.pid"
ok "AI API server starting (PID $API_PID) — log: logs/api_server.log"

for i in {1..20}; do
  if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
    ok "AI API server ready at http://127.0.0.1:8000"
    break
  fi
  sleep 0.5
done

# -------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------
echo ""
echo "==================================================================="
echo "  ✅ ALL SERVICES RUNNING"
echo "==================================================================="
printf "| %-18s | %-35s | %-8s |\n" "Service" "Location" "Status"
echo "|--------------------|-------------------------------------|----------|"
printf "| %-18s | %-35s | %-8s |\n" "Hardhat Node" "http://127.0.0.1:8545" "🟢"
printf "| %-18s | %-35s | %-8s |\n" "Smart Contract" "$CONTRACT_ADDRESS" "🟢"
printf "| %-18s | %-35s | %-8s |\n" "Frontend" "http://localhost:5173" "🟢"
printf "| %-18s | %-35s | %-8s |\n" "Worker Swarm" "$WORKERS agents → logs/workers.log" "🟢"
printf "| %-18s | %-35s | %-8s |\n" "AI API Server" "http://127.0.0.1:8000" "🟢"
printf "| %-18s | %-35s | %-8s |\n" "Manager Agent" "foreground below 👇" "🟡"
echo "==================================================================="

echo ""
echo "🚀 Next step: type your goal below and press Enter."
echo "   Example: 'Build a weather forecast engine'"
echo ""

# -------------------------------------------------------------------
# Step 6: Start Manager Agent in foreground (user types goal here)
# -------------------------------------------------------------------
cd "$BACKEND_DIR"
source venv/bin/activate

if [[ -n "$AUTO_GOAL" ]]; then
  info "Auto-submitting goal: $AUTO_GOAL"
  echo "$AUTO_GOAL" | python manager_agent.py
else
  echo "==================================================================="
  echo "  🧠 MANAGER AGENT — waiting for your command"
  echo "==================================================================="
  python manager_agent.py
fi

echo ""
echo "Manager Agent finished. Cleaning up..."

# -------------------------------------------------------------------
# URL Summary + logs/urls.txt
# -------------------------------------------------------------------
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  🚀 Agent Swarm Escrow is live!"
echo "════════════════════════════════════════════════════════════"
echo "    Blockchain RPC:  http://127.0.0.1:8545"
echo "    Frontend URL:    http://localhost:5173"
echo "    Contract:        $CONTRACT_ADDRESS"
echo "════════════════════════════════════════════════════════════"
echo ""

cat > "$LOG_DIR/urls.txt" <<EOF
RPC_URL=http://127.0.0.1:8545
FRONTEND_URL=http://localhost:5173
CONTRACT_ADDRESS=$CONTRACT_ADDRESS
EOF
ok "URLs written to logs/urls.txt"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  🟢 Services are still running!"
echo "════════════════════════════════════════════════════════════"
echo "    Frontend:    http://localhost:5173"
echo "    Blockchain:  http://127.0.0.1:8545"
echo "    AI API:      http://127.0.0.1:8000"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "════════════════════════════════════════════════════════════"
echo ""

# Keep script alive so background processes continue running
while true; do
  sleep 1
done
