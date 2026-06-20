# 🐝 Autonomous M2M Agentic Swarm Escrow Protocol

## Project Overview

> **One-Line Pitch:** A local PoC where AI Manager Agents decompose human goals into on-chain escrow tasks, and Python Worker Agents claim and execute them trustlessly — all governed by a Solidity smart contract on a local Hardhat EVM.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HUMAN LAYER                                     │
│                                                                              │
│    You (the human) submits a complex goal prompt                            │
│    Example: "Research three L2 scaling solutions and summarize them"        │
│                                       │                                       │
│                                       ▼                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                          MANAGER AGENT LAYER                                 │
│                                                                              │
│    Python Manager Agent                                                     │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │  • Receives goal from human                                     │     │
│    │  • Decomposes goal into 2 atomic sub-tasks                      │     │
│    │  • Posts each sub-task to the blockchain (with ETH escrow)      │     │
│    │  • Monitors TaskSubmitted events                                │     │
│    │  • Calls approveAndPay() to release funds to workers            │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                       │                                       │
│                    ┌──────────────────┴──────────────────┐                   │
│                    │         HARDHAT EVM ESCROW          │                   │
│                    │  ┌────────────────────────────────┐ │                   │
│                    │  │  Smart Contract:                │ │                   │
│                    │  │  • Locks ETH when task posted   │ │                   │
│                    │  │  • Tracks task state on-chain   │ │                   │
│                    │  │  • Releases ETH on approval     │ │                   │
│                    │  │  • Emits events for agents      │ │                   │
│                    │  └────────────────────────────────┘ │                   │
│                    └──────────────────┬──────────────────┘                   │
│                                       │                                       │
│                                       ▼                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                           WORKER AGENT LAYER                                 │
│                                                                              │
│    Python Worker Agent (continuously polling)                                │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │  • Listens for TaskPosted events                                │     │
│    │  • Claims unclaimed tasks                                       │     │
│    │  • Simulates "thinking" (3 second delay)                        │     │
│    │  • Generates mock result (e.g., research output)                │     │
│    │  • Submits result hash to the blockchain                        │     │
│    │  • Receives ETH when manager approves                           │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                       │                                       │
│                                       ▼                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                         FRONTEND DASHBOARD LAYER                             │
│                                                                              │
│    React + Vite + Tailwind Web App                                          │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │  • Connect MetaMask wallet                                      │     │
│    │  • View all tasks in real-time (live polling)                   │     │
│    │  • See swarm topology animation                                 │     │
│    │  • Trigger new task deployments via Manager Agent               │     │
│    │  • Monitor task status changes live                             │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

Before you begin, make sure you have the following installed on your machine:

| Requirement | Version | Check Command | Purpose |
|-------------|---------|---------------|---------|
| **Node.js** | 18+ | `node --version` | Hardhat, React, npm |
| **Python** | 3.10+ | `python3 --version` | Manager & Worker agents |
| **MetaMask** | Latest | Browser extension | Web3 wallet connection |
| **Git** | Any recent | `git --version` | Clone repo (if needed) |

---

## 🚀 Step-by-Step Setup

Follow these steps **in order**. Do not skip any step.

### Step 1: Navigate to the Repository

If you haven't cloned the repo yet, do so now:

```bash
git clone <repo-url>
cd agent-swarm-escrow
```

If you already have the repo:

```bash
cd agent-swarm-escrow
```

---

### Step 2: Install Blockchain Dependencies

Go into the `blockchain` directory and install the required npm packages:

```bash
cd blockchain
npm install
```

This installs:
- `hardhat` — Ethereum development environment
- `@nomicfoundation/hardhat-ignition` — Deployment framework
- `hardhat-viem` — TypeScript types for Viem (not used directly but part of stack)

---

### Step 3: Start the Hardhat Node

In a **new terminal window**, start the local Hardhat node:

```bash
cd blockchain
npx hardhat node
```

**What you'll see:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Local chain
...

Chain ID: 31337

Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
(2) 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH)
...


Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

> ⚠️ **Keep this terminal open!** The Hardhat node must stay running throughout the entire demo.

---

### Step 4: Deploy the Smart Contract

In a **second terminal window**, deploy the escrow contract to the local Hardhat node:

```bash
cd blockchain
npx hardhat ignition deploy ignition/modules/Escrow.js --network localhost
```

**Expected output:**
```
Deploying [ 'AgentSwarmEscrow' ]

Transaction hash: 0x8a5c...
Successfully deployed!

Deployed Addresses
AgentSwarmEscrow#AgentSwarmEscrow = 0x5fbdb463e3ab16e4576754bfe9ab30d2d3f5e...
```

---

### Step 5: Copy the Deployed Contract Address

**Copy the contract address** from the deployment output. It will look something like:

```
0x5fbdb463e3ab16e4576754bfe9ab30d2d3f5e4cf
```

**You will need this address for:**
- The `.env` file in the backend
- The frontend (to read the contract)

---

### Step 6: Set Up the Python Backend

Now set up the Python virtual environment and install dependencies:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**What gets installed:**
- `web3>=6.0.0` — Python Web3 library for interacting with Ethereum
- `python-dotenv>=1.0.0` — Environment variable management

---

### Step 7: Configure the Backend Environment

Copy the example environment file and fill in the values:

```bash
cd backend
cp .env.example .env
```

Open `.env` in your text editor and set the following:

```env
# The contract address from Step 5
CONTRACT_ADDRESS=0x5fbdb463e3ab16e4576754bfe9ab30d2d3f5e4cf

# RPC URL for Hardhat local node
RPC_URL=http://127.0.0.1:8545

# Manager's private key (Account #0 from Step 3)
# Starts with 0xac09...
MANAGER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Worker's private key (Account #1 from Step 3)
# Starts with 0x59c6...
WORKER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

---

### Step 8: Install the Frontend Dependencies

Open a **third terminal window** and install frontend dependencies:

```bash
cd frontend
npm install
```

This installs:
- `react` & `react-dom` — UI framework
- `vite` — Build tool
- `tailwindcss` — CSS styling
- `ethers@^6.11.0` — Ethereum JavaScript library
- `lucide-react` — Icon library

---

### Step 9: Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173** in your browser. You should see the dashboard with:
- Navbar with "Connect Wallet" button
- Task creation modal
- Active ledger grid (currently empty)
- Swarm visualizer animation

---

### Step 10: Run the Manager Agent

The Manager Agent decomposes goals into sub-tasks and posts them to the blockchain. Run it in a **fourth terminal window**:

```bash
cd backend
source venv/bin/activate
python manager_agent.py
```

**Expected output:**
```
[*] Manager Agent Started
[*] Connected to contract at: 0x5fbdb463e3ab16e4576754bfe9ab30d2d3f5e4cf
[*] Manager wallet: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
[*] Manager balance: 10000.0 GO-ETH
[*] Posting task 1: Research Ethereum L2 scaling solutions
[*] Task 1 posted with ID: 0, value: 0.05 ETH
[*] Posting task 2: Compare Optimistic vs ZK Rollups
[*] Task 2 posted with ID: 1, value: 0.05 ETH
[*] All tasks posted. Monitoring for submissions...
```

---

### Step 11: Run the Worker Agent

The Worker Agent continuously polls for new tasks, claims them, executes them, and submits results. Run it in a **fifth terminal window**:

```bash
cd backend
source venv/bin/activate
python worker_agent.py
```

**Expected output:**
```
[*] Worker Agent Started
[*] Connected to contract at: 0x5fbdb463e3ab16e4576754bfe9ab30d2d3f5e4cf
[*] Worker wallet: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[*] Worker balance: 10000.0 GO-ETH
[*] Polling for TaskPosted events...
[*] New task detected: ID=0, TaskType='Research Ethereum L2 scaling solutions'
[*] Claiming task ID=0...
[*] Task ID=0 claimed!
[*] Processing task ID=0...
[*] Generating result for task ID=0...
[*] Submitting result for task ID=0...
[*] Result submitted for task ID=0!
[*] New task detected: ID=1, TaskType='Compare Optimistic vs ZK Rollups'
[*] Claiming task ID=1...
[*] Task ID=1 claimed!
[*] Processing task ID=1...
[*] Generating result for task ID=1...
[*] Submitting result for task ID=1...
[*] Result submitted for task ID=1!
```

---

## 🛠️ THE ABSOLUTE BEGINNER'S GUIDE TO SETTING UP METAMASK FOR THIS REPO

> [!IMPORTANT]
> If you've never used MetaMask or never connected to a local blockchain, this section is for you. Follow every step exactly.

---

### 🔧 What is MetaMask?

**MetaMask** is a browser extension that acts as your Web3 wallet. It stores your Ethereum private keys and allows websites to interact with the blockchain.

For this project, we need MetaMask to:
1. **Connect** to our local Hardhat blockchain
2. **Sign transactions** when the Manager posts tasks
3. **See** the ETH balances of our accounts
4. **Approve** transactions on the frontend dashboard

---

### 📥 Step 1: Download MetaMask

**For Chrome or Brave browser:**

1. Go to **https://metamask.io** or search "MetaMask download"
2. Click the **Download** button
3. Click **Install MetaMask for Chrome**
4. You'll be redirected to the Chrome Web Store
5. Click **Add to Chrome**
6. Click **Add Extension** in the popup
7. MetaMask icon appears in your browser toolbar (puzzle piece icon)

**For Firefox:**

1. Go to **https://metamask.io**
2. Click **Download**
3. Click **Install MetaMask for Firefox**
4. Click **Add to Firefox** in the Mozilla Add-ons page
5. MetaMask icon appears in your browser toolbar

---

### ⚙️ Step 2: Turn on "Show Test Networks"

By default, MetaMask only shows Ethereum Mainnet and a few major testnets. We need to enable **Show Test Networks** to see our local Hardhat blockchain.

**Here's exactly how to do it:**

1. **Click the MetaMask icon** in your browser toolbar
2. **Click the Account icon** (circle with 3 dots or your account name) in the top-right
3. **Click Settings** (gear icon)
4. **Scroll down to Advanced** settings
5. **Find "Show test networks"** — it's near the bottom
6. **Toggle it ON** (turn it blue/green)

> [!NOTE]
> When the toggle is ON, you'll see networks like Sepolia, Goerli, and our custom "Hardhat Localhost" network appear in the network dropdown.

---

### 🌐 Step 3: Add a Custom Network (Hardhat Localhost)

Now we add our local Hardhat node as a custom network.

**Here's exactly how to do it:**

1. **Click the MetaMask icon** to open the wallet
2. **Click the network dropdown** at the top (it probably says "Ethereum Mainnet" or "Mainnet")
3. **Scroll to the bottom** and click **Add network** or **Add custom network**
4. **Click "Add a network manually"** or **"Add custom network"**
5. **Fill in these exact values:**

| Field | Value to Enter |
|-------|----------------|
| **Network Name** | `Hardhat Localhost` |
| **RPC URL** | `http://127.0.0.1:8545` |
| **Chain ID** | `31337` |
| **Currency Symbol** | `GO-ETH` |
| **Block explorer URL** | (leave blank — we don't need it for local) |

6. **Click Save**

> [!NOTE]
> The Chain ID `31337` is the default Chain ID for Hardhat's local test network. If you use any other number, MetaMask won't be able to connect properly.

---

### 🔑 Step 4: Get Private Keys from Hardhat Terminal

When you ran `npx hardhat node` in Step 3, the terminal printed **20 accounts** with their private keys. We need the first two:

1. **Look back at your Hardhat terminal window**
2. **Find the section labeled "Private Keys"**
3. **Copy the key for Account #(0)** — it starts with `0xac0974...` and is VERY long
4. **Copy the key for Account #(1)** — it starts with `0x59c699...`

> [!WARNING]
> These are **test** private keys from a local blockchain. They are NOT real money. However, never share real private keys from real wallets! The rule: **If it's not from a testnet, don't share it.**

---

### 📥 Step 5: Import Accounts into MetaMask

Now we import both accounts into MetaMask so we can use them.

**Import Account #0 (Manager):**

1. **Click the MetaMask icon**
2. **Click the account icon** (top-right circle)
3. **Click "Import Account"**
4. **Paste the private key for Account #0** (starts with `0xac0974...`)
5. **Click Import**
6. **Click the account name** to rename it
7. **Name it "Manager"** and press Enter

**Import Account #1 (Worker):**

1. **Click the account icon again**
2. **Click "Add account or hardware wallet"**
3. **Click "Import Account"**
4. **Paste the private key for Account #1** (starts with `0x59c699...`)
5. **Click Import**
6. **Rename it "Worker"**

> [!TIP]
> After importing, you should see **10000 ETH** in each account. This is fake ETH from Hardhat that we use for the demo. You can switch between accounts by clicking the account icon.

---

## 🎯 How to Run the Full Demo

Once all services are running, here's the complete workflow:

### Terminal Setup Summary

| Terminal | Component | Command |
|----------|-----------|---------|
| **#1** | Hardhat Node | `cd blockchain && npx hardhat node` |
| **#2** | Contract Deploy | `cd blockchain && npx hardhat ignition deploy ignition/modules/Escrow.js --network localhost` |
| **#3** | Frontend | `cd frontend && npm run dev` |
| **#4** | Manager Agent | `cd backend && source venv/bin/activate && python manager_agent.py` |
| **#5** | Worker Agent | `cd backend && source venv/bin/activate && python worker_agent.py` |

### The Demo Workflow

1. **Start all 5 terminals** in the order listed above (Hardhat first, then deploy, then frontend, then agents).

2. **Open your browser** to `http://localhost:5173`.

3. **Click "Connect Wallet"** in the top-right corner of the frontend.

4. **Select "Manager"** account from MetaMask when prompted.

5. **Click "Create Task"** button in the dashboard.

6. **Select a sample prompt** from the dropdown or type your own goal.

7. **Click "Deploy Tasks"** — this triggers the Manager Agent to post tasks on-chain.

8. **Watch the magic happen:**
   - The Manager Agent posts 2 tasks (visible in the terminal)
   - The Worker Agent detects them, claims them, and processes them
   - The task cards in the frontend update their status in real-time
   - The swarm visualizer animates showing Manager → Contract → Worker flow

9. **Check the final state:**
   - Both tasks should show **"Completed"** status
   - The Worker account in MetaMask should have received GO-ETH
   - You can click each task card to see the result hash

> [!SUCCESS]
> Congratulations! You just ran a fully autonomous M2M agent swarm where AI agents coordinate through a trustless blockchain escrow system.

---

## 🔧 Troubleshooting

### ❌ MetaMask Not Connecting to Local Node

**Problem:** MetaMask says "Connection refused" or "Failed to fetch".

**Solutions:**
1. Make sure Hardhat node is running (Terminal #1)
2. Verify you're using `http://127.0.0.1:8545` not `https://`
3. Try switching to `http://localhost:8545` in the network settings
4. Refresh the page and try reconnecting MetaMask

---

### ❌ Contract Not Found / Contract Not Deployed

**Problem:** "Contract not found at address" error.

**Solutions:**
1. Make sure you ran the deployment command (Step 4)
2. Check that the contract address in `.env` matches the deployed address
3. Restart the Hardhat node and redeploy if needed:
   ```bash
   cd blockchain
   npx hardhat ignition deploy ignition/modules/Escrow.js --network localhost --reset
   ```
4. Update the `CONTRACT_ADDRESS` in your `.env` file with the new address

---

### ❌ Python web3 Version Mismatch

**Problem:** Python errors like `AttributeError: module 'web3' has no attribute 'Web3'`.

**Solutions:**
1. Uninstall and reinstall web3:
   ```bash
   pip uninstall web3
   pip install web3==6.11.0
   ```
2. Make sure you're in the virtual environment:
   ```bash
   source venv/bin/activate
   pip list | grep web3
   ```

---

### ❌ Out of ETH / Insufficient Funds

**Problem:** "insufficient funds for gas" error.

**Solutions:**
1. Both accounts start with 10,000 GO-ETH — you likely have plenty
2. Check the Manager account balance in MetaMask
3. If you redeploy, you need to update `.env` with the new contract address
4. Restart the Hardhat node resets balances to 10,000 ETH each

---

### ❌ Frontend Not Loading / Blank Page

**Problem:** `http://localhost:5173` shows a blank page or error.

**Solutions:**
1. Check the terminal running `npm run dev` for errors
2. Try a hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Check that all frontend dependencies installed without errors
4. Try `cd frontend && rm -rf node_modules && npm install`

---

### ❌ Worker Agent Not Detecting Tasks

**Problem:** Worker terminal says "Polling..." but never detects tasks.

**Solutions:**
1. Make sure Manager Agent ran first and posted tasks
2. Check that the contract address in `.env` is correct for both agents
3. Verify the Manager Agent terminal shows "Task posted with ID: X"
4. The worker needs about 5-15 seconds to detect new events (it polls every 5 seconds)

---

## 📁 Project Structure

```
agent-swarm-escrow/
├── blockchain/                     # Ethereum smart contract layer
│   ├── contracts/
│   │   └── AgentSwarmEscrow.sol   # Solidity escrow smart contract
│   ├── hardhat.config.js          # Hardhat configuration
│   ├── ignition/
│   │   └── modules/
│   │       └── Escrow.js          # Deployment module
│   └── package.json
│
├── backend/                        # Python agent layer
│   ├── manager_agent.py           # Goal decomposition & task posting
│   ├── worker_agent.py            # Task polling & execution
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example              # Environment template
│   └── venv/                      # Python virtual environment (created by you)
│
└── frontend/                       # React dashboard layer
    ├── src/
    │   ├── App.jsx               # Main React application
    │   ├── components/
    │   │   ├── Navbar.jsx        # Wallet connection & network badge
    │   │   ├── TaskCreationModal.jsx  # Task deployment interface
    │   │   ├── ActiveLedgerGrid.jsx   # Real-time task monitoring
    │   │   └── SwarmVisualizer.jsx    # Animated topology visualizer
    │   └── utils/
    │       └── contracts.js      # ABI & contract interaction helpers
    ├── package.json
    └── index.html
```

---

## 🔗 Contract Functions Reference

| Function | Description | Who Calls It |
|----------|-------------|--------------|
| `postTask(metadataURI)` | Posts a new task and locks ETH in escrow | Manager Agent |
| `claimTask(taskId)` | Worker claims an unclaimed task | Worker Agent |
| `submitResult(taskId, resultURI)` | Worker submits execution result | Worker Agent |
| `approveAndPay(taskId)` | Manager approves result and releases payment | Manager Agent |
| `raiseDispute(taskId, reason)` | Either party raises a dispute | Manager or Worker |

---

## 💡 Key Insights

> [!SUCCESS]
> **You just ran a fully autonomous M2M swarm!** The system demonstrates:
> - **Trustless coordination**: No single party controls the outcome
> - **On-chain state**: All task state is verifiable on the blockchain
> - **Event-driven architecture**: Agents communicate through Solidity events
> - **Atomic payments**: ETH only moves when the Manager approves

---

*Built with ❤️ for the autonomous AI agent economy*