// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useContext, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled, { ThemeContext } from 'styled-components'
import { useWeb3React } from '@web3-react/core'
import { useActiveWeb3React } from '../../hooks'
import { WALLET_CONNECTED_KEY, WALLET_CONNECTOR_KEY, WALLET_INJECTED_KEY } from '../../hooks'
import { useTokenContract } from '../../hooks/useContract'
import { AppDispatch } from '../../state'
import { clearAllTransactions } from '../../state/transactions/actions'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { shortenAddress } from '../../utils'
import { calculateGasMargin, getHigherGasPrice } from '../../utils'
import { AutoRow } from '../Row'
import Copy from './Copy'
import Transaction from './Transaction'

import { SUPPORTED_WALLETS } from '../../constants'
import { ReactComponent as Close } from '../../assets/images/x.svg'
import { getEtherscanLink } from '../../utils'
import { injected, walletlink, detectInjectedWallet } from '../../connectors'
import CoinbaseWalletIcon from '../../assets/images/coinbaseWalletIcon.svg'
import Identicon from '../Identicon'
import { ButtonSecondary } from '../Button'
import { ExternalLink as LinkIcon } from 'react-feather'
import { ExternalLink, LinkStyledButton, TYPE } from '../../theme'

const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${props => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
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

const InfoCard = styled.div`
  padding: 1rem;
  border: 2px solid ${({ theme }) => theme.text1};
  border-radius: 5px;
  position: relative;
  display: grid;
  grid-row-gap: 12px;
  margin-bottom: 20px;
`

const AccountGroupingRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  justify-content: space-between;
  align-items: center;
  font-weight: 400;
  color: ${({ theme }) => theme.text1};

  div {
    ${({ theme }) => theme.flexRowNoWrap}
    align-items: center;
  }
`

const AccountSection = styled.div`
  background-color: ${({ theme }) => theme.bg1};
  padding: 0rem 1rem;
  ${({ theme }) => theme.mediaWidth.upToMedium`padding: 0rem 1rem 1.5rem 1rem;`};
`

const YourAccount = styled.div`
  h5 {
    margin: 0 0 1rem 0;
    font-weight: 400;
  }

  h4 {
    margin: 0;
    font-weight: 500;
  }
`

const LowerSection = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  padding: 1.5rem;
  flex-grow: 1;
  overflow: auto;
  background-color: ${({ theme }) => theme.bg1};
  border-bottom-left-radius: 25px;
  border-bottom-right-radius: 20px;

  h5 {
    margin: 0;
    font-weight: 400;
    color: ${({ theme }) => theme.text1};
  }
`

const AccountControl = styled.div`
  display: flex;
  justify-content: space-between;
  min-width: 0;
  width: 100%;

  font-weight: 500;
  font-size: 1.25rem;

  a:hover {
    text-decoration: underline;
  }

  p {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const AddressLink = styled(ExternalLink)<{ hasENS: boolean; isENS: boolean }>`
  font-size: 0.825rem;
  color: ${({ theme }) => theme.text1};
  margin-left: 1rem;
  font-size: 0.825rem;
  display: flex;
  :hover {
    color: ${({ theme }) => theme.text1};
  }
`

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

const WalletName = styled.div`
  width: initial;
  font-size: 0.825rem;
  font-weight: 500;
  color: ${({ theme }) => theme.text3};
`

const IconWrapper = styled.div<{ size?: number }>`
  ${({ theme }) => theme.flexColumnNoWrap};
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  & > img,
  span {
    height: ${({ size }) => (size ? size + 'px' : '32px')};
    width: ${({ size }) => (size ? size + 'px' : '32px')};
  }
  ${({ theme }) => theme.mediaWidth.upToMedium`
    align-items: flex-end;
  `};
`

const TransactionListWrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap};
`

const WalletAction = styled(ButtonSecondary)`
  width: fit-content;
  font-weight: 400;
  margin-left: 8px;
  font-size: 0.825rem;
  padding: 4px 6px;
  :hover {
    cursor: pointer;
    text-decoration: underline;
  }
`

const SecondaryActionsRow = styled(AccountGroupingRow)`
  justify-content: flex-end;
`

function renderTransactions(transactions: string[]) {
  return (
    <TransactionListWrapper>
      {transactions.map((hash, i) => {
        return <Transaction key={i} hash={hash} />
      })}
    </TransactionListWrapper>
  )
}

interface AccountDetailsProps {
  toggleWalletModal: () => void
  pendingTransactions: string[]
  confirmedTransactions: string[]
  ENSName?: string
  openOptions: () => void
}

export default function AccountDetails({
  toggleWalletModal,
  pendingTransactions,
  confirmedTransactions,
  ENSName,
  openOptions
}: AccountDetailsProps) {
  const { chainId, account, connector, library } = useActiveWeb3React()
  const { deactivate } = useWeb3React()
  const theme = useContext(ThemeContext)
  const dispatch = useDispatch<AppDispatch>()
  const addTransaction = useTransactionAdder()
  const [isRevokingLastApproval, setIsRevokingLastApproval] = useState(false)

  const lastApproval = useMemo(() => {
    try {
      const raw = localStorage.getItem('dextop.lastApproval')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { tokenAddress?: string; spender?: string }
      if (!parsed?.tokenAddress || !parsed?.spender) return null
      return parsed
    } catch {
      return null
    }
  }, [])

  const lastApprovalTokenContract = useTokenContract(lastApproval?.tokenAddress)

  function formatConnectorName() {
    if (connector === injected) {
      const detectedName = detectInjectedWallet()
      return <WalletName>Connected with {detectedName || 'Injected Wallet'}</WalletName>
    }

    const name = Object.keys(SUPPORTED_WALLETS)
      .filter(k => SUPPORTED_WALLETS[k].connector === connector)
      .map(k => SUPPORTED_WALLETS[k].name)[0]

    return <WalletName>Connected with {name}</WalletName>
  }

  function getStatusIcon() {
    if (connector === injected) {
      return (
        <IconWrapper size={16}>
          <Identicon />
        </IconWrapper>
      )
    } else if (connector === walletlink) {
      return (
        <IconWrapper size={16}>
          <img src={CoinbaseWalletIcon} alt={'coinbase wallet logo'} />
        </IconWrapper>
      )
    }
    return null
  }

  const clearAllTransactionsCallback = useCallback(() => {
    if (chainId) dispatch(clearAllTransactions({ chainId }))
  }, [dispatch, chainId])

  const disconnectWallet = useCallback(() => {
    try {
      localStorage.removeItem('isWalletConnected')
      localStorage.removeItem(WALLET_CONNECTED_KEY)
      localStorage.removeItem(WALLET_CONNECTOR_KEY)
      localStorage.removeItem(WALLET_INJECTED_KEY)

      if (connector && (connector as any).close) {
        ;(connector as any).close()
      }

      if (deactivate) {
        deactivate()
      }

      toggleWalletModal()
    } catch (error) {
      console.error('Disconnect failed', error)
    }
  }, [connector, deactivate, toggleWalletModal])

  const revokeLastApproval = useCallback(async () => {
    if (!lastApproval || !lastApprovalTokenContract) return

    const tokenAddress = lastApproval.tokenAddress
    const spender = lastApproval.spender
    if (!tokenAddress || !spender) return

    setIsRevokingLastApproval(true)
    try {
      const estimatedGas = await lastApprovalTokenContract.estimateGas.approve(spender, '0')
      const gasPrice = await getHigherGasPrice(library)
      const response = await lastApprovalTokenContract.approve(spender, '0', {
        gasLimit: calculateGasMargin(estimatedGas),
        ...(gasPrice ? { gasPrice } : {})
      })

      addTransaction(response, {
        summary: 'Revoke last token approval',
        approval: { tokenAddress, spender }
      })
    } catch (error) {
      console.error('Failed to revoke last approval', error)
    } finally {
      setIsRevokingLastApproval(false)
    }
  }, [addTransaction, lastApproval, lastApprovalTokenContract, library])

  return (
    <>
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <CloseColor />
        </CloseIcon>
        <HeaderRow>Account</HeaderRow>
        <AccountSection>
          <YourAccount>
            <InfoCard>
              <AccountGroupingRow>
                {formatConnectorName()}
                <div>
                  <WalletAction
                    style={{ fontSize: '.825rem', fontWeight: 400, marginRight: '8px' }}
                    onClick={disconnectWallet}
                  >
                    Disconnect
                  </WalletAction>
                  <WalletAction
                    style={{ fontSize: '.825rem', fontWeight: 400 }}
                    onClick={() => {
                      openOptions()
                    }}
                  >
                    Change
                  </WalletAction>
                </div>
              </AccountGroupingRow>
              {!!lastApproval && (
                <SecondaryActionsRow>
                  <WalletAction
                    style={{ fontSize: '.825rem', fontWeight: 400 }}
                    onClick={revokeLastApproval}
                    disabled={isRevokingLastApproval}
                  >
                    {isRevokingLastApproval ? 'Revoking...' : 'Revoke Last Approval'}
                  </WalletAction>
                </SecondaryActionsRow>
              )}
              <AccountGroupingRow id="web3-account-identifier-row">
                <AccountControl>
                  {ENSName ? (
                    <>
                      <div>
                        {getStatusIcon()}
                        <p> {ENSName}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        {getStatusIcon()}
                        <p> {account && shortenAddress(account)}</p>
                      </div>
                    </>
                  )}
                </AccountControl>
              </AccountGroupingRow>
              <AccountGroupingRow>
                {ENSName ? (
                  <>
                    <AccountControl>
                      <div>
                        {account && (
                          <Copy toCopy={account}>
                            <span style={{ marginLeft: '4px' }}>Copy Address</span>
                          </Copy>
                        )}
                        {chainId && account && (
                          <AddressLink
                            hasENS={!!ENSName}
                            isENS={true}
                            href={chainId && getEtherscanLink(chainId, ENSName, 'address')}
                          >
                            <LinkIcon size={16} />
                            <span style={{ marginLeft: '4px' }}>View on BlockScan</span>
                          </AddressLink>
                        )}
                      </div>
                    </AccountControl>
                  </>
                ) : (
                  <>
                    <AccountControl>
                      <div>
                        {account && (
                          <Copy toCopy={account}>
                            <span style={{ marginLeft: '4px' }}>Copy Address</span>
                          </Copy>
                        )}
                        {chainId && account && (
                          <AddressLink
                            hasENS={!!ENSName}
                            isENS={false}
                            href={getEtherscanLink(chainId, account, 'address')}
                          >
                            <LinkIcon size={16} />
                            <span style={{ marginLeft: '4px' }}>View on BlockScan</span>
                          </AddressLink>
                        )}
                      </div>
                    </AccountControl>
                  </>
                )}
              </AccountGroupingRow>
            </InfoCard>
          </YourAccount>
        </AccountSection>
      </UpperSection>
      {!!pendingTransactions.length || !!confirmedTransactions.length ? (
        <LowerSection>
          <AutoRow mb={'1rem'} style={{ justifyContent: 'space-between' }}>
            <TYPE.body>Recent Transactions</TYPE.body>
            <LinkStyledButton onClick={clearAllTransactionsCallback}>(clear all)</LinkStyledButton>
          </AutoRow>
          {renderTransactions(pendingTransactions)}
          {renderTransactions(confirmedTransactions)}
        </LowerSection>
      ) : (
        <LowerSection>
          <TYPE.body color={theme.text1}>Your transactions will appear here...</TYPE.body>
        </LowerSection>
      )}
    </>
  )
}
