import { useState, useEffect } from 'react'
import { Web3Provider } from '@ethersproject/providers'
import { ChainId } from '@uniswap/sdk'
import { useWeb3React as useWeb3ReactCore, useWeb3React } from '@web3-react/core'
import { Web3ReactContextInterface } from '@web3-react/core/dist/types'

import { injected, walletlink, findInjectedProviderByKey, InjectedWalletKey } from '../connectors'
import { NetworkContextName } from '../constants'

export const WALLET_CONNECTED_KEY = 'dextop.wallet.connected.v1'
export const WALLET_CONNECTOR_KEY = 'dextop.wallet.connector.v1'
export const WALLET_INJECTED_KEY = 'dextop.wallet.injected.v1'

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Gets the current active Web3 context.
 * Falls back to network context if no wallet is connected.
 */
export function useActiveWeb3React(): Web3ReactContextInterface<Web3Provider> & { chainId?: ChainId } {
  const context = useWeb3ReactCore<Web3Provider>()
  const contextNetwork = useWeb3ReactCore<Web3Provider>(NetworkContextName)
  return context.active ? context : contextNetwork
}

/**
 * Persist connection state in localStorage so we can reconnect on reload.
 */
export function usePersistConnection() {
  const { active } = useWeb3React()

  useEffect(() => {
    if (active) {
      localStorage.setItem(WALLET_CONNECTED_KEY, 'true')
    } else {
      localStorage.removeItem(WALLET_CONNECTED_KEY)
    }
  }, [active])
}

/**
 * Attempts to reconnect to wallet if the user was previously connected.
 */
export function useEagerConnect(): boolean {
  const { activate } = useWeb3ReactCore()
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setTried(true)
      return
    }

    // Mobile users should reconnect manually to avoid intrusive wallet popups.
    if (isMobileDevice()) {
      setTried(true)
      return
    }

    const isWalletConnected = localStorage.getItem(WALLET_CONNECTED_KEY) === 'true'
    const persistedConnector = localStorage.getItem(WALLET_CONNECTOR_KEY)
    const persistedInjectedKey = localStorage.getItem(WALLET_INJECTED_KEY) as InjectedWalletKey | null
    const hasEthereum = Boolean(window.ethereum)

    if (!isWalletConnected || !persistedConnector) {
      setTried(true)
      return
    }

    const restore = async () => {
      try {
        if (persistedConnector === 'walletlink') {
          await activate(walletlink, undefined, true)
          setTried(true)
          return
        }

        if (persistedConnector === 'injected' && hasEthereum) {
          if (persistedInjectedKey) {
            const selectedProvider = findInjectedProviderByKey(persistedInjectedKey)
            if (selectedProvider) {
              ;(injected as any).getProvider = async () => selectedProvider
              ;(injected as any).provider = selectedProvider
            }
          }

          await activate(injected, undefined, true)
          setTried(true)
          return
        }
      } catch {
        // Fails silently and allows manual connection later.
      }

      setTried(true)
    }

    restore()
  }, [activate])

  return tried
}

/**
 * Listens for changes in the connected wallet (network, account).
 * Automatically re-activates when those change.
 */
export function useInactiveListener(suppress = false) {
  const { active, error, activate } = useWeb3ReactCore()

  useEffect(() => {
    const { ethereum } = window

    if (!ethereum?.on || error || suppress) return

    const handleChainChanged = () => {
      console.debug('🔁 chainChanged detected')
      activate(injected, undefined, true).catch(err => {
        console.error('❌ Failed to activate after chainChanged', err)
      })
    }

    const handleAccountsChanged = (accounts: string[]) => {
      console.debug('🔁 accountsChanged detected', accounts)
      if (accounts.length > 0) {
        activate(injected, undefined, true).catch(err => {
          console.error('❌ Failed to activate after accountsChanged', err)
        })
      }
    }

    ethereum.on('chainChanged', handleChainChanged)
    ethereum.on('accountsChanged', handleAccountsChanged)

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('chainChanged', handleChainChanged)
        ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [active, error, suppress, activate])
}
