#!/usr/bin/env python3
"""
Worker Agent — Autonomous M2M Agentic Swarm Escrow Protocol

Continuous loop that:
1. Polls for new TaskPosted events on the escrow contract
2. Claims open tasks via claimTask()
3. Simulates AI processing (3s sleep + mock result)
4. Submits the result via submitResult()
"""

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
            {"name": "status", "type": "uint8"},
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
# Status helpers
# ---------------------------------------------------------------------------

STATUS_NAMES = {0: "Open", 1: "Claimed", 2: "Submitted", 3: "Verified", 4: "Disputed"}


def status_name(n: int) -> str:
    return STATUS_NAMES.get(n, f"Unknown({n})")


def print_banner():
    print("=" * 60)
    print("  Worker Agent — Autonomous M2M Escrow Protocol")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Task processing — local mock (no external APIs)
# ---------------------------------------------------------------------------

def generate_mock_result(task_id: int, metadata_uri: str) -> str:
    """
    Generate a deterministic mock result URI for a completed task.
    In production this would be a real computation result stored on IPFS,
    Arweave, or a similar decentralized storage layer.
    """
    return f"mock://result/task-{task_id}-completed-at-{int(time.time())}"


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

    private_key = os.environ.get("WORKER_PRIVATE_KEY")

    # Network selection: use Sepolia if NETWORK=sepolia, otherwise default to local
    network_mode = os.environ.get("NETWORK", "local").lower()
    if network_mode == "sepolia":
        rpc_url = os.environ.get("SEPOLIA_RPC_URL")
        contract_address = os.environ.get("SEPOLIA_CONTRACT_ADDRESS")
        if not rpc_url:
            print("[ERROR] NETWORK=sepolia but SEPOLIA_RPC_URL not set in .env")
            sys.exit(1)
        if not contract_address:
            print("[ERROR] NETWORK=sepolia but SEPOLIA_CONTRACT_ADDRESS not set in .env")
            sys.exit(1)
        print(f"[Worker] Using Sepolia testnet")
    else:
        rpc_url = os.environ.get("RPC_URL", "http://127.0.0.1:8545")
        contract_address = os.environ.get("CONTRACT_ADDRESS")

    if not private_key:
        print("[ERROR] WORKER_PRIVATE_KEY not set in .env")
        sys.exit(1)
    if not contract_address:
        print("[ERROR] CONTRACT_ADDRESS not set in .env")
        sys.exit(1)

    # Connect to node
    print(f"\n[Worker] Connecting to {rpc_url} ...")
    w3 = Web3(Web3.HTTPProvider(rpc_url))

    if not w3.is_connected():
        print("[ERROR] Could not connect to blockchain node.")
        print("        Is `npx hardhat node` running?")
        sys.exit(1)

    print(f"[Worker] Connected — block: {w3.eth.block_number}")
    account = w3.eth.account.from_key(private_key)
    print(f"[Worker] Worker address: {account.address}")

    # Contract instance
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=CONTRACT_ABI,
    )

    print()
    print("[Worker] Entering event polling loop ...")
    print("[Worker] Press Ctrl+C to exit gracefully.\n")

    # Track the last block we checked to avoid re-processing
    last_checked_block = w3.eth.block_number

    # Track task IDs we have already claimed (avoid double-claim on restart)
    claimed_task_ids: set[int] = set()

    try:
        while True:
            try:
                # Check for TaskPosted events since last checked block
                current_block = w3.eth.block_number

                events = contract.events.TaskPosted().get_logs(
                    from_block=last_checked_block,
                    to_block=current_block,
                )

                if not events:
                    # No new events — sleep and poll again
                    time.sleep(5)
                    last_checked_block = current_block
                    continue

                for event in events:
                    task_id = int(event.args.taskId)
                    manager = event.args.manager
                    reward_wei = event.args.reward
                    metadata_uri = event.args.metadataURI
                    reward_eth = w3.from_wei(reward_wei, "ether")

                    print("-" * 40)
                    print(f"[Worker] New task detected!")
                    print(f"         Task ID:     #{task_id}")
                    print(f"         Manager:    {manager}")
                    print(f"         Reward:     {reward_eth} ETH")
                    print(f"         Metadata:   {metadata_uri}")

                    # Check current task status
                    try:
                        task = contract.functions.tasks(task_id).call()
                        current_status = task[6]  # status field

                        if current_status != 0:
                            # Not Open — skip (already claimed or finalized)
                            print(f"[Worker] Task #{task_id} is {status_name(current_status)} — skipping.")
                            continue

                        if task_id in claimed_task_ids:
                            print(f"[Worker] Task #{task_id} already claimed in this session — skipping.")
                            continue

                        # -----------------------------------------------------------------
                        # Step 1: Claim the task
                        # -----------------------------------------------------------------
                        print(f"[Worker] Claiming task #{task_id} ...")

                        nonce = w3.eth.get_transaction_count(account.address)
                        chain_id = w3.eth.chain_id

                        tx_params = {
                            "from": account.address,
                            "nonce": nonce,
                            "chainId": chain_id,
                            "gas": 200_000,
                            "gasPrice": w3.eth.gas_price,
                        }

                        tx = contract.functions.claimTask(task_id).build_transaction(tx_params)
                        signed = account.sign_transaction(tx)
                        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

                        if receipt.status == 1:
                            print(f"[Worker] Claim TX confirmed: {tx_hash.hex()}")
                            claimed_task_ids.add(task_id)
                        else:
                            print(f"[ERROR] Claim TX reverted for task #{task_id}")
                            continue

                        # -----------------------------------------------------------------
                        # Step 2: AI thinking simulation (3 seconds)
                        # -----------------------------------------------------------------
                        print(f"[Worker] AI thinking...")
                        for dots in range(1, 4):
                            time.sleep(1)
                            print(f"           {'.' * dots}{' ' * (3 - dots)}")

                        # -----------------------------------------------------------------
                        # Step 3: Generate mock result and submit
                        # -----------------------------------------------------------------
                        result_uri = generate_mock_result(task_id, metadata_uri)
                        print(f"[Worker] Generated result: {result_uri}")
                        print(f"[Worker] Submitting result for task #{task_id} ...")

                        nonce = w3.eth.get_transaction_count(account.address)
                        tx_params = {
                            "from": account.address,
                            "nonce": nonce,
                            "chainId": w3.eth.chain_id,
                            "gas": 200_000,
                            "gasPrice": w3.eth.gas_price,
                        }

                        tx = contract.functions.submitResult(
                            task_id, result_uri
                        ).build_transaction(tx_params)
                        signed = account.sign_transaction(tx)
                        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

                        if receipt.status == 1:
                            print(f"[Worker] Submit TX confirmed: {tx_hash.hex()}")
                            print(f"[Worker] Task #{task_id} result submitted successfully!")
                            # Verify new status
                            task = contract.functions.tasks(task_id).call()
                            print(f"[Worker] Task #{task_id} is now: {status_name(task[6])}")
                        else:
                            print(f"[ERROR] Submit TX reverted for task #{task_id}")
                            print("        The task may have been disputed or already submitted.")

                        print()

                    except Exception as exc:
                        print(f"[ERROR] Error processing task #{task_id}: {exc}")
                        continue

                # Update block cursor after processing all events
                last_checked_block = current_block + 1

            except KeyboardInterrupt:
                raise
            except Exception as exc:
                print(f"[WARN] Polling error: {exc}")
                print("[Worker] Retrying in 5 seconds ...")
                time.sleep(5)

    except KeyboardInterrupt:
        print("\n[Worker] Caught Ctrl+C — shutting down gracefully.")
        print(f"[Worker] Session claimed {len(claimed_task_ids)} task(s): {sorted(claimed_task_ids)}")
        print("[Worker] Worker agent stopped.")


if __name__ == "__main__":
    main()