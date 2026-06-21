#!/usr/bin/env bash
# =============================================================================
# AgentSwarmEscrow — Full Stack Launcher
# =============================================================================
# Usage:  ./start.sh
# What:   Starts the entire local stack:
#         - Hardhat node (port 8545)
#         - Smart contract deployment
#         - Python backend venv + .env update
#         - Frontend dev server (port 5173)
#
# Requirements: node >= 18, python3 >= 3.10, pip
# =============================================================================

set -euo pipefail

# -------------------------------------------------------------------
# Paths
# -------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOCKCHAIN_DIR="$SCRIPT_DIR/blockchain"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
info()  { printf "\n[INFO]  %s\n" "$*"; }
ok()    { printf "[OK]    %s\n" "$*"; }
warn()  { printf "[WARN]  %s\n" "$*" >&2; }
fail()  { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

# Track background PIDs for cleanup
HARDHAT_PID=""
VITE_PID=""

# -------------------------------------------------------------------
# Cleanup handler
# -------------------------------------------------------------------
cleanup() {
  echo ""
  echo "-------------------------------------------------------------------"
  echo "Shutting down services..."
  echo "-------------------------------------------------------------------"

  if [[ -n "$HARDHAT_PID" ]] && kill -0 "$HARDHAT_PID" 2>/dev/null; then
    echo "Stopping Hardhat node (PID $HARDHAT_PID)..."
    kill "$HARDHAT_PID" 2>/dev/null || true
  fi

  if [[ -n "$VITE_PID" ]] && kill -0 "$VITE_PID" 2>/dev/null; then
    echo "Stopping Vite dev server (PID $VITE_PID)..."
    kill "$VITE_PID" 2>/dev/null || true
  fi

  echo ""
  echo "All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# -------------------------------------------------------------------
# Step 0: Prerequisite checks
# -------------------------------------------------------------------
echo ""
echo "==================================================================="
echo "  AgentSwarmEscrow — Startup Script"
echo "==================================================================="

info "Checking prerequisites..."

# node >= 18
if ! command -v node &>/dev/null; then
  fail "node not found. Install Node.js 18+ from https://nodejs.org/"
fi
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  fail "Node.js 18+ required, found v$NODE_VERSION"
fi
ok "node v$NODE_VERSION"

# python3 >= 3.10
if ! command -v python3 &>/dev/null; then
  fail "python3 not found. Install Python 3.10+ from https://www.python.org/"
fi
PY_VERSION=$(python3 --version 2>&1 | sed 's/Python //')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
if [[ "$PY_MAJOR" -lt 3 ]] || [[ "$PY_MAJOR" -eq 3 && "$PY_MINOR" -lt 10 ]]; then
  fail "Python 3.10+ required, found $PY_VERSION"
fi
ok "python3 $PY_VERSION"

# pip
if ! python3 -m pip --version &>/dev/null; then
  fail "pip not available. Install pip: python3 -m ensurepip --upgrade"
fi
ok "pip available"

# -------------------------------------------------------------------
# Step 1: Hardhat node
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "Starting Hardhat node..."

cd "$BLOCKCHAIN_DIR"

if [[ ! -d node_modules ]]; then
  info "Installing blockchain dependencies (npm install)..."
  npm install
fi

# Start Hardhat node in background
npx hardhat node > "$SCRIPT_DIR/.hardhat.log" 2>&1 &
HARDHAT_PID=$!
ok "Hardhat node started (PID $HARDHAT_PID)"

# Poll until the node is ready
info "Waiting for Hardhat node to be ready..."
END_TIME=$((SECONDS + 30))
while true; do
  if curl -s -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://127.0.0.1:8545 | grep -q '"result"'; then
    break
  fi
  if [[ $SECONDS -ge $END_TIME ]]; then
    fail "Hardhat node did not respond within 30 seconds. Check $SCRIPT_DIR/.hardhat.log"
  fi
  sleep 1
done

ok "Hardhat node running at http://127.0.0.1:8545"

# -------------------------------------------------------------------
# Step 2: Deploy contract
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "Deploying AgentSwarmEscrow contract..."

DEPLOY_OUTPUT=$(npx hardhat ignition deploy ignition/modules/Escrow.js \
  --network localhost 2>&1)
DEPLOY_EXIT=$?

if [[ $DEPLOY_EXIT -ne 0 ]]; then
  fail "Contract deployment failed:\n$DEPLOY_OUTPUT"
fi

# Extract the contract address from Hardhat Ignition output.
# Output format: "AgentSwarmEscrow#AgentSwarmEscrow = 0x..."
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | \
  grep -oP 'AgentSwarmEscrow#AgentSwarmEscrow\s*=\s*\K0x[a-fA-F0-9]+' | \
  head -1)

if [[ -z "$CONTRACT_ADDRESS" ]]; then
  # Fallback: try alternative pattern from newer Hardhat Ignition versions
  CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | \
    grep -oP '0x[a-fA-F0-9]{40}' | \
    grep -v '^0x0000000000000000000000000000000000000000' | \
    head -1)
fi

if [[ -z "$CONTRACT_ADDRESS" ]]; then
  fail "Could not extract contract address from deployment output.\n$DEPLOY_OUTPUT"
fi

ok "Contract deployed at $CONTRACT_ADDRESS"

# -------------------------------------------------------------------
# Step 3: Backend setup
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "Setting up Python backend..."

cd "$BACKEND_DIR"

# Create venv if it doesn't exist
if [[ ! -d venv ]]; then
  info "Creating Python virtual environment..."
  python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
info "Installing Python packages..."
pip install --quiet -r requirements.txt

# Create .env from .env.example if it doesn't exist
if [[ ! -f .env ]]; then
  info "Creating .env from .env.example..."
  cp .env.example .env
fi

# Update CONTRACT_ADDRESS in .env
info "Updating CONTRACT_ADDRESS in backend/.env..."
# Use python to do a reliable line update
python3 - <<'PYEOF'
import os, re

env_path = ".env"
with open(env_path, "r") as f:
    content = f.read()

# Replace or add CONTRACT_ADDRESS
pattern = r'^CONTRACT_ADDRESS=.*$'
replacement = f'CONTRACT_ADDRESS={os.environ["CONTRACT_ADDRESS"]}'
if re.search(pattern, content, re.MULTILINE):
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
else:
    content = content.rstrip()
    if content:
        content += "\n"
    content += replacement + "\n"

with open(env_path, "w") as f:
    f.write(content)

print("CONTRACT_ADDRESS updated in .env")
PYEOF

ok "Backend .env configured"

# -------------------------------------------------------------------
# Step 4: Frontend setup
# -------------------------------------------------------------------
echo ""
echo "-------------------------------------------------------------------"
info "Setting up frontend..."

cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  info "Installing frontend dependencies (npm install)..."
  npm install
fi

# Update the hardcoded CONTRACT_ADDRESS in frontend/src/utils/contracts.js
info "Updating CONTRACT_ADDRESS in frontend/src/utils/contracts.js..."
sed -i.bak "s/^export const CONTRACT_ADDRESS = '[^']*'/export const CONTRACT_ADDRESS = '$CONTRACT_ADDRESS'/" \
  src/utils/contracts.js
rm -f src/utils/contracts.js.bak

# Start Vite dev server in background
npm run dev > "$SCRIPT_DIR/.vite.log" 2>&1 &
VITE_PID=$!
ok "Frontend dev server started (PID $VITE_PID)"

# Poll until the frontend is ready
info "Waiting for frontend to be ready..."
END_TIME=$((SECONDS + 30))
while true; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -qE '200|304'; then
    break
  fi
  if [[ $SECONDS -ge $END_TIME ]]; then
    warn "Frontend did not respond within 30 seconds. Check $SCRIPT_DIR/.vite.log"
    break
  fi
  sleep 1
done

ok "Frontend running at http://localhost:5173"

# -------------------------------------------------------------------
# Step 5: State summary
# -------------------------------------------------------------------
echo ""
echo "==================================================================="
echo "  Status Summary"
echo "==================================================================="
printf "| %-20s | %-35s | %-8s |\n" "Service" "URL / Address" "Status"
echo "|----------------------|-------------------------------------|----------|"
printf "| %-20s | %-35s | %-8s |\n" "Hardhat Node" "http://127.0.0.1:8545" "Running"
printf "| %-20s | %-35s | %-8s |\n" "Contract" "$CONTRACT_ADDRESS" "Deployed"
printf "| %-20s | %-35s | %-8s |\n" "Frontend" "http://localhost:5173" "Running"
printf "| %-20s | %-35s | %-8s |\n" "Manager Agent" "cd backend && python manager_agent.py" "Ready"
printf "| %-20s | %-35s | %-8s |\n" "Worker Agent" "cd backend && python launcher.py N" "Ready"
echo "==================================================================="

echo ""
echo "==================================================================="
echo "  Everything is running!"
echo "==================================================================="
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Click 'Dev Wallet' → pick Account #0"
echo "  3. In a new terminal: cd backend && source venv/bin/activate && python manager_agent.py"
echo "  4. In another terminal: cd backend && source venv/bin/activate && python launcher.py 3"
echo ""
echo "To stop everything: Ctrl+C"
echo "==================================================================="

# Keep the script alive so the trap can respond to signals
wait