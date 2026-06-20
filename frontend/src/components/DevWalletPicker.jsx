import { useState } from 'react'
import { DEV_ACCOUNTS } from '../utils/devWallet'
import { Wallet, ChevronDown, ChevronUp, Check } from 'lucide-react'

export default function DevWalletPicker({ onSelect, connecting }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={connecting}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 hover:border-purple-500/60 text-purple-300 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wallet size={14} />
        Dev Wallet
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-96 overflow-y-auto rounded-xl bg-slate-900/95 border border-purple-500/30 shadow-2xl shadow-purple-900/20 backdrop-blur-md z-50 py-2">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-purple-400 font-semibold border-b border-purple-500/10">
            Hardhat Test Accounts — Pick one
          </div>
          {DEV_ACCOUNTS.map((acc) => (
            <button
              key={acc.index}
              onClick={() => {
                onSelect(acc.index)
                setOpen(false)
              }}
              disabled={connecting}
              className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-purple-500/10 transition-colors border-b border-slate-800/50 last:border-0 disabled:opacity-50"
            >
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  acc.index === 0
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : acc.index === 1
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
                }`}
              >
                {acc.index}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-200 font-medium truncate">
                  {acc.label}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {acc.address}
                </div>
              </div>
              {acc.index <= 1 && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                  10k ETH
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
