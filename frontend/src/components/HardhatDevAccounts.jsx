import { useState } from 'react'
import { Copy, Eye, EyeOff, Check, ChevronDown, ChevronUp, RefreshCw, Info } from 'lucide-react'

const HARDHAT_ACCOUNTS = [
  { index: 0, address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', pk: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', label: 'Account #0' },
  { index: 1, address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', pk: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', label: 'Account #1' },
  { index: 2, address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', pk: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', label: 'Account #2' },
  { index: 3, address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', pk: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', label: 'Account #3' },
  { index: 4, address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', pk: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f27c8cc0bffa4', label: 'Account #4' },
  { index: 5, address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', pk: '0x8b3a350cf5c34c9194ca8584a2d3426a76a05a5a38e362f1e2a131e99bb8b2e0', label: 'Account #5' },
  { index: 6, address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', pk: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', label: 'Account #6' },
  { index: 7, address: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955', pk: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', label: 'Account #7' },
  { index: 8, address: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', pk: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', label: 'Account #8' },
  { index: 9, address: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', pk: '0x2a871d0798f97d79848a013d4936a6bf4f591d49896e828c79192a7c5eb1d7f0', label: 'Account #9' },
  { index: 10, address: '0xBcd4042DE499D14e55001CcbB24a551F3b954096', pk: '0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897', label: 'Account #10' },
  { index: 11, address: '0x71bE63f3384f5fb98995898A86B02Fb2426c5788', pk: '0x701b615bbdfb9de65240f39ab576877e10d5f5a3c7e2c31a616944a1875c4330', label: 'Account #11' },
  { index: 12, address: '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a', pk: '0x8a62605c595816d0fd5769fe11c92a7204069903f1af5866923c0ba0d93d8729', label: 'Account #12' },
  { index: 13, address: '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec', pk: '0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8befa4a9a59', label: 'Account #13' },
  { index: 14, address: '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097', pk: '0xc526ee95bf44d8fc405a158bb8d5a5aad19a8946c7eaa9dcc3fa61f53efc3214', label: 'Account #14' },
  { index: 15, address: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71', pk: '0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e7ffbdec', label: 'Account #15' },
  { index: 16, address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', pk: '0xea6c44ac03bff858b476bba40716402b03e41b8e97e8d01b1f8eb212bd512136', label: 'Account #16' },
  { index: 17, address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', pk: '0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b077657b587b0b8c0a', label: 'Account #17' },
  { index: 18, address: '0xdD870fA1b7C4700F2BD7f44238821C26f7392148', pk: '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0', label: 'Account #18' },
  { index: 19, address: '0x583031D1113aD414F02576BD6afaBfb302140225', pk: '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', label: 'Account #19' },
]

function CopyButton({ text, label, variant = 'default' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (variant === 'primary') {
    return (
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-all duration-200 shadow-sm"
        title={`Copy private key for ${label}`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy PK
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className="relative p-1.5 rounded-md bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/50 hover:border-cyan-500/40 transition-all duration-200 group"
      title={`Copy ${label}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
      )}
      {copied && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs bg-emerald-500/90 text-white rounded shadow-lg whitespace-nowrap animate-fade-in">
          Copied!
        </span>
      )}
    </button>
  )
}

function AccountCard({ account, isHighlighted, highlightColor, showPk, onTogglePk }) {
  const borderClass = isHighlighted
    ? highlightColor === 'cyan'
      ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.12)]'
      : 'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.12)]'
    : 'border-slate-800/50'

  const labelClass = isHighlighted ? (highlightColor === 'cyan' ? 'text-cyan-300' : 'text-purple-300') : 'text-slate-300'
  const indexClass = isHighlighted ? (highlightColor === 'cyan' ? 'text-cyan-400' : 'text-purple-400') : 'text-slate-500'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${borderClass} bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-200 flex-wrap`}>
      <div className="w-8 text-center shrink-0">
        <span className={`text-sm font-mono font-bold ${indexClass}`}>{account.index}</span>
      </div>

      <div className="w-28 shrink-0">
        <span className={`text-sm font-medium ${labelClass}`}>{account.label}</span>
        {isHighlighted && (
          <span className="ml-1.5 text-xs text-slate-600">★</span>
        )}
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <code className="text-xs font-mono text-slate-400 truncate">{account.address}</code>
        <CopyButton text={account.address} label="address" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 bg-slate-950/80 rounded-md px-2 py-1 border border-slate-800/50 max-w-48">
          {showPk ? (
            <code className="text-xs font-mono text-purple-400 truncate max-w-36">{account.pk}</code>
          ) : (
            <span className="text-xs font-mono text-slate-600 tracking-widest select-none">
              {'•'.repeat(20)}
            </span>
          )}
        </div>
        <button
          onClick={onTogglePk}
          className="p-1.5 rounded-md bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/50 hover:border-purple-500/40 transition-all duration-200"
          title={showPk ? 'Hide private key' : 'Show private key'}
        >
          {showPk ? (
            <EyeOff className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
        <CopyButton text={account.pk} label="private key" variant="primary" />
      </div>
    </div>
  )
}

export function HardhatDevAccounts({ wallet, onRequestAccountSwitch }) {
  const [showAll, setShowAll] = useState(false)
  const [revealedPks, setRevealedPks] = useState({})

  const DEFAULT_EXPANDED = 3
  const visibleAccounts = showAll ? HARDHAT_ACCOUNTS : HARDHAT_ACCOUNTS.slice(0, DEFAULT_EXPANDED)
  const hiddenCount = HARDHAT_ACCOUNTS.length - DEFAULT_EXPANDED

  const togglePk = (index) => {
    setRevealedPks((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const managerAccount = HARDHAT_ACCOUNTS[0]
  const agentAccount = HARDHAT_ACCOUNTS[1]

  return (
    <div className="rounded-xl border border-slate-800/50 bg-slate-950/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/80 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Hardhat Dev Accounts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Import into MetaMask to get 10,000 GO-ETH each. Click "Copy PK" to copy the private key.
              </p>
            </div>
          </div>

          {onRequestAccountSwitch && (
            <button
              onClick={onRequestAccountSwitch}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 hover:border-cyan-500/60 text-cyan-300 text-sm font-medium transition-all duration-200 shadow-sm shrink-0"
              title="Revoke site permissions so the next Connect shows the MetaMask account picker"
            >
              <RefreshCw className="w-4 h-4" />
              Switch MetaMask Account
            </button>
          )}
        </div>

        {/* How-to switch accounts */}
        {onRequestAccountSwitch && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-cyan-300/80 leading-relaxed">
              <strong>To switch accounts:</strong> Click "Switch MetaMask Account" above, then click
              "Connect Wallet" — MetaMask will show the account picker. Make sure the account you want
              is already imported into MetaMask (Settings → Security &amp; Privacy → Reveal seed phrase → Import account).
            </div>
          </div>
        )}

        {/* Manager / Agent quick-access row */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Manager Account (Account #0) */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20">
            <div className="shrink-0">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-sm font-bold text-cyan-400">
                M
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-cyan-300">Manager Account</div>
              <div className="text-xs text-slate-500 truncate font-mono">{managerAccount.address}</div>
            </div>
            <CopyButton text={managerAccount.pk} label="Manager private key" variant="primary" />
          </div>

          {/* Agent Account (Account #1) */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-500/30 bg-purple-950/20">
            <div className="shrink-0">
              <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-sm font-bold text-purple-400">
                A
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-purple-300">Agent Account</div>
              <div className="text-xs text-slate-500 truncate font-mono">{agentAccount.address}</div>
            </div>
            <CopyButton text={agentAccount.pk} label="Agent private key" variant="primary" />
          </div>
        </div>
      </div>

      {/* Column Headers (desktop only) */}
      <div className="hidden md:flex items-center gap-3 px-5 py-2 bg-slate-900/40 border-b border-slate-800/30 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <div className="w-8 text-center">#</div>
        <div className="w-28">Label</div>
        <div className="flex-1">Address</div>
        <div className="shrink-0">Private Key</div>
      </div>

      {/* Account List */}
      <div className="p-4 space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent md:hidden">
        {visibleAccounts.map((account) => {
          const isHighlighted = account.index <= 1
          const highlightColor = account.index === 0 ? 'cyan' : 'purple'
          return (
            <AccountCard
              key={account.index}
              account={account}
              isHighlighted={isHighlighted}
              highlightColor={highlightColor}
              showPk={!!revealedPks[account.index]}
              onTogglePk={() => togglePk(account.index)}
            />
          )
        })}
      </div>

      {/* Account Table (desktop) */}
      <div className="hidden md:block p-4 space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {visibleAccounts.map((account) => {
          const isHighlighted = account.index <= 1
          const highlightColor = account.index === 0 ? 'cyan' : 'purple'
          return (
            <AccountCard
              key={account.index}
              account={account}
              isHighlighted={isHighlighted}
              highlightColor={highlightColor}
              showPk={!!revealedPks[account.index]}
              onTogglePk={() => togglePk(account.index)}
            />
          )
        })}
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full py-3 px-5 flex items-center justify-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-slate-900/40 border-t border-slate-800/30 transition-all duration-200"
      >
        {showAll ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Show Less
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show All {HARDHAT_ACCOUNTS.length} Accounts ({hiddenCount} more)
          </>
        )}
      </button>
    </div>
  )
}

export default HardhatDevAccounts