import { ethers } from 'ethers'

// Network-specific contract addresses
const DEPLOYMENTS = {
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',   // Hardhat localhost
  11155111: '0x0000000000000000000000000000000000000000', // Sepolia (fill after deployment)
}

/**
 * Get contract address for a given chainId.
 * Falls back to localhost address if chainId is not recognized.
 * @param {number} chainId
 * @returns {string}
 */
export function getContractAddress(chainId) {
  return DEPLOYMENTS[chainId] || DEPLOYMENTS[31337]
}

export const ABI = [
  { inputs: [], name: 'AlreadyAssigned', type: 'error' },
  { inputs: [], name: 'CallerNotParticipant', type: 'error' },
  { inputs: [], name: 'InvalidStatus', type: 'error' },
  { inputs: [], name: 'OnlyManagerAllowed', type: 'error' },
  { inputs: [], name: 'OnlyWorkerAllowed', type: 'error' },
  { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
  { inputs: [], name: 'TaskNotFound', type: 'error' },
  { inputs: [], name: 'TransferFailed', type: 'error' },
  { inputs: [], name: 'ZeroReward', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'taskId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'worker', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'reward', type: 'uint256' },
    ],
    name: 'TaskApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'taskId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'worker', type: 'address' },
    ],
    name: 'TaskClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'taskId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'disputer', type: 'address' },
    ],
    name: 'TaskDisputed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'taskId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'manager', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'reward', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'metadataURI', type: 'string' },
    ],
    name: 'TaskPosted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'taskId', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'resultURI', type: 'string' },
    ],
    name: 'TaskSubmitted',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_taskId', type: 'uint256' }],
    name: 'approveAndPay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_taskId', type: 'uint256' }],
    name: 'claimTask',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_metadataURI', type: 'string' }],
    name: 'postTask',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_taskId', type: 'uint256' }],
    name: 'raiseDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_taskId', type: 'uint256' },
      { internalType: 'string', name: '_resultURI', type: 'string' },
    ],
    name: 'submitResult',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'taskCounter',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'tasks',
    outputs: [
      { internalType: 'uint256', name: 'taskId', type: 'uint256' },
      { internalType: 'address', name: 'managerAgent', type: 'address' },
      { internalType: 'address', name: 'workerAgent', type: 'address' },
      { internalType: 'string', name: 'taskMetadataURI', type: 'string' },
      { internalType: 'string', name: 'resultURI', type: 'string' },
      { internalType: 'uint256', name: 'reward', type: 'uint256' },
      { internalType: 'enum AgentSwarmEscrow.Status', name: 'status', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'receive', outputs: [], stateMutability: 'payable', type: 'receive' },
]

/**
 * Returns an ethers.Contract instance connected to the given provider or signer.
 * Automatically detects the network chainId and uses the correct contract address.
 * @param {ethers.Provider | ethers.Signer} providerOrSigner
 * @returns {Promise<ethers.Contract>}
 */
export async function getContract(providerOrSigner) {
  // Signers (Wallet, JsonRpcSigner) have .provider; pure Providers do not.
  const provider = providerOrSigner.provider || providerOrSigner
  const network = await provider.getNetwork()
  const chainId = Number(network.chainId)
  const address = getContractAddress(chainId)
  return new ethers.Contract(address, ABI, providerOrSigner)
}

/**
 * Fetches all tasks from the contract.
 * @param {ethers.Contract} contract
 * @returns {Promise<Array>}
 */
export async function getTasks(contract) {
  const counter = await contract.taskCounter()
  const total = Number(counter)
  const results = []

  for (let i = 1; i <= total; i++) {
    const task = await contract.tasks(i)
    results.push({
      taskId: Number(task.taskId),
      managerAgent: task.managerAgent,
      workerAgent: task.workerAgent,
      taskMetadataURI: task.taskMetadataURI,
      resultURI: task.resultURI,
      reward: task.reward,
      status: Number(task.status),
    })
  }

  return results
}

/**
 * Formats a wei value to ETH string (max 6 decimal places).
 * @param {bigint | string | number} wei
 * @returns {string}
 */
export function formatEth(wei) {
  const str = ethers.formatEther(wei)
  // Remove trailing zeros after decimal point
  return str.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export const STATUS_NAMES = ['Open', 'Claimed', 'Submitted', 'Verified', 'Disputed']

export const STATUS_COLORS = {
  0: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  3: 'bg-green-500/20 text-green-400 border-green-500/30',
  4: 'bg-red-500/20 text-red-400 border-red-500/30',
}

/**
 * Detects an injected wallet provider robustly.
 * - Polls for up to 3s in case of async injection
 * - Handles multi-wallet EIP-6963 `providers` array
 * - Distinguishes MetaMask from Coinbase/Phantom/Brave
 * @returns {Promise<{provider: any; info: string} | null>}
 */
export async function detectProvider() {
  if (window.ethereum) {
    // Multi-wallet scenario: pick MetaMask if available in providers array
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      const mm = window.ethereum.providers.find(
        (p) => p.isMetaMask && !p.isBraveWallet && !p.isCoinbaseWallet && !p.isPhantom,
      )
      if (mm) return { provider: mm, info: 'MetaMask (multi-wallet)' }
      return { provider: window.ethereum.providers[0], info: 'Wallet detected' }
    }
    if (window.ethereum.isMetaMask) return { provider: window.ethereum, info: 'MetaMask' }
    if (window.ethereum.isCoinbaseWallet) return { provider: window.ethereum, info: 'Coinbase Wallet' }
    if (window.ethereum.isBraveWallet) return { provider: window.ethereum, info: 'Brave Wallet' }
    return { provider: window.ethereum, info: 'Wallet detected' }
  }

  // Poll for async injection (MetaMask sometimes injects late)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 200))
    if (window.ethereum) {
      return { provider: window.ethereum, info: 'MetaMask (late injection)' }
    }
  }

  return null
}