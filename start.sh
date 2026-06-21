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

# -------------------------------------------------------------------
# Cleanup handler — kills ALL background services on exit
# -------------------------------------------------------------------
cleanup() {
  echo ""
  echo "==================================================================="
  echo "  🛑 Shutting down all services..."
  echo "==================================================================="
  for pid in "$WORKER_PID" "$VITE_PID" "$HARDHAT_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  echo ""
  echo "✅ All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

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
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'AgentSwarmEscrow#AgentSwarmEscrow\s*=\s*\K0x[a-fA-F0-9]+' | head -1)
if [[ -z "$CONTRACT_ADDRESS" ]]; then
  CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{40}' | grep -v '^0x0000' | head -1)
fi
if [[ -z "$CONTRACT_ADDRESS" ]]; then
  fail "Could not extract contract address. Check $LOG_DIR/deploy.log"
fi
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

# Update CONTRACT_ADDRESS in .env
python3 -c "
import os, re
addr = os.environ.get('CONTRACT_ADDRESS', '')
with open('.env', 'r') as f: content = f.read()
pat = r'^CONTRACT_ADDRESS=.*$'
repl = f'CONTRACT_ADDRESS={addr}'
if re.search(pat, content, re.MULTILINE):
    content = re.sub(pat, repl, content, flags=re.MULTILINE)
else:
    content += '\\n' + repl + '\\n'
with open('.env', 'w') as f: f.write(content)
print('.env updated')
"
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

# cleanup will run on script exit via EXIT trap
