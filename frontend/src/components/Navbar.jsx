import { Wallet, CircleDot, Shield, LogOut } from 'lucide-react'
import DevWalletPicker from './DevWalletPicker'

export default function Navbar({ wallet, walletSource, onConnect, onConnectDev, onDisconnect, onRevoke, onSwitchNetwork, connecting }) {
  const truncated = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null

  const isHardhat = wallet.chainId === 31337
  const isConnected = Boolean(wallet.address)

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-500/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.15)]">
            <Shield size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-cyan-400 tracking-widest uppercase leading-none">
              🐝 SwarmEscrow Protocol
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Autonomous M2M Escrow</p>
          </div>
        </div>

        {/* Wallet Pill */}
        {!isConnected ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onConnect}
              disabled={connecting}
              className="cyber-btn text-sm flex items-center gap-2"
            >
              {connecting ? (
                <span className="inline-block w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              ) : (
                <Wallet size={14} />
              )}
              {connecting ? 'Connecting...' : 'MetaMask'}
            </button>
            <DevWalletPicker onSelect={onConnectDev} connecting={connecting} />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Network / Source Badge */}
            {isHardhat ? (
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${walletSource === 'dev' ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-green-500/20 border-green-500/30 text-green-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${walletSource === 'dev' ? 'bg-purple-400' : 'bg-green-400'}`} />
                {walletSource === 'dev' ? 'Dev Wallet' : 'Hardhat Local'}
              </div>
            ) : (
              <button
                onClick={onSwitchNetwork}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                title="Click to switch to Hardhat Localhost"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                {wallet.chainId ? 'Wrong Network — Click to Switch' : 'Disconnected'}
              </button>
            )}

            {/* Address + Balance card */}
            <div className="cyber-card px-3 py-2 flex items-center gap-3">
              <CircleDot size={14} className="text-cyan-400/60 shrink-0" />
              <span className="text-sm font-mono text-cyan-400">{truncated}</span>
              <span className="text-xs text-slate-400">{wallet.balance} ETH</span>
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1 px-2 py-1 rounded hover:bg-slate-800"
                  title="Disconnect (local state only — MetaMask still remembers this site)"
                >
                  <LogOut size={12} className="inline" /> Disconnect
                </button>
              )}
              {onRevoke && (
                <button
                  onClick={onRevoke}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-1 px-2 py-1 rounded hover:bg-red-500/10"
                  title="Revoke MetaMask permission (forces fresh account picker next time)"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}