// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useState, useEffect } from 'react'
import ReactGA from 'react-ga'
import styled from 'styled-components'
import { isMobile } from 'react-device-detect'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import usePrevious from '../../hooks/usePrevious'
import { useWalletModalOpen, useWalletModalToggle } from '../../state/application/hooks'

import Modal from '../Modal'
import AccountDetails from '../AccountDetails'
import PendingView from './PendingView'
import Option from './Option'
import { SUPPORTED_WALLETS } from '../../constants'
import { ExternalLink } from '../../theme'
import MetamaskIcon from '../../assets/images/wallet.png'
import { ReactComponent as Close } from '../../assets/images/x.svg'
import { injected, detectInjectedWalletKeys, findInjectedProviderByKey, InjectedWalletKey } from '../../connectors'
import { WALLET_CONNECTED_KEY, WALLET_CONNECTOR_KEY, WALLET_INJECTED_KEY } from '../../hooks'
//import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { AbstractConnector } from '@web3-react/abstract-connector'

const CloseIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 14px;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const CloseColor = styled(Close)`
  path {
    stroke: ${({ theme }) => theme.text4};
  }
`

const Wrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  margin: 0;
  padding: 0;
  width: 100%;
  border: 3px solid ${({ theme }) => theme.text1};
`

const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${props => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`

const ContentWrapper = styled.div`
  background-color: ${({ theme }) => theme.bg2};
  padding: 2rem;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  ${({ theme }) => theme.mediaWidth.upToMedium`padding: 1rem`};
`
const TransparentLink = styled(ExternalLink)`
  display: inline-block;
  padding: 0px 7px;
  text-decoration: none;
  border: 2px solid ${({ theme }) => theme.text1};
  background-color: transparent;
  color: ${({ theme }) => theme.text1};
  font-family: 'Press Start 2P', system-ui, sans-serif;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.text2};
    color: ${({ theme }) => theme.text2};
  }
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const Blurb = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    margin: 1rem;
    font-size: 12px;
  `};
`

const OptionGrid = styled.div`
  display: grid;
  grid-gap: 12px;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    grid-gap: 12px;
  `};
`

const HoverText = styled.div`
  :hover {
    cursor: pointer;
  }
`

const WALLET_VIEWS = {
  OPTIONS: 'options',
  OPTIONS_SECONDARY: 'options_secondary',
  ACCOUNT: 'account',
  PENDING: 'pending'
}

function getReadableConnectionError(error: unknown): string {
  const err = error as { code?: number; name?: string; message?: string }
  const message = (err?.message || '').toLowerCase()

  if (err?.code === 4001 || message.includes('user rejected')) {
    return 'Connection request was rejected. Please approve the request in your wallet.'
  }

  if (err?.name === 'NoEthereumProviderError' || message.includes('no ethereum provider')) {
    return 'No compatible wallet extension was detected. Install a wallet and refresh this page.'
  }

  if (message.includes('already processing') || message.includes('pending request')) {
    return 'A wallet request is already pending. Open your wallet app/extension and complete it first.'
  }

  if (message.includes('unsupported chain') || message.includes('wrong network')) {
    return 'Wrong network selected. Please switch to PulseChain and try again.'
  }

  return 'Could not connect to wallet. Ensure your wallet is unlocked, then try again.'
}

export default function WalletModal({
  pendingTransactions,
  confirmedTransactions,
  ENSName
}: {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
}) {
  // important that these are destructed from the account-specific web3-react context
  const { active, account, connector, activate, error } = useWeb3React()

  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)

  const [pendingWallet, setPendingWallet] = useState<AbstractConnector | undefined>()
  const [pendingWalletKey, setPendingWalletKey] = useState<string | undefined>()

  const [pendingError, setPendingError] = useState<boolean>()

  const walletModalOpen = useWalletModalOpen()
  const toggleWalletModal = useWalletModalToggle()

  const previousAccount = usePrevious(account)
  const readableConnectionError = getReadableConnectionError(error)

  // close on connection, when logged out before
  useEffect(() => {
    if (account && !previousAccount && walletModalOpen) {
      toggleWalletModal()
    }
  }, [account, previousAccount, toggleWalletModal, walletModalOpen])

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setPendingWalletKey(undefined)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  // close modal when a connection is successful
  const activePrevious = usePrevious(active)
  const connectorPrevious = usePrevious(connector)
  useEffect(() => {
    if (walletModalOpen && ((active && !activePrevious) || (connector && connector !== connectorPrevious && !error))) {
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [setWalletView, active, error, connector, walletModalOpen, activePrevious, connectorPrevious])

  const tryActivation = async (
    connector: AbstractConnector | { activate: () => Promise<any> } | undefined,
    walletKey?: string,
    injectedKey?: string
  ) => {
    if (!connector) {
      console.warn('No connector provided')
      return
    }

    const selectedWalletName = walletKey ? SUPPORTED_WALLETS[walletKey]?.name : undefined
    let name = selectedWalletName ?? ''

    if (!name) {
      Object.keys(SUPPORTED_WALLETS).forEach(key => {
        if (connector === SUPPORTED_WALLETS[key].connector) {
          name = SUPPORTED_WALLETS[key].name
        }
      })
    }

    ReactGA.event({
      category: 'Wallet',
      action: 'Change Wallet',
      label: name || 'Unknown Wallet'
    })

    const resolvedInjectedKey = injectedKey ?? (walletKey ? SUPPORTED_WALLETS[walletKey]?.injectedKey : undefined)

    if (connector === injected && resolvedInjectedKey) {
      const selectedProvider = findInjectedProviderByKey(resolvedInjectedKey as InjectedWalletKey)
      if (!selectedProvider) {
        setPendingError(true)
        return
      }

      // Bind the selected provider directly to the injected connector.
      ;(connector as any).getProvider = async () => selectedProvider
      ;(connector as any).provider = selectedProvider
    }

    setPendingWallet(connector as AbstractConnector)
    setPendingWalletKey(walletKey)
    setWalletView(WALLET_VIEWS.PENDING)

    try {
      if (connector === injected) {
        await activate(connector as AbstractConnector, undefined, true)
        localStorage.setItem(WALLET_CONNECTED_KEY, 'true')
        localStorage.setItem(WALLET_CONNECTOR_KEY, 'injected')
        if (resolvedInjectedKey) {
          localStorage.setItem(WALLET_INJECTED_KEY, resolvedInjectedKey)
        } else {
          localStorage.removeItem(WALLET_INJECTED_KEY)
        }
        return
      }

      if ('activate' in connector && typeof connector.activate === 'function' && !('getProvider' in connector)) {
        const provider = await connector.activate()
        await activate(provider)
      } else if ('getProvider' in connector) {
        await activate(connector as AbstractConnector, undefined, true)
      }

      if (connector !== injected) {
        localStorage.setItem(WALLET_CONNECTED_KEY, 'true')
        localStorage.removeItem(WALLET_INJECTED_KEY)
        if (connector === (SUPPORTED_WALLETS.WALLET_LINK?.connector as AbstractConnector | undefined)) {
          localStorage.setItem(WALLET_CONNECTOR_KEY, 'walletlink')
        } else {
          localStorage.setItem(WALLET_CONNECTOR_KEY, 'external')
        }
      }
    } catch (error) {
      if (error instanceof UnsupportedChainIdError && 'getProvider' in connector) {
        await activate(connector as AbstractConnector)
      } else {
        console.error('Activation error', error)
        setPendingError(true)
      }
    }
  }

  // get wallets user can switch too, depending on device/browser
  function getOptions() {
    const hasInjectedProvider = Boolean((window as any).web3 || (window as any).ethereum || (window as any).okxwallet)
    const detectedInjectedKeys = detectInjectedWalletKeys()

    return Object.keys(SUPPORTED_WALLETS)
      .map(key => ({ key, option: SUPPORTED_WALLETS[key] }))
      .filter(({ option, key }) => {
        if (!isMobile && option.mobileOnly) return false
        if (isMobile && !option.mobile && !option.mobileOnly && option.connector !== injected) return false

        if (option.connector === injected && option.injectedKey && !detectedInjectedKeys.includes(option.injectedKey as any)) {
          return false
        }

        if (key === 'INJECTED_FALLBACK' && detectedInjectedKeys.length > 0) {
          return false
        }

        return true
      })
      .map(({ key, option }) => {
        if (option.connector === injected && !hasInjectedProvider && key !== 'INJECTED_FALLBACK') {
          return null
        }

        if (key === 'INJECTED_FALLBACK' && !hasInjectedProvider) {
          return (
            <Option
              id={`connect-${key}`}
              key={key}
              color={'#E8831D'}
              header={'Install a Wallet'}
              subheader={'No injected wallet detected on this device'}
              link={'https://internetmoney.io/'}
              icon={MetamaskIcon}
            />
          )
        }

        const subheader = option.connector === injected && hasInjectedProvider ? 'Installed on this device' : option.description

        return (
          <Option
            id={`connect-${key}`}
            onClick={() => {
              option.connector === connector
                ? setWalletView(WALLET_VIEWS.ACCOUNT)
                : !option.href && tryActivation(option.connector, key, option.injectedKey)
            }}
            key={key}
            active={option.connector === connector && (!option.injectedKey || detectedInjectedKeys.includes(option.injectedKey as any))}
            color={option.color}
            link={option.href}
            header={option.name}
            subheader={subheader}
            icon={require('../../assets/images/' + option.iconName)}
          />
        )
      })
      .filter(Boolean)
  }

  function getModalContent() {
    if (error) {
      return (
        <UpperSection>
          <CloseIcon onClick={toggleWalletModal}>
            <CloseColor />
          </CloseIcon>
          <HeaderRow>{error instanceof UnsupportedChainIdError ? 'Wrong Network' : 'Error connecting'}</HeaderRow>
          <ContentWrapper>
            {error instanceof UnsupportedChainIdError ? (
              <>
                <h5>Please connect to the appropriate PulseChain network.</h5>
                <button
                  onClick={async () => {
                    const ethereum = (window as any).ethereum
                    if (!ethereum) {
                      alert('Web3 wallet not found')
                      return
                    }

                    try {
                      await ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x171' }]
                      })
                    } catch (switchError) {
                      const err = switchError as { code?: number; message?: string }

                      // Error code 4902 = chain not added, -32603 = unrecognized chain ID
                      // Both cases require adding the chain first
                      if (err.code === 4902 || err.code === -32603 || (err.message && err.message.includes('Unrecognized chain ID'))) {
                        try {
                          await ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                              {
                                chainId: '0x171',
                                chainName: 'PulseChain',
                                nativeCurrency: {
                                  name: 'Pulse',
                                  symbol: 'PLS',
                                  decimals: 18
                                },
                                rpcUrls: ['https://rpc.pulsechain.com', 'https://rpc-pulsechain.g4mm4.io'],
                                blockExplorerUrls: ['https://scan.pulsechain.com']
                              }
                            ]
                          })
                          // After adding, try switching again
                          await ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: '0x171' }]
                          })
                        } catch (addError) {
                          console.error('Failed to add/switch PulseChain:', addError)
                          alert('Failed to switch to PulseChain. Please add it manually in your wallet settings.')
                        }
                      } else {
                        console.error('Unexpected wallet error:', switchError)
                        alert('Failed to switch network. Please check your wallet.')
                      }
                    }
                  }}
                >
                  Switch to PulseChain
                </button>
              </>
            ) : (
              <>
                <h5>{readableConnectionError}</h5>
                <h5>If this continues, close wallet popups, refresh, and try connecting again.</h5>
              </>
            )}
          </ContentWrapper>
        </UpperSection>
      )
    }

    if (account && walletView === WALLET_VIEWS.ACCOUNT) {
      return (
        <AccountDetails
          toggleWalletModal={toggleWalletModal}
          pendingTransactions={pendingTransactions}
          confirmedTransactions={confirmedTransactions}
          ENSName={ENSName}
          openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
        />
      )
    }
    return (
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <CloseColor />
        </CloseIcon>
        {walletView === WALLET_VIEWS.PENDING ? (
          <HeaderRow>Connecting wallet</HeaderRow>
        ) : walletView !== WALLET_VIEWS.ACCOUNT ? (
          <HeaderRow color="blue">
            <HoverText
              onClick={() => {
                setPendingError(false)
                setWalletView(WALLET_VIEWS.ACCOUNT)
              }}
            >
              Back
            </HoverText>
          </HeaderRow>
        ) : (
          <HeaderRow>
            <HoverText>Connect to a wallet</HoverText>
          </HeaderRow>
        )}
        <ContentWrapper>
          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView
              connector={pendingWallet}
              walletKey={pendingWalletKey}
              error={pendingError}
              setPendingError={setPendingError}
              tryActivation={connector => tryActivation(connector, pendingWalletKey, SUPPORTED_WALLETS[pendingWalletKey || '']?.injectedKey)}
            />
          ) : (
            <OptionGrid>{getOptions()}</OptionGrid>
          )}
          {walletView !== WALLET_VIEWS.PENDING && (
            <Blurb>
              <span>New to PulseChain? &nbsp;</span>{' '}
              <span>
                <br></br>&nbsp;
              </span>{' '}
              <span>
                <br></br>
                <br></br> &nbsp;
              </span>{' '}
              <TransparentLink href="https://internetmoney.io/">
                <h6>Learn more about wallets</h6>
              </TransparentLink>
            </Blurb>
          )}
        </ContentWrapper>
      </UpperSection>
    )
  }

  return (
    <Modal isOpen={walletModalOpen} onDismiss={toggleWalletModal} minHeight={false} maxHeight={90}>
      <Wrapper>{getModalContent()}</Wrapper>
    </Modal>
  )
}
