import { useState, useEffect, useCallback, useRef, useContext } from 'react'
import { ethers } from 'ethers'
import { getContract, getTasks, STATUS_NAMES, STATUS_COLORS, formatEth, detectProvider } from './utils/contracts'
import { getDevSigner, getHardhatProvider } from './utils/devWallet'
import { shortenAddress } from './utils/uriResolver'
import { Zap, AlertTriangle, CheckCircle2, X, Radar } from 'lucide-react'
import { NotificationContext } from './context/NotificationContext'

import Navbar from './components/Navbar'
import TaskCreationModal from './components/TaskCreationModal'
import ActiveLedgerGrid from './components/ActiveLedgerGrid'
import SwarmVisualizer from './components/SwarmVisualizer'
import HardhatDevAccounts from './components/HardhatDevAccounts'
import TxActivityLog from './components/TxActivityLog'
// import DevWalletPicker from './components/DevWalletPicker'
import ParticleBackground from './components/ParticleBackground'
import DeploymentWizard from './components/DeploymentWizard'
import SwarmActivityFeed from './components/SwarmActivityFeed'
import AdvancedNotificationSystem from './components/AdvancedNotificationSystem'
import AIConsole from './components/AIConsole'
import DecomposeConfirmModal from './components/DecomposeConfirmModal'

// ─── Typing Animation Hook ────────────────────────────────────────────────────
const FULL_TITLE = 'Autonomous M2M Agentic Swarm Escrow Protocol'

function useTypingEffect(text, speed = 50, startDelay = 500) {
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    let index = 0
    setDisplayText('')

    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1))
          index++
        } else {
          clearInterval(interval)
          setTimeout(() => setShowCursor(false), 2000)
        }
      }, speed)

      return () => clearInterval(interval)
    }, startDelay)

    return () => clearTimeout(startTimeout)
  }, [text, speed, startDelay])

  return { displayText, showCursor }
}

// ─── Section Reveal Hook ──────────────────────────────────────────────────────
function useSectionReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
            const children = entry.target.querySelectorAll('[data-animate-child]')
            children.forEach((child, i) => {
              setTimeout(() => {
                child.classList.add('animate-in')
              }, i * 100)
            })
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const sections = document.querySelectorAll('[data-animate]')
    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])
}

// ─── Toast Container (legacy, kept for compatibility) ─────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-72 max-w-96 ${
            toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-300 animate-slide-in-right animate-shake'
              : toast.type === 'success'
              ? 'bg-green-950/90 border-green-500/40 text-green-300 animate-slide-in-right animate-bounce-in'
              : 'bg-slate-900/90 border-cyan-500/30 text-slate-200 animate-slide-in-right'
          }`}
          style={{ '--toast-exit': 'animate-slide-out-right' }}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'error' ? (
              <AlertTriangle size={16} className="text-red-400" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <Zap size={16} className="text-cyan-400" />
            )}
          </div>
          <p className="flex-1 text-sm leading-snug font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <Icon size={20} className="text-cyan-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Hero Title ───────────────────────────────────────────────────────────────
function HeroTitle() {
  const { displayText, showCursor } = useTypingEffect(FULL_TITLE, 40, 800)

  return (
    <div className="text-center mb-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-wide">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-[length:200%_auto] animate-gradient-shine">
          {displayText}
        </span>
        {showCursor && (
          <span className="inline-block w-0.5 h-7 bg-cyan-400 ml-1 align-middle animate-typing-cursor" />
        )}
      </h1>
      <noscript>
        <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">
          {FULL_TITLE}
        </h1>
      </noscript>
    </div>
  )
}

// ─── Human Command Deck ───────────────────────────────────────────────────────
const SAMPLE_PROMPTS = [
  'Analyze market sentiment for ETH/USDT and post findings as a JSON report.',
  'Scrape top 10 trending GitHub repositories and summarize their stars.',
  'Fetch current weather data for New York, London, and Tokyo in Celsius.',
]

function HumanCommandDeck({ onSubmitPrompt, onOpenModal, isLoading, wallet, tasks, deploymentStartTime }) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!prompt.trim()) return
    onSubmitPrompt(prompt.trim())
  }

  const fillSample = (sample) => setPrompt(sample)

  return (
    <section className="cyber-card p-6" data-animate data-animate-delay="2">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader
          icon={Zap}
          title="Human Command Deck"
          subtitle="Submit a goal to the autonomous swarm"
        />
        {wallet.address && (
          <button
            onClick={onOpenModal}
            className="cyber-btn text-sm flex items-center gap-2 btn-gradient-shine"
          >
            <Radar size={14} />
            Open Mission Control
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want the agent swarm to accomplish..."
          rows={3}
          className="cyber-input resize-none font-mono text-sm"
          disabled={!wallet.address || isLoading}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {SAMPLE_PROMPTS.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => fillSample(sample)}
                disabled={!wallet.address}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || !wallet.address || isLoading}
            className="cyber-btn-primary btn-gradient-shine"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                Deploying...
              </span>
            ) : (
              'Deploy to Swarm'
            )}
          </button>
        </div>
      </form>

      <DeploymentWizard tasks={tasks} isDeploying={isLoading} deploymentStartTime={deploymentStartTime} />

      {!wallet.address && (
        <p className="mt-3 text-xs text-slate-600">
          Connect your wallet to interact with the swarm.
        </p>
      )}
    </section>
  )
}

// ─── Manual Intervention Override ────────────────────────────────────────────
function ManualInterventionOverride({ wallet, contract, addTxLog }) {
  const { addNotification } = useContext(NotificationContext)
  const [targetTaskId, setTargetTaskId] = useState('')
  const [resultURI, setResultURI] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const doAction = async (action, taskId) => {
    if (!contract) {
      addNotification({ type: 'error', title: 'Wallet Not Connected', message: 'Wallet not connected.', agentIcon: '⚠️' })
      return
    }
    const taskLabel = `Task #${taskId} · ${action}()`

    addTxLog(taskLabel, 'pending', null, 'Confirm in MetaMask...')
    try {
      setActionLoading(action)
      let tx
      if (action === 'claimTask') {
        tx = await contract.claimTask(taskId)
      } else if (action === 'approveAndPay') {
        tx = await contract.approveAndPay(taskId)
      } else if (action === 'raiseDispute') {
        tx = await contract.raiseDispute(taskId)
      } else if (action === 'submitResult') {
        tx = await contract.submitResult(taskId, resultURI || 'ipfs://mock-result')
      }
      addTxLog(taskLabel, 'pending', tx.hash, `Mining transaction... ${tx.hash.slice(0, 10)}...`)
      addNotification({ type: 'info', title: 'Transaction Mining', message: `Mining ${action}... tx: ${tx.hash.slice(0, 10)}...`, agentIcon: '⛏️' })
      await tx.wait()
      addTxLog(taskLabel, 'success', tx.hash, `${action} confirmed on-chain.`)
      addNotification({ type: 'success', title: 'Transaction Confirmed', message: `${action} confirmed on-chain.`, agentIcon: '✅' })
    } catch (err) {
      if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
        addTxLog(taskLabel, 'error', null, 'Transaction rejected by user.')
        addNotification({ type: 'error', title: 'Transaction Rejected', message: 'Transaction rejected by user.', agentIcon: '⚠️' })
      } else {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(taskLabel, 'error', null, reason)
        addNotification({ type: 'error', title: 'Transaction Failed', message: `${action} failed: ${reason}`, agentIcon: '⚠️' })
      }
    } finally {
      setActionLoading('')
    }
  }

  const handlePostTask = async () => {
    if (!contract) {
      addNotification({ type: 'error', title: 'Wallet Not Connected', message: 'Wallet not connected.', agentIcon: '⚠️' })
      return
    }
    addTxLog('Manual Post Task', 'pending', null, 'Confirm in MetaMask...')
    try {
      setActionLoading('postTask')
      const metadataURI = 'ipfs://mock-metadata/' + Date.now()
      const value = ethers.parseEther('0.01')
      const tx = await contract.postTask(metadataURI, { value })
      addTxLog('Manual Post Task', 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
      addNotification({ type: 'info', title: 'Posting Task', message: `Posting task... tx: ${tx.hash.slice(0, 10)}...`, agentIcon: '🚀' })
      await tx.wait()
      addTxLog('Manual Post Task', 'success', tx.hash, 'Task posted and 0.01 ETH locked in escrow.')
      addNotification({ type: 'success', title: 'Task Posted', message: 'Task posted and 0.01 ETH locked in escrow.', agentIcon: '✅' })
    } catch (err) {
      if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
        addTxLog('Manual Post Task', 'error', null, 'Transaction rejected by user.')
        addNotification({ type: 'error', title: 'Transaction Rejected', message: 'Transaction rejected by user.', agentIcon: '⚠️' })
      } else {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog('Manual Post Task', 'error', null, reason)
        addNotification({ type: 'error', title: 'Transaction Failed', message: `postTask failed: ${reason}`, agentIcon: '⚠️' })
      }
    } finally {
      setActionLoading('')
    }
  }

  const taskId = parseInt(targetTaskId, 10) || 0

  return (
    <section className="cyber-card p-6" data-animate data-animate-delay="5">
      <SectionHeader
        icon={AlertTriangle}
        title="Manual Intervention Override"
        subtitle="Directly call contract functions (for MetaMask testing)"
      />
      {!wallet.address ? (
        <p className="text-sm text-slate-600">Connect your wallet to use manual controls.</p>
      ) : wallet.chainId !== 31337 ? (
        <p className="text-sm text-red-400">Wrong network — switch to Hardhat Localhost (chain 31337) to use manual controls.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Post Task */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handlePostTask}
              disabled={actionLoading !== ''}
              className="cyber-btn text-sm btn-gradient-shine"
            >
              {actionLoading === 'postTask' ? 'Posting...' : 'postTask() [0.01 ETH]'}
            </button>
            <span className="text-xs text-slate-500">Post a new task with 0.01 ETH reward</span>
          </div>

          {/* Task ID input */}
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={targetTaskId}
              onChange={(e) => setTargetTaskId(e.target.value)}
              placeholder="Task ID"
              className="cyber-input w-28 text-sm"
            />
          </div>

          {/* Result URI input */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={resultURI}
              onChange={(e) => setResultURI(e.target.value)}
              placeholder="ipfs://result-uri (optional)"
              className="cyber-input flex-1 text-sm"
            />
          </div>

          {/* Row of action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => doAction('claimTask', taskId)}
              disabled={!taskId || actionLoading !== ''}
              className="cyber-btn text-sm btn-gradient-shine"
            >
              {actionLoading === 'claimTask' ? '...' : 'claimTask()'}
            </button>
            <button
              onClick={() => doAction('submitResult', taskId)}
              disabled={!taskId || actionLoading !== ''}
              className="cyber-btn text-sm btn-gradient-shine"
            >
              {actionLoading === 'submitResult' ? '...' : 'submitResult()'}
            </button>
            <button
              onClick={() => doAction('approveAndPay', taskId)}
              disabled={!taskId || actionLoading !== ''}
              className="cyber-btn text-sm btn-gradient-shine"
            >
              {actionLoading === 'approveAndPay' ? '...' : 'approveAndPay()'}
            </button>
            <button
              onClick={() => doAction('raiseDispute', taskId)}
              disabled={!taskId || actionLoading !== ''}
              className="cyber-btn text-sm btn-gradient-shine"
            >
              {actionLoading === 'raiseDispute' ? '...' : 'raiseDispute()'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { addNotification } = useContext(NotificationContext)

  const [wallet, setWallet] = useState({ address: null, balance: '0', chainId: null })
  const [walletSource, setWalletSource] = useState(null) // 'metamask' | 'dev' | null
  const [tasks, setTasks] = useState([])
  const [toasts, setToasts] = useState([])
  const [txLog, setTxLog] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [, setDeploymentStep] = useState(null)
  const [deploymentStartTime, setDeploymentStartTime] = useState(null)

  // ── Chunk 3: Decomposition state ──────────────────────────────────────────
  const [decomposedTasks, setDecomposedTasks] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const prevTasksRef = useRef([])

  const providerRef = useRef(null)
  const signerRef = useRef(null)
  const contractRef = useRef(null)
  const balanceIntervalRef = useRef(null)

  // Initialize section reveal animations
  useSectionReveal()

  // ── Toast helpers (legacy) ────────────────────────────────────────────────
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Tx Activity Log helpers ───────────────────────────────────────────────
  const addTxLog = useCallback((step, status, hash = null, message = null) => {
    setTxLog((prev) => [
      ...prev,
      { id: `${step}-${Date.now()}-${Math.random()}`, step, status, hash, message, timestamp: Date.now() },
    ])
  }, [])

  // ── Contract ref helper ───────────────────────────────────────────────────
  const getContractRef = useCallback(() => contractRef.current, [])

  // ── Refresh tasks from chain ──────────────────────────────────────────────
  const refreshTasks = useCallback(async () => {
    if (!contractRef.current) return
    try {
      const onChainTasks = await getTasks(contractRef.current)
      const prevTasks = prevTasksRef.current

      // Status change notifications
      onChainTasks.forEach((curr) => {
        const prev = prevTasks.find((t) => t.taskId === curr.taskId)
        if (!prev) return
        if (prev.status === 0 && curr.status === 1) {
          addNotification({
            type: 'info',
            title: 'Task Claimed',
            message: `Task #${curr.taskId} claimed by ${shortenAddress(curr.workerAgent)}`,
            agentIcon: '🐝',
          })
        }
        if (prev.status === 1 && curr.status === 2) {
          addNotification({
            type: 'info',
            title: 'Result Submitted',
            message: `Task #${curr.taskId} result submitted`,
            agentIcon: '🐝',
          })
        }
        if (prev.status === 2 && curr.status === 3) {
          addNotification({
            type: 'success',
            title: 'Task Approved',
            message: `Task #${curr.taskId} approved — ${formatEth(curr.reward)} ETH released`,
            agentIcon: '🧠',
          })
        }
      })

      prevTasksRef.current = onChainTasks
      setTasks(onChainTasks)
    } catch (err) {
      // Silently skip refresh failures — wallet may be disconnected
    }
  }, [addNotification])

  // ── Poll ETH balance ───────────────────────────────────────────────────────
  const pollBalance = useCallback(async () => {
    if (!signerRef.current || !wallet.address) return
    try {
      const balance = await providerRef.current.getBalance(wallet.address)
      setWallet((prev) => ({
        ...prev,
        balance: parseFloat(ethers.formatEther(balance)).toFixed(4),
      }))
    } catch {
      // ignore
    }
  }, [wallet.address])

  // ── MetaMask connect ───────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setConnecting(true)
    try {
      const detected = await detectProvider()
      if (!detected) {
        addNotification({
          type: 'error',
          title: 'MetaMask Not Detected',
          message:
            '1. Make sure you are using http://localhost:5173 (NOT the IP address)\n' +
            '2. Use a normal browser window, NOT Incognito / Private\n' +
            '3. Disable conflicting wallets (Coinbase, Phantom, Trust)\n' +
            '4. Refresh the page after installing MetaMask.',
          agentIcon: '⚠️',
          persistent: true,
        })
        setConnecting(false)
        return
      }

      const provider = new ethers.BrowserProvider(detected.provider)
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      // Auto-prompt to switch if on wrong chain
      if (chainId !== 31337) {
        addNotification({
          type: 'warning',
          title: 'Wrong Network',
          message: `Connected on chain ${chainId} — switching to Hardhat Localhost (31337)...`,
          agentIcon: '⚠️',
        })
        try {
          await detected.provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }],
          })
          window.location.reload()
          return
        } catch (switchError) {
          if (switchError.code === 4902) {
            await detected.provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x7a69',
                  chainName: 'Hardhat Localhost',
                  rpcUrls: ['http://127.0.0.1:8545'],
                  nativeCurrency: {
                    name: 'Hardhat Ether',
                    symbol: 'GO-ETH',
                    decimals: 18,
                  },
                },
              ],
            })
            window.location.reload()
            return
          }
          throw switchError
        }
      }

      providerRef.current = provider
      const signer = await providerRef.current.getSigner()
      const address = await signer.getAddress()
      const balance = await providerRef.current.getBalance(address)

      signerRef.current = signer
      contractRef.current = await getContract(signer)

      setWallet({
        address,
        balance: parseFloat(ethers.formatEther(balance)).toFixed(4),
        chainId: Number(network.chainId),
      })

      addNotification({
        type: 'success',
        title: 'Wallet Connected',
        message: `Connected: ${shortenAddress(address)}`,
        agentIcon: '✅',
      })

      // Start balance polling
      balanceIntervalRef.current = setInterval(pollBalance, 10000)

      // Refresh tasks on connect
      await refreshTasks()
    } catch (err) {
      if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
        addNotification({
          type: 'error',
          title: 'Connection Rejected',
          message: 'MetaMask connection rejected.',
          agentIcon: '⚠️',
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Connection Failed',
          message: `Connection failed: ${err.message}`,
          agentIcon: '⚠️',
        })
      }
    } finally {
      setConnecting(false)
    }
  }, [addNotification, pollBalance, refreshTasks])

  // ── Disconnect (local state only) ──────────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setWallet({ address: null, balance: '0', chainId: null })
    setWalletSource(null)
    signerRef.current = null
    contractRef.current = null
    if (balanceIntervalRef.current) {
      clearInterval(balanceIntervalRef.current)
      balanceIntervalRef.current = null
    }
    addNotification({ type: 'info', title: 'Disconnected', message: 'Wallet disconnected.', agentIcon: '👋' })
  }, [addNotification])

  // ── Connect using dev wallet ───────────────────────────────────────────────
  const connectDevWallet = useCallback(async (index) => {
    try {
      setConnecting(true)
      const provider = getHardhatProvider()
      const signer = getDevSigner(index, provider)
      const address = await signer.getAddress()
      const balance = await provider.getBalance(address)

      providerRef.current = provider
      signerRef.current = signer
      contractRef.current = await getContract(signer)

      setWallet({
        address,
        balance: parseFloat(ethers.formatEther(balance)).toFixed(4),
        chainId: 31337,
      })
      setWalletSource('dev')

      addNotification({
        type: 'success',
        title: 'Dev Wallet Connected',
        message: `Dev Account #${index} connected: ${shortenAddress(address)}`,
        agentIcon: '✅',
      })

      await refreshTasks()
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Dev Wallet Failed',
        message: `Dev wallet connect failed: ${err.message}`,
        agentIcon: '⚠️',
      })
    } finally {
      setConnecting(false)
    }
  }, [addNotification, refreshTasks])

  // ── Revoke MetaMask site permission ────────────────────────────────────────
  const revokeConnection = useCallback(async () => {
    try {
      const detected = await detectProvider()
      if (detected?.provider) {
        try {
          await detected.provider.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          })
        } catch {
          // Fallback: some wallets don't support revoke
        }
      }
    } catch {
      // ignore
    }
    disconnectWallet()
    addNotification({
      type: 'success',
      title: 'Permissions Revoked',
      message: 'MetaMask connection revoked. Next Connect will show the account picker.',
      agentIcon: '🔓',
    })
  }, [disconnectWallet, addNotification])

  // ── Switch MetaMask Account ────────────────────────────────────────────────
  const handleSwitchAccount = useCallback(async () => {
    setTxLog([])
    await revokeConnection()
    addNotification({
      type: 'success',
      title: 'Account Switch Initiated',
      message: 'Site permissions revoked. Click "Connect Wallet" and select your imported Hardhat account from the picker.',
      agentIcon: '🔁',
    })
  }, [revokeConnection, addNotification])

  // ── Request network switch ─────────────────────────────────────────────────
  const switchNetwork = useCallback(async () => {
    try {
      const detected = await detectProvider()
      if (!detected) {
        addNotification({ type: 'error', title: 'No Wallet Found', message: 'No wallet found to switch network.', agentIcon: '⚠️' })
        return
      }
      const provider = detected.provider
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }],
        })
      } catch (switchError) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x7a69',
                chainName: 'Hardhat Localhost',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: {
                  name: 'Hardhat Ether',
                  symbol: 'GO-ETH',
                  decimals: 18,
                },
              },
            ],
          })
        } else {
          throw switchError
        }
      }
      addNotification({ type: 'success', title: 'Network Switched', message: 'Switched to Hardhat Localhost.', agentIcon: '🔗' })
    } catch (err) {
      if (err.code === 4001) {
        addNotification({ type: 'error', title: 'Switch Rejected', message: 'Network switch rejected.', agentIcon: '⚠️' })
      } else {
        addNotification({ type: 'error', title: 'Switch Failed', message: `Switch failed: ${err.message}`, agentIcon: '⚠️' })
      }
    }
  }, [addNotification])

  // ── Post a single task with value ─────────────────────────────────────────
  const handlePostTask = useCallback(
    async (goal, metadataURI) => {
      if (!contractRef.current) {
        addNotification({ type: 'error', title: 'Wallet Not Connected', message: 'Wallet not connected.', agentIcon: '⚠️' })
        return
      }
      addTxLog('Mission Control: Post Task', 'pending', null, 'Confirm in MetaMask...')
      const value = ethers.parseEther('0.05')
      try {
        const tx = await contractRef.current.postTask(metadataURI, { value })
        addTxLog('Mission Control: Post Task', 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        addNotification({ type: 'info', title: 'Posting Task', message: `Posting task... tx: ${tx.hash.slice(0, 10)}...`, agentIcon: '🚀' })
        await tx.wait()
        addTxLog('Mission Control: Post Task', 'success', tx.hash, 'Task posted: 0.05 ETH locked in escrow.')
        addNotification({ type: 'success', title: 'Task Posted', message: 'Task posted: 0.05 ETH locked in escrow.', agentIcon: '✅' })
      } catch (err) {
        if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
          addTxLog('Mission Control: Post Task', 'error', null, 'Transaction rejected by user.')
          addNotification({ type: 'error', title: 'Transaction Rejected', message: 'Transaction rejected by user.', agentIcon: '⚠️' })
        } else {
          const reason = err.reason || err.message || 'Unknown error'
          addTxLog('Mission Control: Post Task', 'error', null, reason)
          addNotification({ type: 'error', title: 'Transaction Failed', message: `Failed: ${reason}`, agentIcon: '⚠️' })
        }
      }
    },
    [addNotification, addTxLog]
  )

  // ── Submit prompt → decompose → confirm → post ────────────────────────────
  const handleSubmitPrompt = useCallback(
    async (promptText) => {
      if (!contractRef.current) {
        addNotification({ type: 'error', title: 'Wallet Not Connected', message: 'Please connect your wallet first.', agentIcon: '⚠️', persistent: true })
        return
      }
      setIsLoading(true)
      setDeploymentStartTime(Date.now())
      setDeploymentStep('🧠 AI decomposing goal...')

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 45000)
        const response = await fetch('http://127.0.0.1:8000/api/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal: promptText }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!response.ok) throw new Error(`Decomposition failed: ${response.status}`)
        const data = await response.json()
        const tasksList = data.tasks || []
        setDecomposedTasks(tasksList)
        setShowConfirmModal(true)
        addNotification({
          type: 'success',
          title: 'AI Decomposition Complete',
          message: `Found ${tasksList.length} subtask${tasksList.length !== 1 ? 's' : ''}`,
          agentIcon: '🧠',
        })
      } catch (err) {
        const isTimeout = err.name === 'AbortError'
        addNotification({
          type: 'error',
          title: isTimeout ? 'Decomposition Timed Out' : 'Decomposition Failed',
          message: isTimeout
            ? 'NVIDIA AI took too long. Falling back to single-task mode.'
            : err.message,
          agentIcon: '⚠️',
          persistent: true,
        })
        // Fallback: create 1 task with the raw goal text
        setDecomposedTasks([{ id: 0, description: promptText, bounty_eth: 0.05 }])
        setShowConfirmModal(true)
      } finally {
        setIsLoading(false)
      }
    },
    [addNotification]
  )

  // ── Confirm deployment of decomposed tasks ────────────────────────────────
  const handleConfirmDeploy = useCallback(async () => {
    if (!contractRef.current || decomposedTasks.length === 0) return
    setShowConfirmModal(false)
    setIsLoading(true)
    setDeploymentStartTime(Date.now())

    for (let i = 0; i < decomposedTasks.length; i++) {
      const task = decomposedTasks[i]
      setDeploymentStep(`Posting task ${i + 1}/${decomposedTasks.length}: ${task.description}`)
      addNotification({
        type: 'info',
        agentIcon: '🚀',
        title: `Posting Task ${i + 1}/${decomposedTasks.length}`,
        message: task.description,
      })

      const metadataURI = `ipfs://task-meta/${btoa(task.description)}`
      const bountyWei = ethers.parseEther(String(task.bounty_eth || 0.05))

      try {
        addTxLog(`Deploy Task ${i + 1}`, 'pending', null, 'Confirm in MetaMask...')
        const tx = await contractRef.current.postTask(metadataURI, { value: bountyWei })
        addTxLog(`Deploy Task ${i + 1}`, 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        await tx.wait()
        addTxLog(`Deploy Task ${i + 1}`, 'success', tx.hash, `Task posted: ${formatEth(bountyWei)} ETH locked.`)
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Deploy Task ${i + 1}`, 'error', null, reason)
        addNotification({
          type: 'error',
          title: `Task ${i + 1} Failed`,
          message: reason,
          agentIcon: '⚠️',
        })
      }
    }

    addNotification({
      type: 'success',
      title: 'All Tasks Deployed!',
      message: `${decomposedTasks.length} tasks posted to escrow`,
      agentIcon: '🚀',
    })
    await refreshTasks()
    setIsLoading(false)
    setDeploymentStep('')
  }, [decomposedTasks, addNotification, addTxLog, refreshTasks])

  // ── Cancel deployment ─────────────────────────────────────────────────────
  const handleCancelDeploy = useCallback(() => {
    setShowConfirmModal(false)
    setDecomposedTasks([])
  }, [])

  // ── Claim a task ──────────────────────────────────────────────────────────
  const handleClaimTask = useCallback(
    async (taskId) => {
      if (!contractRef.current) return
      setIsLoading(true)
      addTxLog(`Claim: Task #${taskId}`, 'pending', null, 'Confirm in MetaMask...')
      try {
        const tx = await contractRef.current.claimTask(taskId)
        addTxLog(`Claim: Task #${taskId}`, 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        addNotification({ type: 'info', title: 'Claiming Task', message: `Claiming task #${taskId}...`, agentIcon: '🐝' })
        await tx.wait()
        addTxLog(`Claim: Task #${taskId}`, 'success', tx.hash, `Task #${taskId} claimed successfully.`)
        addNotification({ type: 'success', title: 'Task Claimed', message: `Task #${taskId} claimed.`, agentIcon: '🐝' })
        await refreshTasks()
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Claim: Task #${taskId}`, 'error', null, reason)
        addNotification({ type: 'error', title: 'Claim Failed', message: `claimTask failed: ${reason}`, agentIcon: '⚠️' })
      } finally {
        setIsLoading(false)
      }
    },
    [addNotification, addTxLog, refreshTasks]
  )

  // ── Submit result ─────────────────────────────────────────────────────────
  const handleSubmitResult = useCallback(
    async (taskId, resultURI) => {
      if (!contractRef.current) return
      setIsLoading(true)
      addTxLog(`Submit: Task #${taskId}`, 'pending', null, 'Confirm in MetaMask...')
      try {
        const tx = await contractRef.current.submitResult(taskId, resultURI)
        addTxLog(`Submit: Task #${taskId}`, 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        addNotification({ type: 'info', title: 'Submitting Result', message: `Task #${taskId} result submission in progress...`, agentIcon: '🐝' })
        await tx.wait()
        addTxLog(`Submit: Task #${taskId}`, 'success', tx.hash, `Result submitted for task #${taskId}.`)
        addNotification({ type: 'success', title: 'Result Submitted', message: `Task #${taskId} result submitted successfully.`, agentIcon: '🐝' })
        await refreshTasks()
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Submit: Task #${taskId}`, 'error', null, reason)
        addNotification({ type: 'error', title: 'Submission Failed', message: reason, agentIcon: '⚠️' })
      } finally {
        setIsLoading(false)
      }
    },
    [addNotification, addTxLog, refreshTasks]
  )

  // ── Approve and pay a task ────────────────────────────────────────────────
  const handleApprove = useCallback(
    async (taskId) => {
      if (!contractRef.current) return
      setIsLoading(true)
      addTxLog(`Approve: Task #${taskId}`, 'pending', null, 'Confirm in MetaMask...')
      try {
        const tx = await contractRef.current.approveAndPay(taskId)
        addTxLog(`Approve: Task #${taskId}`, 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        addNotification({ type: 'info', title: 'Approving Task', message: `Approving task #${taskId}...`, agentIcon: '🧠' })
        await tx.wait()
        addTxLog(`Approve: Task #${taskId}`, 'success', tx.hash, `Task #${taskId} approved — ${formatEth(await contractRef.current.tasks(taskId).then(t => t.reward))} ETH released to agent.`)
        addNotification({ type: 'success', title: 'Task Approved', message: `Task #${taskId} approved — reward released.`, agentIcon: '🧠' })
        await refreshTasks()
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Approve: Task #${taskId}`, 'error', null, reason)
        addNotification({ type: 'error', title: 'Approval Failed', message: `approveAndPay failed: ${reason}`, agentIcon: '⚠️' })
      } finally {
        setIsLoading(false)
      }
    },
    [addNotification, addTxLog, refreshTasks]
  )

  // ── Raise dispute ─────────────────────────────────────────────────────────
  const handleDispute = useCallback(
    async (taskId) => {
      if (!contractRef.current) return
      setIsLoading(true)
      addTxLog(`Dispute: Task #${taskId}`, 'pending', null, 'Confirm in MetaMask...')
      try {
        const tx = await contractRef.current.raiseDispute(taskId)
        addTxLog(`Dispute: Task #${taskId}`, 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        addNotification({ type: 'info', title: 'Raising Dispute', message: `Raising dispute on task #${taskId}...`, agentIcon: '⚠️' })
        await tx.wait()
        addTxLog(`Dispute: Task #${taskId}`, 'success', tx.hash, `Dispute raised on task #${taskId}. Manager will adjudicate.`)
        addNotification({ type: 'success', title: 'Dispute Raised', message: `Dispute raised on task #${taskId}.`, agentIcon: '⚠️' })
        await refreshTasks()
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Dispute: Task #${taskId}`, 'error', null, reason)
        addNotification({ type: 'error', title: 'Dispute Failed', message: `raiseDispute failed: ${reason}`, agentIcon: '⚠️' })
      } finally {
        setIsLoading(false)
      }
    },
    [addNotification, addTxLog, refreshTasks]
  )

  // ── Listen for account / chain changes ────────────────────────────────────
  useEffect(() => {
    let providerApi = null
    let onAccountsChanged = null
    let onChainChanged = null

    const run = async () => {
      const detected = await detectProvider()
      if (!detected) return
      providerApi = detected.provider

      onAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setWallet({ address: null, balance: '0', chainId: null })
          signerRef.current = null
          contractRef.current = null
          if (balanceIntervalRef.current) {
            clearInterval(balanceIntervalRef.current)
            balanceIntervalRef.current = null
          }
        } else {
          window.location.reload()
        }
      }

      onChainChanged = () => {
        window.location.reload()
      }

      providerApi.on('accountsChanged', onAccountsChanged)
      providerApi.on('chainChanged', onChainChanged)
    }

    run()

    return () => {
      if (providerApi && onAccountsChanged) {
        providerApi.removeListener('accountsChanged', onAccountsChanged)
      }
      if (providerApi && onChainChanged) {
        providerApi.removeListener('chainChanged', onChainChanged)
      }
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current)
        balanceIntervalRef.current = null
      }
    }
  }, [])

  // ── Auto-refresh tasks every 8 seconds ────────────────────────────────────
  useEffect(() => {
    if (!wallet.address) return
    const interval = setInterval(refreshTasks, 8000)
    return () => clearInterval(interval)
  }, [wallet.address, refreshTasks])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Sticky Navbar */}
      <Navbar
        wallet={wallet}
        walletSource={walletSource}
        onConnect={connectWallet}
        onConnectDev={connectDevWallet}
        onDisconnect={disconnectWallet}
        onRevoke={revokeConnection}
        onSwitchNetwork={switchNetwork}
        connecting={connecting}
      />

      {/* Wrong Network Banner */}
      {wallet.address && wallet.chainId !== 31337 && (
        <div className="bg-red-500/10 border-y border-red-500/20 py-3 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <p className="text-sm text-red-400">
              Warning: Connected to chain <strong>{wallet.chainId}</strong> — contract only exists on{' '}
              <strong>Hardhat Localhost (31337)</strong>. All transactions will fail.
            </p>
            <button
              onClick={switchNetwork}
              className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
            >
              Switch to Hardhat
            </button>
          </div>
        </div>
      )}

      {/* Zero Balance Warning */}
      {wallet.address && wallet.chainId === 31337 && parseFloat(wallet.balance) === 0 && (
        <div className="bg-yellow-500/10 border-y border-yellow-500/20 py-3 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-yellow-400">
              Warning: Connected account <strong>{shortenAddress(wallet.address)}</strong> has <strong>0 GO-ETH</strong>.
              Scroll to <strong>&quot;Hardhat Dev Accounts&quot;</strong> below, copy Account #0&apos;s private key,
              and import it into MetaMask (Account icon → Import Account).
            </p>
            <button
              onClick={revokeConnection}
              className="text-xs px-3 py-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-all cursor-pointer shrink-0"
            >
              Revoke → Reconnect
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8 relative z-10">
        {/* Hero Title */}
        <div data-animate>
          <HeroTitle />
        </div>

        {/* Swarm Visualizer */}
        <div data-animate data-animate-delay="1">
          <SwarmVisualizer tasks={tasks} formatEth={formatEth} STATUS_NAMES={STATUS_NAMES} />
        </div>

        {/* Human Command Deck */}
        <HumanCommandDeck
          onSubmitPrompt={handleSubmitPrompt}
          onOpenModal={() => setShowModal(true)}
          isLoading={isLoading}
          wallet={wallet}
          tasks={tasks}
          deploymentStartTime={deploymentStartTime}
        />

        {/* Transaction Activity Log */}
        <div data-animate data-animate-delay="3">
          <TxActivityLog transactions={txLog} />
        </div>

        {/* Swarm Activity Feed */}
        <div data-animate data-animate-delay="3">
          <SwarmActivityFeed tasks={tasks} transactions={txLog} />
        </div>

        {/* AI Console */}
        <div data-animate data-animate-delay="3">
          <AIConsole logs={txLog.map((tx) => ({
            agent: tx.step?.toLowerCase().includes('manager') ? 'Manager' : 'Worker',
            action: tx.step,
            timestamp: tx.timestamp,
            snippet: tx.message,
          }))} />
        </div>

        {/* Active Ledger Grid */}
        <ActiveLedgerGrid
          tasks={tasks}
          wallet={wallet}
          onClaimTask={handleClaimTask}
          onApprove={handleApprove}
          onDispute={handleDispute}
          onSubmitResult={handleSubmitResult}
          isLoading={isLoading}
          STATUS_COLORS={STATUS_COLORS}
          formatEth={formatEth}
        />

        {/* Manual Intervention Override */}
        <ManualInterventionOverride
          wallet={wallet}
          contract={getContractRef()}
          addTxLog={addTxLog}
        />

        {/* Hardhat Dev Accounts */}
        <div data-animate data-animate-delay="6">
          <HardhatDevAccounts wallet={wallet} onRequestAccountSwitch={handleSwitchAccount} />
        </div>
      </main>

      {/* Task Creation Modal */}
      <TaskCreationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onPostTask={handlePostTask}
        isLoading={isLoading}
      />

      {/* Decompose Confirm Modal */}
      <DecomposeConfirmModal
        tasks={decomposedTasks}
        isOpen={showConfirmModal}
        onConfirm={handleConfirmDeploy}
        onCancel={handleCancelDeploy}
      />

      {/* Advanced Notification Stack */}
      <AdvancedNotificationSystem />

      {/* Legacy Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
