import { useState, useEffect, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import { getContract, getTasks, STATUS_NAMES, STATUS_COLORS, formatEth, detectProvider } from './utils/contracts'
import { getDevSigner, getHardhatProvider } from './utils/devWallet'
import { Shield, Zap, AlertTriangle, CheckCircle2, X, Radar } from 'lucide-react'

import Navbar from './components/Navbar'
import TaskCreationModal from './components/TaskCreationModal'
import ActiveLedgerGrid from './components/ActiveLedgerGrid'
import SwarmVisualizer from './components/SwarmVisualizer'
import HardhatDevAccounts from './components/HardhatDevAccounts'
import TxActivityLog from './components/TxActivityLog'
import DevWalletPicker from './components/DevWalletPicker'
import ParticleBackground from './components/ParticleBackground'

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
          // Show cursor for 2 seconds then hide
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
            // Stagger children
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

// ─── Toast Container ──────────────────────────────────────────────────────────
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
      {/* Fallback static text for no-JS */}
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

function HumanCommandDeck({ onSubmitPrompt, onOpenModal, isLoading, wallet, deploymentStep }) {
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

      {/* Deployment progress area */}
      {isLoading && deploymentStep && (
        <div className="mt-4 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
          <p className="text-sm text-cyan-300 font-medium">{deploymentStep}</p>
        </div>
      )}

      {!wallet.address && (
        <p className="mt-3 text-xs text-slate-600">
          Connect your wallet to interact with the swarm.
        </p>
      )}
    </section>
  )
}

// ─── Manual Intervention Override ────────────────────────────────────────────
function ManualInterventionOverride({ wallet, contract, addToast, addTxLog }) {
  const [targetTaskId, setTargetTaskId] = useState('')
  const [resultURI, setResultURI] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const doAction = async (action, taskId) => {
    if (!contract) {
      addToast({ type: 'error', message: 'Wallet not connected.' })
      return
    }
    const txId = `${action}-${taskId}-${Date.now()}`
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
      addToast({ type: 'info', message: `Mining ${action}... tx: ${tx.hash.slice(0, 10)}...` })
      await tx.wait()
      addTxLog(taskLabel, 'success', tx.hash, `${action} confirmed on-chain.`)
      addToast({ type: 'success', message: `${action} confirmed on-chain.` })
    } catch (err) {
      if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
        addTxLog(taskLabel, 'error', null, 'Transaction rejected by user.')
        addToast({ type: 'error', message: 'Transaction rejected by user.' })
      } else {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(taskLabel, 'error', null, reason)
        addToast({ type: 'error', message: `${action} failed: ${reason}` })
      }
    } finally {
      setActionLoading('')
    }
  }

  const handlePostTask = async () => {
    if (!contract) {
      addToast({ type: 'error', message: 'Wallet not connected.' })
      return
    }
    const txId = `postTask-manual-${Date.now()}`
    addTxLog('Manual Post Task', 'pending', null, 'Confirm in MetaMask...')
    try {
      setActionLoading('postTask')
      const metadataURI = 'ipfs://mock-metadata/' + Date.now()
      const value = ethers.parseEther('0.01')
      const tx = await contract.postTask(metadataURI, { value })
      addTxLog('Manual Post Task', 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
      addToast({ type: 'info', message: `Posting task... tx: ${tx.hash.slice(0, 10)}...` })
      await tx.wait()
      addTxLog('Manual Post Task', 'success', tx.hash, 'Task posted and 0.01 ETH locked in escrow.')
      addToast({ type: 'success', message: 'Task posted and locked in escrow.' })
    } catch (err) {
      if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
        addTxLog('Manual Post Task', 'error', null, 'Transaction rejected by user.')
        addToast({ type: 'error', message: 'Transaction rejected by user.' })
      } else {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog('Manual Post Task', 'error', null, reason)
        addToast({ type: 'error', message: `postTask failed: ${reason}` })
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
  const [wallet, setWallet] = useState({ address: null, balance: '0', chainId: null })
  const [walletSource, setWalletSource] = useState(null) // 'metamask' | 'dev' | null
  const [tasks, setTasks] = useState([])
  const [toasts, setToasts] = useState([])
  const [txLog, setTxLog] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deploymentStep, setDeploymentStep] = useState(null)

  const providerRef = useRef(null)
  const signerRef = useRef(null)
  const contractRef = useRef(null)
  const balanceIntervalRef = useRef(null)

  // Initialize section reveal animations
  useSectionReveal()

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

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
      setTasks(onChainTasks)
    } catch (err) {
      // Silently skip refresh failures — wallet may be disconnected
    }
  }, [])

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
        addToast({
          type: 'error',
          message:
            'MetaMask not detected.\n\n' +
            '1. Make sure you are using http://localhost:5173 (NOT the IP address)\n' +
            '2. Use a normal browser window, NOT Incognito / Private\n' +
            '3. Disable conflicting wallets (Coinbase, Phantom, Trust)\n' +
            '4. Refresh the page after installing MetaMask.',
        })
        setConnecting(false)
        return
      }

      const provider = new ethers.BrowserProvider(detected.provider)
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      // Auto-prompt to switch if on wrong chain
      if (chainId !== 31337) {
        addToast({
          type: 'warning',
          message:
            `Connected on chain ${chainId} — switching to Hardhat Localhost (31337)...`,
        })
        try {
          await detected.provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }],
          })
          // After successful switch, reload so we get a clean state on the new chain
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

      addToast({ type: 'success', message: `Connected: ${address.slice(0, 10)}...` })

      // Start balance polling
      balanceIntervalRef.current = setInterval(pollBalance, 10000)

      // Refresh tasks on connect
      await refreshTasks()
    } catch (err) {
      if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
        addToast({ type: 'error', message: 'MetaMask connection rejected.' })
      } else {
        addToast({ type: 'error', message: `Connection failed: ${err.message}` })
      }
    } finally {
      setConnecting(false)
    }
  }, [addToast, pollBalance, refreshTasks])

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
    addToast({ type: 'info', message: 'Wallet disconnected.' })
  }, [addToast])

  // ── Connect using dev wallet (pick from Hardhat accounts directly) ─────────
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

      addToast({
        type: 'success',
        message: `Dev Account #${index} connected: ${address.slice(0, 10)}...`,
      })

      await refreshTasks()
    } catch (err) {
      addToast({ type: 'error', message: `Dev wallet connect failed: ${err.message}` })
    } finally {
      setConnecting(false)
    }
  }, [addToast, refreshTasks])

  // ── Revoke MetaMask site permission (fresh re-connect next time) ──────────
  const revokeConnection = useCallback(async () => {
    try {
      const detected = await detectProvider()
      if (detected?.provider) {
        try {
          // EIP-7715 / MetaMask revoke
          await detected.provider.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          })
        } catch {
          // Fallback: some wallets don't support revoke — just disconnect
        }
      }
    } catch {
      // ignore
    }
    // Always clear local state
    disconnectWallet()
    addToast({
      type: 'success',
      message: 'MetaMask connection revoked. Next Connect will show the account picker.',
    })
  }, [disconnectWallet, addToast])

  // ── Switch MetaMask Account ────────────────────────────────────────────────
  const handleSwitchAccount = useCallback(async () => {
    setTxLog([])
    await revokeConnection()
    addToast({
      type: 'success',
      message:
        'Site permissions revoked. Click "Connect Wallet" and select your imported Hardhat account from the picker.',
    })
  }, [revokeConnection, addToast])

  // ── Request network switch to Hardhat Localhost ────────────────────────────
  const switchNetwork = useCallback(async () => {
    try {
      const detected = await detectProvider()
      if (!detected) {
        addToast({ type: 'error', message: 'No wallet found to switch network.' })
        return
      }
      const provider = detected.provider
      // Try switching first
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }], // 31337 in hex
        })
      } catch (switchError) {
        // Chain not added — add it
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
      addToast({ type: 'success', message: 'Switched to Hardhat Localhost.' })
    } catch (err) {
      if (err.code === 4001) {
        addToast({ type: 'error', message: 'Network switch rejected.' })
      } else {
        addToast({ type: 'error', message: `Switch failed: ${err.message}` })
      }
    }
  }, [addToast])

  // ── Post a single task with value (used by TaskCreationModal) ───────────
  const handlePostTask = useCallback(
    async (goal, metadataURI) => {
      if (!contractRef.current) {
        addToast({ type: 'error', message: 'Wallet not connected.' })
        return
      }
      addTxLog('Mission Control: Post Task', 'pending', null, 'Confirm in MetaMask...')
      const value = ethers.parseEther('0.05')
      try {
        const tx = await contractRef.current.postTask(metadataURI, { value })
        addTxLog('Mission Control: Post Task', 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        addToast({ type: 'info', message: `Posting task... tx: ${tx.hash.slice(0, 10)}...` })
        await tx.wait()
        addTxLog('Mission Control: Post Task', 'success', tx.hash, 'Task posted: 0.05 ETH locked in escrow.')
        addToast({ type: 'success', message: 'Task posted: 0.05 ETH locked in escrow.' })
      } catch (err) {
        if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
          addTxLog('Mission Control: Post Task', 'error', null, 'Transaction rejected by user.')
          addToast({ type: 'error', message: 'Transaction rejected by user.' })
        } else {
          const reason = err.reason || err.message || 'Unknown error'
          addTxLog('Mission Control: Post Task', 'error', null, reason)
          addToast({ type: 'error', message: `Failed: ${reason}` })
        }
      }
    },
    [addToast, addTxLog]
  )

  // ── Submit prompt → post one task ─────────────────────────────────────────
  const handleSubmitPrompt = useCallback(
    async (prompt) => {
      if (!contractRef.current) {
        addToast({ type: 'error', message: 'Wallet not connected.' })
        return
      }
      setIsLoading(true)
      setDeploymentStep('Preparing transaction...')

      const metadataURI = `ipfs://task-meta/${btoa(prompt).slice(0, 40)}`
      const value = ethers.parseEther('0.05')

      try {
        setDeploymentStep('Waiting for MetaMask confirmation...')
        addTxLog('Deploy: Prepare', 'pending', null, 'Transaction prepared, awaiting MetaMask confirmation...')

        const tx = await contractRef.current.postTask(metadataURI, { value })
        addTxLog('Deploy: Submit to Chain', 'pending', tx.hash, `Mining on-chain... ${tx.hash.slice(0, 10)}...`)
        setDeploymentStep('Mining transaction on-chain...')
        addToast({ type: 'info', message: `Posting task... tx: ${tx.hash.slice(0, 10)}...` })

        await tx.wait()
        addTxLog('Deploy: Confirm', 'success', tx.hash, 'Task deployed: 0.05 ETH locked in escrow. Swarm agents can now claim it.')
        addToast({ type: 'success', message: `Goal deployed: 0.05 ETH locked in escrow.` })
        setDeploymentStep(null)
        await refreshTasks()
      } catch (err) {
        if (err.code === 4001 || err.reason === 'ACTION_REJECTED') {
          addTxLog('Deploy: Submit', 'error', null, 'Transaction rejected by user in MetaMask.')
          addToast({ type: 'error', message: 'Transaction rejected by user.' })
        } else {
          const reason = err.reason || err.message || 'Unknown error'
          addTxLog('Deploy: Submit', 'error', null, reason)
          addToast({ type: 'error', message: `Failed to deploy: ${reason}` })
        }
        setDeploymentStep(null)
      } finally {
        setIsLoading(false)
      }
    },
    [addToast, addTxLog, refreshTasks]
  )

  // ── Claim a task ──────────────────────────────────────────────────────────
  const handleClaimTask = useCallback(
    async (taskId) => {
      if (!contractRef.current) return
      setIsLoading(true)
      addTxLog(`Claim: Task #${taskId}`, 'pending', null, 'Confirm in MetaMask...')
      try {
        const tx = await contractRef.current.claimTask(taskId)
        addTxLog(`Claim: Task #${taskId}`, 'pending', tx.hash, `Mining... ${tx.hash.slice(0, 10)}...`)
        addToast({ type: 'info', message: `Claiming task #${taskId}...` })
        await tx.wait()
        addTxLog(`Claim: Task #${taskId}`, 'success', tx.hash, `Task #${taskId} claimed successfully.`)
        addToast({ type: 'success', message: `Task #${taskId} claimed.` })
        await refreshTasks()
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Claim: Task #${taskId}`, 'error', null, reason)
        addToast({ type: 'error', message: `claimTask failed: ${reason}` })
      } finally {
        setIsLoading(false)
      }
    },
    [addToast, addTxLog, refreshTasks]
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
        addToast({ type: 'info', message: `Approving task #${taskId}...` })
        await tx.wait()
        addTxLog(`Approve: Task #${taskId}`, 'success', tx.hash, `Task #${taskId} approved — 0.05 ETH released to agent.`)
        addToast({ type: 'success', message: `Task #${taskId} approved — reward released.` })
        await refreshTasks()
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Approve: Task #${taskId}`, 'error', null, reason)
        addToast({ type: 'error', message: `approveAndPay failed: ${reason}` })
      } finally {
        setIsLoading(false)
      }
    },
    [addToast, addTxLog, refreshTasks]
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
        addToast({ type: 'info', message: `Raising dispute on task #${taskId}...` })
        await tx.wait()
        addTxLog(`Dispute: Task #${taskId}`, 'success', tx.hash, `Dispute raised on task #${taskId}. Manager will adjudicate.`)
        addToast({ type: 'success', message: `Dispute raised on task #${taskId}.` })
        await refreshTasks()
      } catch (err) {
        const reason = err.reason || err.message || 'Unknown error'
        addTxLog(`Dispute: Task #${taskId}`, 'error', null, reason)
        addToast({ type: 'error', message: `raiseDispute failed: ${reason}` })
      } finally {
        setIsLoading(false)
      }
    },
    [addToast, addTxLog, refreshTasks]
  )

  // ── Listen for account / chain changes ────────────────────────────────────
  // Attach ONCE on mount to avoid stacking duplicate listeners.
  // Handlers must sit at top-level of effect so cleanup references match.
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
          // Graceful disconnect — do NOT call disconnectWallet (unstable ref)
          setWallet({ address: null, balance: '0', chainId: null })
          signerRef.current = null
          contractRef.current = null
          if (balanceIntervalRef.current) {
            clearInterval(balanceIntervalRef.current)
            balanceIntervalRef.current = null
          }
        } else {
          // MetaMask docs recommend full reload on account change
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

      {/* Zero Balance Warning (Hardhat but no ETH) */}
      {wallet.address && wallet.chainId === 31337 && parseFloat(wallet.balance) === 0 && (
        <div className="bg-yellow-500/10 border-y border-yellow-500/20 py-3 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-yellow-400">
              Warning: Connected account <strong>{wallet.address.slice(0, 8)}...</strong> has <strong>0 GO-ETH</strong>.
              Scroll to <strong>"Hardhat Dev Accounts"</strong> below, copy Account #0's private key,
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
        {/* Hero Title with Typing Animation */}
        <div data-animate>
          <HeroTitle />
        </div>

        {/* Section 1: Swarm Visualizer */}
        <div data-animate data-animate-delay="1">
          <SwarmVisualizer tasks={tasks} formatEth={formatEth} STATUS_NAMES={STATUS_NAMES} />
        </div>

        {/* Section 2: Human Command Deck */}
        <HumanCommandDeck
          onSubmitPrompt={handleSubmitPrompt}
          onOpenModal={() => setShowModal(true)}
          isLoading={isLoading}
          wallet={wallet}
          deploymentStep={deploymentStep}
        />

        {/* Section 3: Transaction Activity Log */}
        <div data-animate data-animate-delay="3">
          <TxActivityLog transactions={txLog} />
        </div>

        {/* Section 4: The Immutable Swarm Ledger */}
        <ActiveLedgerGrid
          tasks={tasks}
          wallet={wallet}
          onClaimTask={handleClaimTask}
          onApprove={handleApprove}
          onDispute={handleDispute}
          isLoading={isLoading}
          STATUS_NAMES={STATUS_NAMES}
          STATUS_COLORS={STATUS_COLORS}
          formatEth={formatEth}
        />

        {/* Section 5: Manual Intervention Override */}
        <ManualInterventionOverride
          wallet={wallet}
          contract={getContractRef()}
          addToast={addToast}
          addTxLog={addTxLog}
        />

        {/* Section 6: Hardhat Dev Accounts */}
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}