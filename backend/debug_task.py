#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL", "http://127.0.0.1:8545")))
addr = Web3.to_checksum_address(os.getenv("CONTRACT_ADDRESS"))

ABI = [
    {"type":"function","name":"taskCounter","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"tasks","inputs":[{"name":"","type":"uint256"}],"outputs":[{"name":"taskId","type":"uint256"},{"name":"managerAgent","type":"address"},{"name":"workerAgent","type":"address"},{"name":"taskMetadataURI","type":"string"},{"name":"resultURI","type":"string"},{"name":"reward","type":"uint256"},{"name":"status","type":"uint8"}],"stateMutability":"view"},
]
contract = w3.eth.contract(address=addr, abi=ABI)
counter = contract.functions.taskCounter().call()
print(f"Task counter: {counter}")
if counter > 0:
    for i in range(1, counter + 1):
        t = contract.functions.tasks(i).call()
        print(f"Task {i}: {t}")
        for idx, val in enumerate(t):
            print(f"  [{idx}] = {val!r}")
