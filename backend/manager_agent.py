#!/usr/bin/env python3
"""
Manager Agent — Autonomous M2M Agentic Swarm Escrow Protocol

CLI tool that:
1. Accepts a human goal via stdin
2. Decomposes it into sub-tasks using local mock logic
3. Posts each sub-task to the escrow contract
4. Monitors for TaskSubmitted events and calls approveAndPay()
"""

import json
import os
import time
import sys
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

# ---------------------------------------------------------------------------
# Contract ABI — mirrors AgentSwarmEscrow.sol (Chunk 1)
# ---------------------------------------------------------------------------
CONTRACT_ABI = [
    {
        "type": "function",
        "name": "postTask",
        "inputs": [{"name": "_metadataURI", "type": "string"}],
        "outputs": [],
        "stateMutability": "payable",
    },
    {
        "type": "function",
        "name": "claimTask",
        "inputs": [{"name": "_taskId", "type": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "submitResult",
        "inputs": [
            {"name": "_taskId", "type": "uint256"},
            {"name": "_resultURI", "type": "string"},
        ],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "approveAndPay",
        "inputs": [{"name": "_taskId", "type": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "raiseDispute",
        "inputs": [{"name": "_taskId", "type": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "taskCounter",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "tasks",
        "inputs": [{"name": "", "type": "uint256"}],
        "outputs": [
            {"name": "taskId", "type": "uint256"},
            {"name": "managerAgent", "type": "address"},
            {"name": "workerAgent", "type": "address"},
            {"name": "taskMetadataURI", "type": "string"},
            {"name": "resultURI", "type": "string"},
            {"name": "reward", "type": "uint256"},
            {
                "name": "status",
                "type": "uint8",
            },
        ],
        "stateMutability": "view",
    },
    # Events
    {
        "type": "event",
        "anonymous": False,
        "name": "TaskPosted",
        "inputs": [
            {"name": "taskId", "type": "uint256", "indexed": True},
            {"name": "manager", "type": "address", "indexed": True},
            {"name": "reward", "type": "uint256", "indexed": False},
            {"name": "metadataURI", "type": "string", "indexed": False},
        ],
    },
    {
        "type": "event",
        "anonymous": False,
        "name": "TaskClaimed",
        "inputs": [
            {"name": "taskId", "type": "uint256", "indexed": True},
            {"name": "worker", "type": "address", "indexed": True},
        ],
    },
    {
        "type": "event",
        "anonymous": False,
        "name": "TaskSubmitted",
        "inputs": [
            {"name": "taskId", "type": "uint256", "indexed": True},
            {"name": "resultURI", "type": "string", "indexed": False},
        ],
    },
    {
        "type": "event",
        "anonymous": False,
        "name": "TaskApproved",
        "inputs": [
            {"name": "taskId", "type": "uint256", "indexed": True},
            {"name": "worker", "type": "address", "indexed": True},
            {"name": "reward", "type": "uint256", "indexed": False},
        ],
    },
    {
        "type": "event",
        "anonymous": False,
        "name": "TaskDisputed",
        "inputs": [
            {"name": "taskId", "type": "uint256", "indexed": True},
            {"name": "disputer", "type": "address", "indexed": True},
        ],
    },
]

# ---------------------------------------------------------------------------
# Task decomposition — local mock generator (no external APIs)
# ---------------------------------------------------------------------------

# Keywords that trigger specific task templates
TASK_TEMPLATES = {
    ("weather", "forecast", "temperature", "meteorological"): [
        {
            "task": "Write a Python scraper to fetch weather data from public APIs",
            "bounty_eth": 0.05,
        },
        {"task": "Build an ML forecast model using the scraped weather data", "bounty_eth": 0.05},
    ],
    ("image", "photo", "picture", "classify", "detect"): [
        {
            "task": "Set up image dataset pipeline and preprocessing pipeline",
            "bounty_eth": 0.05,
        },
        {
            "task": "Train and evaluate a computer vision model for the dataset",
            "bounty_eth": 0.05,
        },
    ],
    ("data", "analytics", "dashboard", "report", "sql"): [
        {
            "task": "Design and implement data pipelines and ETL process",
            "bounty_eth": 0.05,
        },
        {
            "task": "Build analytics dashboard with visualizations and reports",
            "bounty_eth": 0.05,
        },
    ],
    ("web", "app", "api", "backend", "frontend"): [
        {
            "task": "Design and implement the backend API and database schema",
            "bounty_eth": 0.05,
        },
        {"task": "Build the frontend UI and integrate with the backend API", "bounty_eth": 0.05},
    ],
    ("ml", "machine learning", "model", "train"): [
        {
            "task": "Collect, clean, and preprocess the training dataset",
            "bounty_eth": 0.05,
        },
        {"task": "Train, validate, and tune the ML model for production use", "bounty_eth": 0.05},
    ],
}


def decompose_goal(goal: str) -> list[dict]:
    """
    Decompose a human goal into sub-tasks using keyword matching and string templating.
    Returns a list of dicts with 'task' and 'bounty_eth' keys.
    Falls back to generic decomposition if no keyword matches.
    """
    goal_lower = goal.lower()

    for keywords, tasks in TASK_TEMPLATES.items():
        if any(kw in goal_lower for kw in keywords):
            print(f"[Manager] Recognized goal category: {keywords}")
            return json.loads(json.dumps(tasks))  # deep copy

    # Generic fallback — split the goal into two conceptual phases
    words = goal.split()
    core = " ".join(words[:4]) if len(words) > 4 else goal
    return [
        {
            "task": f"Phase 1: Research and plan for '{core}'",
            "bounty_eth": 0.05,
        },
        {
            "task": f"Phase 2: Implement and deliver '{core}'",
            "bounty_eth": 0.05,
        },
    ]


# ---------------------------------------------------------------------------
# Status helpers
# ---------------------------------------------------------------------------

STATUS_NAMES = {0: "Open", 1: "Claimed", 2: "Submitted", 3: "Verified", 4: "Disputed"}


def status_name(n: int) -> str:
    return STATUS_NAMES.get(n, f"Unknown({n})")


def print_banner():
    print("=" * 60)
    print("  Manager Agent — Autonomous M2M Escrow Protocol")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print_banner()

    # Load environment
    backend_dir = Path(__file__).parent
    env_path = backend_dir / ".env"
    if not env_path.exists():
        print(f"[ERROR] .env not found at {env_path}")
        print("        Copy .env.example to .env and fill in your values.")
        sys.exit(1)

    load_dotenv(env_path)

    private_key = os.environ.get("MANAGER_PRIVATE_KEY")
    rpc_url = os.environ.get("RPC_URL", "http://127.0.0.1:8545")
    contract_address = os.environ.get("CONTRACT_ADDRESS")

    if not private_key:
        print("[ERROR] MANAGER_PRIVATE_KEY not set in .env")
        sys.exit(1)
    if not contract_address:
        print("[ERROR] CONTRACT_ADDRESS not set in .env")
        sys.exit(1)

    # Connect to node
    print(f"\n[Manager] Connecting to {rpc_url} ...")
    w3 = Web3(Web3.HTTPProvider(rpc_url))

    if not w3.is_connected():
        print("[ERROR] Could not connect to blockchain node.")
        print("        Is `npx hardhat node` running?")
        sys.exit(1)

    print(f"[Manager] Connected — block: {w3.eth.block_number}")
    account = w3.eth.account.from_key(private_key)
    print(f"[Manager] Manager address: {account.address}")

    # Contract instance
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=CONTRACT_ABI,
    )

    # -------------------------------------------------------------------------
    # Step 1: Get goal from user
    # -------------------------------------------------------------------------
    print()
    print("-" * 60)
    print("  Enter a complex goal for the swarm to decompose and execute.")
    print("  Examples:")
    print("    - 'Build a weather forecast engine'")
    print("    - 'Train an image classifier on custom photos'")
    print("    - 'Create a web analytics dashboard'")
    print("-" * 60)

    try:
        goal = input("\n>>> Your goal: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n[Manager] Aborted by user.")
        sys.exit(0)

    if not goal:
        print("[ERROR] Goal cannot be empty.")
        sys.exit(1)

    # -------------------------------------------------------------------------
    # Step 2: Decompose into sub-tasks
    # -------------------------------------------------------------------------
    print(f"\n[Manager] Decomposing goal: '{goal}'")
    sub_tasks = decompose_goal(goal)
    print(f"[Manager] Generated {len(sub_tasks)} sub-task(s):")

    for i, st in enumerate(sub_tasks, 1):
        print(f"  [{i}] {st['task']}  |  bounty: {st['bounty_eth']} ETH")

    # -------------------------------------------------------------------------
    # Step 3: Post each sub-task to the contract
    # -------------------------------------------------------------------------
    print("\n[Manager] Posting sub-tasks to the escrow contract ...")
    print("-" * 40)

    posted_task_ids = []
    for st in sub_tasks:
        metadata_uri = f"mock://task/{st['task'].replace(' ', '-').lower()}"
        bounty_wei = w3.to_wei(st["bounty_eth"], "ether")

        print(f"[Manager] Posting: {st['task']}")
        print(f"         Bounty:  {st['bounty_eth']} ETH  ({bounty_wei} wei)")
        print(f"         URI:     {metadata_uri}")

        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        chain_id = w3.eth.chain_id

        tx_params = {
            "from": account.address,
            "value": bounty_wei,
            "nonce": nonce,
            "chainId": chain_id,
            "gas": 200_000,
            "gasPrice": w3.eth.gas_price,
        }

        tx = contract.functions.postTask(metadata_uri).build_transaction(tx_params)
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        if receipt.status == 1:
            # Extract taskId from TaskPosted event
            logs = contract.events.TaskPosted().process_receipt(receipt)
            if logs:
                task_id = logs[0].args.taskId
            else:
                # Fallback: query taskCounter after a short wait
                task_id = contract.functions.taskCounter().call() - 1

            print(f"[Manager] TX confirmed: {tx_hash.hex()}")
            print(f"[Manager] Task #{task_id} posted successfully!")
            posted_task_ids.append(int(task_id))
        else:
            print(f"[ERROR] TX reverted: {tx_hash.hex()}")
            print("        Check the contract deployment and RPC connection.")

        print()

    if not posted_task_ids:
        print("[Manager] No tasks were posted. Exiting.")
        sys.exit(1)

    print(f"[Manager] All {len(posted_task_ids)} task(s) posted successfully.")
    print(f"[Manager] Task IDs: {posted_task_ids}")

    # -------------------------------------------------------------------------
    # Step 4: Monitor for TaskSubmitted and call approveAndPay
    # -------------------------------------------------------------------------
    print("\n[Manager] Entering monitoring loop — listening for TaskSubmitted events ...")
    print("[Manager] Press Ctrl+C to exit.\n")

    # Track which tasks have already been approved
    approved_task_ids: set[int] = set()
    monitored_task_ids: set[int] = set(posted_task_ids)

    try:
        while True:
            # Check all tasks posted by this manager
            for task_id in list(monitored_task_ids):
                if task_id in approved_task_ids:
                    continue

                try:
                    task = contract.functions.tasks(task_id).call()
                    current_status = task[6]  # status field
                    manager_addr = task[1]

                    # Only act on tasks this manager owns
                    if manager_addr.lower() != account.address.lower():
                        continue

                    status_str = status_name(current_status)

                    if current_status == 2:  # Submitted
                        print(f"[Manager] Task #{task_id} status: {status_str}")
                        print(f"[Manager] Approving and paying for task #{task_id} ...")

                        nonce = w3.eth.get_transaction_count(account.address)
                        chain_id = w3.eth.chain_id

                        tx_params = {
                            "from": account.address,
                            "nonce": nonce,
                            "chainId": chain_id,
                            "gas": 200_000,
                            "gasPrice": w3.eth.gas_price,
                        }

                        tx = contract.functions.approveAndPay(task_id).build_transaction(tx_params)
                        signed = account.sign_transaction(tx)
                        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

                        if receipt.status == 1:
                            print(f"[Manager] TX confirmed: {tx_hash.hex()}")
                            print(f"[Manager] Task #{task_id} approved and paid successfully!")
                            approved_task_ids.add(task_id)
                            monitored_task_ids.discard(task_id)
                        else:
                            print(f"[ERROR] Approve TX reverted for task #{task_id}")
                            print("        Task may already be approved or disputed.")

                    elif current_status in (0, 1):  # Open or Claimed
                        # Worker still working — do nothing
                        pass

                except Exception as exc:
                    print(f"[WARN] Error checking task #{task_id}: {exc}")

            # All tasks approved — done
            if not monitored_task_ids - approved_task_ids:
                print("[Manager] All posted tasks have been approved.")
                print("[Manager] Manager workflow complete.")
                break

            time.sleep(5)

    except KeyboardInterrupt:
        print("\n[Manager] Monitoring loop interrupted. Exiting gracefully.")


if __name__ == "__main__":
    main()