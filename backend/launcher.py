#!/usr/bin/env python3
"""Multi-worker launcher for AgentSwarmEscrow."""
import os
import sys
import json
import subprocess
import signal
import time
from dotenv import load_dotenv
from urllib.request import urlopen, Request
from urllib.error import URLError

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")

HARHAT_KEYS = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",  # 0
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",  # 1
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",  # 2
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",  # 3
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f27c8cc0bffa4",  # 4
    "0x8b3a350cf5c34c9194ca8584a2d3426a76a05a5a38e362f1e2a131e99bb8b2e0",  # 5
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",  # 6
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",  # 7
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",  # 8
    "0x2a871d0798f97d79848a013d4936a6bf4f591d49896e828c79192a7c5eb1d7f0",  # 9
]

# ANSI color codes for worker output
WORKER_COLORS = [
    "\033[94m",   # blue      - Worker 1
    "\033[92m",   # green     - Worker 2
    "\033[93m",   # yellow    - Worker 3
    "\033[96m",   # cyan      - Worker 4
    "\033[95m",   # magenta   - Worker 5
    "\033[91m",   # red       - Worker 6
    "\033[97m",   # white     - Worker 7
    "\033[90m",   # bright black - Worker 8
    "\033[96m",   # cyan      - Worker 9
    "\033[95m",   # magenta   - Worker 10
]
RESET_COLOR = "\033[0m"

_processes = []


def is_node_alive(url: str) -> bool:
    """Check if the Hardhat node is responding to JSON-RPC calls."""
    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": "eth_blockNumber",
        "params": [],
        "id": 1
    }).encode("utf-8")
    
    try:
        req = Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
            if "result" in result:
                return True
    except (URLError, json.JSONDecodeError, TimeoutError):
        pass
    return False


def get_address_from_key(private_key: str) -> str:
    """Derive the Ethereum address from a private key."""
    # Simple hex extraction for Hardhat keys (address is derived, using a mock here)
    # For production, you'd use web3.py to derive the address
    # Hardhat accounts: address is last 20 bytes of the key's derived pubkey
    # Using a lookup table for the 10 default accounts
    from web3 import Web3
    w3 = Web3()
    acct = w3.eth.account.from_key(private_key)
    return acct.address


def launch_worker(index: int, key: str, script_dir: str) -> subprocess.Popen:
    """Launch a single worker_agent.py process."""
    env = os.environ.copy()
    env["WORKER_PRIVATE_KEY"] = key
    env["WORKER_INDEX"] = str(index)
    env["WORKER_COLOR"] = WORKER_COLORS[(index - 1) % len(WORKER_COLORS)]
    
    proc = subprocess.Popen(
        [sys.executable, "worker_agent.py"],
        env=env,
        cwd=script_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1  # line buffered
    )
    return proc


def print_worker_output(proc: subprocess.Popen, worker_num: int, color: str):
    """Non-blocking output reader for a worker process."""
    try:
        for line in iter(proc.stdout.readline, ""):
            if line:
                sys.stdout.write(f"{color}[Worker-{worker_num}]{RESET_COLOR} {line}")
                sys.stdout.flush()
    except Exception:
        pass


def main():
    global _processes
    
    # Parse CLI arguments
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    # Clamp to available accounts (reserve index 0 for manager)
    max_workers = len(HARHAT_KEYS) - 1
    if count > max_workers:
        print(f"Warning: Requested {count} workers, but only {max_workers} available (index 0 reserved for manager).")
        print(f"Clamping to {max_workers} workers.")
        count = max_workers
    
    if count < 1:
        print("Error: Must launch at least 1 worker.")
        sys.exit(1)
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Verify Hardhat node is alive
    print(f"Checking Hardhat node at {RPC_URL}...")
    if not is_node_alive(RPC_URL):
        print("Error: Hardhat node is not responding. Is it running?")
        sys.exit(1)
    print("Hardhat node is alive.\n")
    
    # Build address lookup
    print("Deriving worker addresses...")
    worker_info = []
    for i in range(1, count + 1):
        key = HARHAT_KEYS[i]
        address = get_address_from_key(key)
        worker_info.append((i, key, address))
    print("Done.\n")
    
    # Launch workers
    print("Launching workers...\n")
    processes = []
    
    for idx, key, address in worker_info:
        proc = launch_worker(idx, key, script_dir)
        processes.append((idx, address, proc))
        time.sleep(0.1)  # Small delay between launches
    
    # Print startup table
    print("=" * 70)
    print(f"{'Worker #':<10} {'Account Idx':<14} {'Address':<44} {'PID':<8}")
    print("-" * 70)
    for idx, address, proc in processes:
        print(f"{idx:<10} {idx:<14} {address:<44} {proc.pid:<8}")
    print("=" * 70)
    print(f"\n{count} worker(s) launched successfully.")
    print("Press Ctrl+C to stop all workers.\n")
    
    _processes = processes
    
    # Set up signal handler for graceful shutdown
    def signal_handler(signum, frame):
        print("\nReceived interrupt signal. Shutting down workers...")
        terminate_all()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Wait for all processes to complete
    try:
        for idx, address, proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        terminate_all()


def terminate_all():
    """Terminate all child processes gracefully."""
    print("\nTerminating all workers...")
    for idx, address, proc in _processes:
        if proc.poll() is None:  # Still running
            print(f"  Stopping Worker-{idx} (PID {proc.pid})...")
            proc.terminate()
    
    # Wait for graceful termination
    for idx, address, proc in _processes:
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print(f"  Force killing Worker-{idx} (PID {proc.pid})...")
            proc.kill()
    
    print("All workers stopped.")


if __name__ == "__main__":
    main()