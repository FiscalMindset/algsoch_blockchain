import { ethers } from 'ethers'

// Hardhat deterministic accounts (first 20)
// Source: Hardhat's built-in test mnemonic "test test test test test test test test test test test junk"
export const DEV_ACCOUNTS = [
  { index: 0, address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', pk: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', label: 'Manager' },
  { index: 1, address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', pk: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', label: 'Worker 1' },
  { index: 2, address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', pk: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', label: 'Worker 2' },
  { index: 3, address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', pk: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', label: 'Worker 3' },
  { index: 4, address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', pk: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f27c8cc0bffa4', label: 'Worker 4' },
  { index: 5, address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', pk: '0x8b3a350cf5c34c9194ca8584a2d3426a76a05a5a38e362f1e2a131e99bb8b2e0', label: 'Worker 5' },
  { index: 6, address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', pk: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', label: 'Worker 6' },
  { index: 7, address: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955', pk: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', label: 'Worker 7' },
  { index: 8, address: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', pk: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', label: 'Worker 8' },
  { index: 9, address: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', pk: '0x2a871d0798f97d79848a013d4936a6bf4f591d49896e828c79192a7c5eb1d7f0', label: 'Worker 9' },
  { index: 10, address: '0xBcd4042DE499D14e55001CcbB24a551F3b954096', pk: '0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897', label: 'Worker 10' },
  { index: 11, address: '0x71bE63f3384f5fb98995898A86B02Fb2426c5788', pk: '0x701b615bbdfb9de65240f39ab576877e10d5f5a3c7e2c31a616944a1875c4330', label: 'Worker 11' },
  { index: 12, address: '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a', pk: '0x8a62605c595816d0fd5769fe11c92a7204069903f1af5866923c0ba0d93d8729', label: 'Worker 12' },
  { index: 13, address: '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec', pk: '0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8befa4a9a59', label: 'Worker 13' },
  { index: 14, address: '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097', pk: '0xc526ee95bf44d8fc405a158bb8d5a5aad19a8946c7eaa9dcc3fa61f53efc3214', label: 'Worker 14' },
  { index: 15, address: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71', pk: '0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e7ffbdec', label: 'Worker 15' },
  { index: 16, address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', pk: '0xea6c44ac03bff858b476bba40716402b03e41b8e97e8d01b1f8eb212bd512136', label: 'Worker 16' },
  { index: 17, address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', pk: '0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b077657b587b0b8c0a', label: 'Worker 17' },
  { index: 18, address: '0xdD870fA1b7C4700F2BD7f44238821C26f7392148', pk: '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0', label: 'Worker 18' },
  { index: 19, address: '0x583031D1113aD414F02576BD6afaBfb302140225', pk: '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', label: 'Worker 19' },
]

/**
 * Create an ethers Wallet (signer) from a Hardhat dev account index.
 * @param {number} index — 0-19
 * @param {ethers.Provider} provider — e.g. new ethers.JsonRpcProvider("http://127.0.0.1:8545")
 * @returns {ethers.Wallet}
 */
export function getDevSigner(index, provider) {
  const acc = DEV_ACCOUNTS[index]
  if (!acc) throw new Error(`Invalid dev account index: ${index}`)
  const wallet = new ethers.Wallet(acc.pk, provider)
  return wallet
}

/**
 * Create a read-only ethers Provider for Hardhat local.
 */
export function getHardhatProvider() {
  return new ethers.JsonRpcProvider('http://127.0.0.1:8545')
}
