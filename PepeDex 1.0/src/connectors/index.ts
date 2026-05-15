import { Web3Provider } from '@ethersproject/providers'
import { InjectedConnector } from '@web3-react/injected-connector'
import { WalletLinkConnector } from '@web3-react/walletlink-connector'

import { NetworkConnector } from './NetworkConnector'

const NETWORK_URL = process.env.REACT_APP_NETWORK_URL

export const NETWORK_CHAIN_ID: number = parseInt(process.env.REACT_APP_CHAIN_ID ?? '369')

if (typeof NETWORK_URL === 'undefined') {
  throw new Error(`REACT_APP_NETWORK_URL must be a defined environment variable`)
}

export const network = new NetworkConnector({
  urls: { [NETWORK_CHAIN_ID]: NETWORK_URL }
})

let networkLibrary: Web3Provider | undefined
export function getNetworkLibrary(): Web3Provider {
  return (networkLibrary = networkLibrary ?? new Web3Provider(network.provider as any))
}

export const injected = new InjectedConnector({
  supportedChainIds: [369]
})

export type InjectedWalletKey =
  | 'metamask'
  | 'rabby'
  | 'internetmoney'
  | 'okx'
  | 'brave'
  | 'coinbase'
  | 'trust'
  | 'tokenpocket'
  | 'bitget'
  | 'safepal'
  | 'phantom'

const INJECTED_WALLET_LABELS: Record<InjectedWalletKey, string> = {
  metamask: 'MetaMask',
  rabby: 'Rabby Wallet',
  internetmoney: 'Internet Money Wallet',
  okx: 'OKX Wallet',
  brave: 'Brave Wallet',
  coinbase: 'Coinbase Wallet',
  trust: 'Trust Wallet',
  tokenpocket: 'TokenPocket',
  bitget: 'Bitget Wallet',
  safepal: 'SafePal Wallet',
  phantom: 'Phantom Wallet'
}

function getInjectedWalletKey(provider: any): InjectedWalletKey | null {
  if (!provider) return null

  if (provider.isRabby) return 'rabby'
  if (provider.isInternetMoney || provider.isInternetMoneyWallet || provider.isIMWallet) return 'internetmoney'
  if (provider.isOKXWallet || provider.isOkxWallet || provider.isOKExWallet || provider.isOkexWallet) return 'okx'
  if (provider.isBraveWallet || provider.isBrave) return 'brave'
  if (provider.isCoinbaseWalletExtension || provider.isCoinbaseWallet) return 'coinbase'
  if (provider.isTrust || provider.isTrustWallet) return 'trust'
  if (provider.isTokenPocket) return 'tokenpocket'
  if (provider.isBitgetWallet) return 'bitget'
  if (provider.isSafePal) return 'safepal'
  if (provider.isPhantom) return 'phantom'
  if (provider.isMetaMask && !provider.isBraveWallet && !provider.isRabby) return 'metamask'

  return null
}

function getCandidateInjectedProviders(): any[] {
  const win = window as any
  const candidates: any[] = []

  if (win.okxwallet) {
    candidates.push(win.okxwallet)
    if (win.okxwallet.ethereum) candidates.push(win.okxwallet.ethereum)
  }

  if (win.ethereum) {
    candidates.push(win.ethereum)
    if (Array.isArray(win.ethereum.providers)) {
      candidates.push(...win.ethereum.providers)
    }
  }

  if (win.braveEthereum) candidates.push(win.braveEthereum)
  if (win.braveWalletProvider) candidates.push(win.braveWalletProvider)
  if (win.rabby) candidates.push(win.rabby)

  const seen = new Set<any>()
  return candidates.filter(provider => {
    if (!provider || seen.has(provider)) return false
    seen.add(provider)
    return true
  })
}

function getDirectInjectedProviderByKey(key: InjectedWalletKey): any | null {
  const win = window as any

  if (key === 'okx') {
    return win.okxwallet?.ethereum ?? win.okxwallet ?? null
  }

  if (key === 'brave') {
    return win.braveEthereum ?? win.braveWalletProvider ?? null
  }

  if (key === 'rabby') {
    return win.rabby ?? null
  }

  return null
}

export function detectInjectedWalletKeys(): InjectedWalletKey[] {
  const detected: InjectedWalletKey[] = []
  const seen = new Set<InjectedWalletKey>()

  ;(['okx', 'brave', 'rabby'] as InjectedWalletKey[]).forEach(key => {
    if (!seen.has(key) && getDirectInjectedProviderByKey(key)) {
      seen.add(key)
      detected.push(key)
    }
  })

  getCandidateInjectedProviders().forEach(provider => {
    const key = getInjectedWalletKey(provider)
    if (key && !seen.has(key)) {
      seen.add(key)
      detected.push(key)
    }
  })

  const win = window as any
  if (!seen.has('brave') && (win.braveEthereum || win.braveWalletProvider)) {
    seen.add('brave')
    detected.push('brave')
  }

  return detected
}

export function findInjectedProviderByKey(key: InjectedWalletKey): any | null {
  const directProvider = getDirectInjectedProviderByKey(key)
  if (directProvider) {
    return directProvider
  }

  for (const provider of getCandidateInjectedProviders()) {
    const detectedKey = getInjectedWalletKey(provider)
    if (detectedKey === key) {
      return provider
    }
  }
  return null
}

export function detectInjectedWallet(): string | null {
  const detectedKeys = detectInjectedWalletKeys()
  if (detectedKeys.length > 0) {
    return INJECTED_WALLET_LABELS[detectedKeys[0]]
  }

  const ethereum = (window as any).ethereum
  if (!ethereum) return null

  return 'Injected Wallet'
}

// mainnet only
export const walletlink = new WalletLinkConnector({
  url: NETWORK_URL,
  appName: 'PEPE Dex',
  appLogoUrl:
    'https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/0x6982508145454Ce325dDbE47a25d4ec3d2311933.png'
})
