#!/usr/bin/env python3
"""End-to-end integration test for AgentSwarmEscrow"""
import os
import time
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = Web3.to_checksum_address(os.getenv("CONTRACT_ADDRESS"))
MANAGER_PK = os.getenv("MANAGER_PRIVATE_KEY")
WORKER_PK = os.getenv("WORKER_PRIVATE_KEY")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
assert w3.is_connected(), "NOT CONNECTED TO HN"

MANAGER = w3.eth.account.from_key(MANAGER_PK)
WORKER = w3.eth.account.from_key(WORKER_PK)

ABI = [
    {"type":"function","name":"postTask","inputs":[{"name":"_metadataURI","type":"string"}],"outputs":[],"stateMutability":"payable"},
    {"type":"function","name":"claimTask","inputs":[{"name":"_taskId","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"submitResult","inputs":[{"name":"_taskId","type":"uint256"},{"name":"_resultURI","type":"string"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"approveAndPay","inputs":[{"name":"_taskId","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"raiseDispute","inputs":[{"name":"_taskId","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"taskCounter","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"tasks","inputs":[{"name":"","type":"uint256"}],"outputs":[{"name":"taskId","type":"uint256"},{"name":"managerAgent","type":"address"},{"name":"workerAgent","type":"address"},{"name":"taskMetadataURI","type":"string"},{"name":"resultURI","type":"string"},{"name":"reward","type":"uint256"},{"name":"status","type":"uint8"}],"stateMutability":"view"},
    {"type":"event","name":"TaskPosted","inputs":[{"indexed":True,"type":"uint256","name":"taskId"},{"indexed":True,"type":"address","name":"manager"},{"indexed":False,"type":"uint256","name":"reward"},{"indexed":False,"type":"string","name":"metadataURI"}],"anonymous":False},
    {"type":"event","name":"TaskClaimed","inputs":[{"indexed":True,"type":"uint256","name":"taskId"},{"indexed":True,"type":"address","name":"worker"}],"anonymous":False},
    {"type":"event","name":"TaskSubmitted","inputs":[{"indexed":True,"type":"uint256","name":"taskId"},{"indexed":False,"type":"string","name":"resultURI"}],"anonymous":False},
    {"type":"event","name":"TaskApproved","inputs":[{"indexed":True,"type":"uint256","name":"taskId"},{"indexed":True,"type":"address","name":"worker"},{"indexed":False,"type":"uint256","name":"reward"}],"anonymous":False},
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)

def send_raw(tx, account):
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)

# --- 1. POST TASK ---
print("[1/5] Posting task from manager...")
before = w3.eth.get_balance(WORKER.address)

prev_counter = contract.functions.taskCounter().call()
task_id = prev_counter + 1

nonce = w3.eth.get_transaction_count(MANAGER.address)
tx = contract.functions.postTask("test://e2e-task").build_transaction({
    "from": MANAGER.address,
    "nonce": nonce,
    "value": Web3.to_wei(0.01, "ether"),
    "gas": 300000,
    "gasPrice": w3.to_wei("1", "gwei"),
})
receipt = send_raw(tx, MANAGER)
assert receipt.status == 1, "postTask FAILED"

task = contract.functions.tasks(task_id).call()
assert task[0] == task_id, f"taskId wrong: expected {task_id} got {task[0]}"
assert task[3] == "test://e2e-task", "metadata wrong"
assert task[5] == Web3.to_wei(0.01, "ether"), "reward wrong"
assert task[6] == 0, "status not Open"
print(f"   → Task #{task[0]} posted, reward={Web3.from_wei(task[5], 'ether')} ETH, status=Open")

# --- 2. CLAIM TASK ---
print("[2/5] Worker claiming task...")
nonce = w3.eth.get_transaction_count(WORKER.address)
tx = contract.functions.claimTask(task_id).build_transaction({
    "from": WORKER.address,
    "nonce": nonce,
    "gas": 300000,
    "gasPrice": w3.to_wei("1", "gwei"),
})
receipt = send_raw(tx, WORKER)
assert receipt.status == 1, "claimTask FAILED"

task = contract.functions.tasks(task_id).call()
assert task[6] == 1, "status not Claimed"
assert task[2].lower() == WORKER.address.lower(), "worker not set"
print(f"   → Task claimed by {WORKER.address[:10]}... status=Claimed")

# --- 3. SUBMIT RESULT ---
print("[3/5] Worker submitting result...")
nonce = w3.eth.get_transaction_count(WORKER.address)
tx = contract.functions.submitResult(task_id, "mock://result/e2e").build_transaction({
    "from": WORKER.address,
    "nonce": nonce,
    "gas": 300000,
    "gasPrice": w3.to_wei("1", "gwei"),
})
receipt = send_raw(tx, WORKER)
assert receipt.status == 1, "submitResult FAILED"

task = contract.functions.tasks(task_id).call()
assert task[6] == 2, "status not Submitted"
assert task[4] == "mock://result/e2e", "resultURI wrong"
print(f"   → Result submitted: {task[4]}, status=Submitted")

# --- 4. APPROVE AND PAY ---
print("[4/5] Manager approving & releasing escrow...")
nonce = w3.eth.get_transaction_count(MANAGER.address)
tx = contract.functions.approveAndPay(task_id).build_transaction({
    "from": MANAGER.address,
    "nonce": nonce,
    "gas": 300000,
    "gasPrice": w3.to_wei("1", "gwei"),
})
receipt = send_raw(tx, MANAGER)
assert receipt.status == 1, "approveAndPay FAILED"

task = contract.functions.tasks(task_id).call()
assert task[6] == 3, "status not Verified"
print(f"   → Task approved! status=Verified")

# --- 5. BALANCE CHECK ---
after = w3.eth.get_balance(WORKER.address)
diff = after - before
print(f"[5/5] Worker balance change: +{Web3.from_wei(diff, 'ether')} ETH")
assert diff > 0, "Worker was NOT paid!"

print("\n✅ ALL E2E TESTS PASSED")
