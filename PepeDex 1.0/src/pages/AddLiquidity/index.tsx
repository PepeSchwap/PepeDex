import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { Currency, CurrencyAmount, currencyEquals, ETHER, JSBI, TokenAmount, WETH } from '@uniswap/sdk'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useContext, useMemo, useState } from 'react'
import { Plus } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'
import { ButtonConfirmed, ButtonError, ButtonLight } from '../../components/Button'
import { BlueCard, GreyCard, LightCard } from '../../components/Card'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import { AddRemoveTabs } from '../../components/NavigationTabs'
import { MinimalPositionCard } from '../../components/PositionCard'
import Row, { RowBetween, RowFlat } from '../../components/Row'

import { ROUTER_ADDRESS } from '../../constants'
import { PairState } from '../../data/Reserves'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { useTokenContract } from '../../hooks/useContract'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from '../../state/mint/hooks'

import { useTransactionAdder } from '../../state/transactions/hooks'
import { useIsExpertMode, useUserDeadline, useUserSlippageTolerance } from '../../state/user/hooks'
import { TYPE } from '../../theme'
import { calculateGasMargin, calculateSlippageAmount, getHigherGasPrice, getRouterContract } from '../../utils'
import formatUsdValue from '../../utils/formatUsdValue'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import useUSDCPrice from '../../utils/useUSDCPrice'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import AppBody from '../AppBody'
import { Dots, MaxButton, Wrapper } from '../Pool/styleds'
import { ConfirmAddModalBottom } from './ConfirmAddModalBottom'
import { currencyId } from '../../utils/currencyId'
import { PoolPriceBar } from './PoolPriceBar'

const ApprovalModeRow = styled(RowBetween)`
  margin-bottom: 10px;
`

const ApprovalModeButton = styled(MaxButton)<{ selected: boolean }>`
  width: 49%;
  border: 1px solid ${({ theme, selected }) => (selected ? theme.primary1 : theme.text2)};
  color: ${({ theme, selected }) => (selected ? theme.primary1 : theme.text2)};
`

function readableAddLiquidityError(error: any): string {
  const rawMessage =
    error?.reason ??
    error?.error?.reason ??
    error?.data?.message ??
    error?.error?.message ??
    error?.message ??
    'Transaction failed'
  const normalizedMessage = String(rawMessage)

  if (
    normalizedMessage.includes('DexTopRouter: INSUFFICIENT_A_AMOUNT') ||
    normalizedMessage.includes('DexTopRouter: INSUFFICIENT_B_AMOUNT') ||
    normalizedMessage.includes('pepeRouter: INSUFFICIENT_A_AMOUNT') ||
    normalizedMessage.includes('pepeRouter: INSUFFICIENT_B_AMOUNT')
  ) {
    return 'Liquidity ratio moved before confirmation. Increase slippage tolerance and try again.'
  }

  if (
    normalizedMessage.includes('TransferHelper::transferFrom: transferFrom failed') ||
    normalizedMessage.includes('pepe: TRANSFER_FAILED')
  ) {
    return 'Token transfer failed. Verify token approval, wallet balance, and any token limits (max tx, trading enabled, blacklist).'
  }

  if (normalizedMessage.toLowerCase().includes('execution reverted')) {
    return 'Transaction reverted. Token may block transfers, trading may be disabled, or amount/approval is invalid.'
  }

  return normalizedMessage
}

export default function AddLiquidity({
  match: {
    params: { currencyIdA, currencyIdB }
  },
  history
}: RouteComponentProps<{ currencyIdA?: string; currencyIdB?: string }>) {
  const { account, chainId, library } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  const currencyA = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)

  const oneCurrencyIsWETH = Boolean(
    chainId &&
      ((currencyA && currencyEquals(currencyA, WETH[chainId])) ||
        (currencyB && currencyEquals(currencyB, WETH[chainId])))
  )

  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  const expertMode = useIsExpertMode()

  // mint state
  const { independentField, typedValue, otherTypedValue } = useMintState()
  const {
    dependentField,
    currencies,
    pair,
    pairState,
    currencyBalances,
    parsedAmounts,
    price,
    noLiquidity,
    liquidityMinted,
    poolTokenPercentage,
    error
  } = useDerivedMintInfo(currencyA ?? undefined, currencyB ?? undefined)
  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)

  const isValid = !error

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm
  const [addError, setAddError] = useState<string | null>(null)
  const [approvalActionError, setApprovalActionError] = useState<string | null>(null)
  const [revokingA, setRevokingA] = useState(false)
  const [revokingB, setRevokingB] = useState(false)
  const [useExactApproval, setUseExactApproval] = useState(false)

  // txn values
  const [deadline] = useUserDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users
  const [txHash, setTxHash] = useState<string>('')

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
  }

  const currencyAUsdPrice = useUSDCPrice(currencies[Field.CURRENCY_A])
  const currencyBUsdPrice = useUSDCPrice(currencies[Field.CURRENCY_B])

  const currencyAFiatValue = useMemo(() => formatUsdValue(parsedAmounts[Field.CURRENCY_A], currencyAUsdPrice), [
    parsedAmounts,
    currencyAUsdPrice
  ])
  const currencyBFiatValue = useMemo(() => formatUsdValue(parsedAmounts[Field.CURRENCY_B], currencyBUsdPrice), [
    parsedAmounts,
    currencyBUsdPrice
  ])

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field])
      }
    },
    {}
  )

  const atMaxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0')
      }
    },
    {}
  )

  const applyPercentInput = useCallback(
    (field: Field, percent: number) => {
      const maxAmount = maxAmounts[field]
      if (!maxAmount) return

      const scaledRaw = JSBI.divide(JSBI.multiply(maxAmount.raw, JSBI.BigInt(percent)), JSBI.BigInt(100))
      const value =
        maxAmount.currency === ETHER
          ? CurrencyAmount.ether(scaledRaw).toExact()
          : new TokenAmount((maxAmount as TokenAmount).token, scaledRaw).toExact()

      if (field === Field.CURRENCY_A) {
        onFieldAInput(value)
      } else {
        onFieldBInput(value)
      }
    },
    [maxAmounts, onFieldAInput, onFieldBInput]
  )

  const maxMenuItemsA = useMemo(
    () => [
      { label: '25%', onClick: () => applyPercentInput(Field.CURRENCY_A, 25) },
      { label: '50%', onClick: () => applyPercentInput(Field.CURRENCY_A, 50) },
      { label: '75%', onClick: () => applyPercentInput(Field.CURRENCY_A, 75) },
      { label: 'Max', onClick: () => onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '') }
    ],
    [applyPercentInput, maxAmounts, onFieldAInput]
  )

  const maxMenuItemsB = useMemo(
    () => [
      { label: '25%', onClick: () => applyPercentInput(Field.CURRENCY_B, 25) },
      { label: '50%', onClick: () => applyPercentInput(Field.CURRENCY_B, 50) },
      { label: '75%', onClick: () => applyPercentInput(Field.CURRENCY_B, 75) },
      { label: 'Max', onClick: () => onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '') }
    ],
    [applyPercentInput, maxAmounts, onFieldBInput]
  )

  const approvalTokenA = parsedAmounts[Field.CURRENCY_A] instanceof TokenAmount ? parsedAmounts[Field.CURRENCY_A].token : undefined
  const approvalTokenB = parsedAmounts[Field.CURRENCY_B] instanceof TokenAmount ? parsedAmounts[Field.CURRENCY_B].token : undefined
  const approvalTokenContractA = useTokenContract(approvalTokenA?.address)
  const approvalTokenContractB = useTokenContract(approvalTokenB?.address)

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_A], ROUTER_ADDRESS, useExactApproval)
  const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_B], ROUTER_ADDRESS, useExactApproval)
  const addTransaction = useTransactionAdder()

  const handleApproveA = useCallback(async () => {
    setApprovalActionError(null)
    try {
      await approveACallback()
    } catch (error) {
      const err = error as { message?: string }
      setApprovalActionError(err?.message || 'Approval failed')
    }
  }, [approveACallback])

  const handleApproveB = useCallback(async () => {
    setApprovalActionError(null)
    try {
      await approveBCallback()
    } catch (error) {
      const err = error as { message?: string }
      setApprovalActionError(err?.message || 'Approval failed')
    }
  }, [approveBCallback])

  const handleRevokeApprovalA = useCallback(async () => {
    if (!approvalTokenContractA || !approvalTokenA) return
    setApprovalActionError(null)
    setRevokingA(true)
    try {
      const estimatedGas = await approvalTokenContractA.estimateGas.approve(ROUTER_ADDRESS, '0')
      const gasPrice = await getHigherGasPrice(library)
      const response = await approvalTokenContractA.approve(ROUTER_ADDRESS, '0', {
        gasLimit: calculateGasMargin(estimatedGas),
        ...(gasPrice ? { gasPrice } : {})
      })
      addTransaction(response, {
        summary: `Revoke ${approvalTokenA.symbol} approval`,
        approval: { tokenAddress: approvalTokenA.address, spender: ROUTER_ADDRESS }
      })
    } catch (error) {
      const err = error as { message?: string }
      setApprovalActionError(err?.message || 'Revoke failed')
    } finally {
      setRevokingA(false)
    }
  }, [addTransaction, approvalTokenA, approvalTokenContractA, library])

  const handleRevokeApprovalB = useCallback(async () => {
    if (!approvalTokenContractB || !approvalTokenB) return
    setApprovalActionError(null)
    setRevokingB(true)
    try {
      const estimatedGas = await approvalTokenContractB.estimateGas.approve(ROUTER_ADDRESS, '0')
      const gasPrice = await getHigherGasPrice(library)
      const response = await approvalTokenContractB.approve(ROUTER_ADDRESS, '0', {
        gasLimit: calculateGasMargin(estimatedGas),
        ...(gasPrice ? { gasPrice } : {})
      })
      addTransaction(response, {
        summary: `Revoke ${approvalTokenB.symbol} approval`,
        approval: { tokenAddress: approvalTokenB.address, spender: ROUTER_ADDRESS }
      })
    } catch (error) {
      const err = error as { message?: string }
      setApprovalActionError(err?.message || 'Revoke failed')
    } finally {
      setRevokingB(false)
    }
  }, [addTransaction, approvalTokenB, approvalTokenContractB, library])

  async function onAdd() {
    if (!chainId || !library || !account) return
    setAddError(null)
    const router = getRouterContract(chainId, library, account)

    const { [Field.CURRENCY_A]: parsedAmountA, [Field.CURRENCY_B]: parsedAmountB } = parsedAmounts
    if (!parsedAmountA || !parsedAmountB || !currencyA || !currencyB) {
      return
    }

    if (currencyBalances[Field.CURRENCY_A] && parsedAmountA.greaterThan(currencyBalances[Field.CURRENCY_A])) {
      setAddError(`Insufficient ${currencies[Field.CURRENCY_A]?.symbol ?? 'token'} balance.`)
      return
    }
    if (currencyBalances[Field.CURRENCY_B] && parsedAmountB.greaterThan(currencyBalances[Field.CURRENCY_B])) {
      setAddError(`Insufficient ${currencies[Field.CURRENCY_B]?.symbol ?? 'token'} balance.`)
      return
    }

    const amountsMin = {
      [Field.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? 0 : allowedSlippage)[0],
      [Field.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? 0 : allowedSlippage)[0]
    }

    if (!noLiquidity && allowedSlippage === 0) {
      setAddError('Slippage tolerance is set to 0%. Increase it in Settings (for example 5%) and try again.')
      return
    }

    const deadlineFromNow = Math.ceil(Date.now() / 1000) + deadline

    let estimate,
      method: (...args: any) => Promise<TransactionResponse>,
      args: Array<string | string[] | number>,
      value: BigNumber | null
    if (currencyA === ETHER || currencyB === ETHER) {
      const tokenBIsETH = currencyB === ETHER
      const tokenAddress = wrappedCurrency(tokenBIsETH ? currencyA : currencyB, chainId)?.address
      if (!tokenAddress) {
        setAddError('Invalid token address for this network.')
        return
      }
      const tokenCode = await library.getCode(tokenAddress)
      if (!tokenCode || tokenCode === '0x') {
        setAddError('Selected token is not deployed as a contract on PulseChain.')
        return
      }
      estimate = router.estimateGas.addLiquidityETH
      method = router.addLiquidityETH
      args = [
        tokenAddress, // token
        (tokenBIsETH ? parsedAmountA : parsedAmountB).raw.toString(), // token desired
        amountsMin[tokenBIsETH ? Field.CURRENCY_A : Field.CURRENCY_B].toString(), // token min
        amountsMin[tokenBIsETH ? Field.CURRENCY_B : Field.CURRENCY_A].toString(), // eth min
        account,
        deadlineFromNow
      ]
      value = BigNumber.from((tokenBIsETH ? parsedAmountB : parsedAmountA).raw.toString())
    } else {
      const tokenAAddress = wrappedCurrency(currencyA, chainId)?.address
      const tokenBAddress = wrappedCurrency(currencyB, chainId)?.address
      if (!tokenAAddress || !tokenBAddress) {
        setAddError('Invalid token address for this network.')
        return
      }
      const [codeA, codeB] = await Promise.all([library.getCode(tokenAAddress), library.getCode(tokenBAddress)])
      if (!codeA || codeA === '0x' || !codeB || codeB === '0x') {
        setAddError('One or both selected tokens are not deployed as contracts on PulseChain.')
        return
      }
      estimate = router.estimateGas.addLiquidity
      method = router.addLiquidity
      args = [
        tokenAAddress,
        tokenBAddress,
        parsedAmountA.raw.toString(),
        parsedAmountB.raw.toString(),
        amountsMin[Field.CURRENCY_A].toString(),
        amountsMin[Field.CURRENCY_B].toString(),
        account,
        deadlineFromNow
      ]
      value = null
    }

    setAttemptingTxn(true)
    await estimate(...args, value ? { value } : {})
      .then(async estimatedGasLimit => {
        const gasPrice = await getHigherGasPrice(library)
        return method(...args, {
          ...(value ? { value } : {}),
          ...(gasPrice ? { gasPrice } : {}),
          gasLimit: calculateGasMargin(estimatedGasLimit)
        }).then(response => {
          setAttemptingTxn(false)

          addTransaction(response, {
            summary:
              'Add ' +
              parsedAmounts[Field.CURRENCY_A]?.toSignificant(3) +
              ' ' +
              currencies[Field.CURRENCY_A]?.symbol +
              ' and ' +
              parsedAmounts[Field.CURRENCY_B]?.toSignificant(3) +
              ' ' +
              currencies[Field.CURRENCY_B]?.symbol
          })

          setTxHash(response.hash)

          ReactGA.event({
            category: 'Liquidity',
            action: 'Add',
            label: [currencies[Field.CURRENCY_A]?.symbol, currencies[Field.CURRENCY_B]?.symbol].join('/')
          })
        })
      })
      .catch(error => {
        setAttemptingTxn(false)
        // we only care if the error is something _other_ than the user rejected the tx
        if (error?.code !== 4001) {
          setAddError(readableAddLiquidityError(error))
          console.error(error)
        }
      })
  }

  const modalHeader = () => {
    return noLiquidity ? (
      <AutoColumn gap="20px">
        <LightCard mt="20px" borderRadius="20px">
          <RowFlat>
            <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
              {currencies[Field.CURRENCY_A]?.symbol + '/' + currencies[Field.CURRENCY_B]?.symbol}
            </Text>
            <DoubleCurrencyLogo
              currency0={currencies[Field.CURRENCY_A]}
              currency1={currencies[Field.CURRENCY_B]}
              size={30}
            />
          </RowFlat>
        </LightCard>
      </AutoColumn>
    ) : (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {liquidityMinted?.toSignificant(6)}
          </Text>
          <DoubleCurrencyLogo
            currency0={currencies[Field.CURRENCY_A]}
            currency1={currencies[Field.CURRENCY_B]}
            size={30}
          />
        </RowFlat>
        <Row>
          <Text fontSize="24px">
            {currencies[Field.CURRENCY_A]?.symbol + '/' + currencies[Field.CURRENCY_B]?.symbol + ' Pool Tokens'}
          </Text>
        </Row>
        <TYPE.italic fontSize={12} textAlign="left" padding={'8px 0 0 0 '}>
          {`Output is estimated. If the price changes by more than ${allowedSlippage /
            100}% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
      <ConfirmAddModalBottom
        price={price}
        currencies={currencies}
        parsedAmounts={parsedAmounts}
        noLiquidity={noLiquidity}
        onAdd={onAdd}
        poolTokenPercentage={poolTokenPercentage}
      />
    )
  }

  const pendingText = `Supplying ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)} ${
    currencies[Field.CURRENCY_A]?.symbol
  } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)} ${currencies[Field.CURRENCY_B]?.symbol}`

  const handleCurrencyASelect = useCallback(
    (currencyA: Currency) => {
      const newCurrencyIdA = currencyId(currencyA)
      if (newCurrencyIdA === currencyIdB) {
        history.push(`/add/${currencyIdB}/${currencyIdA}`)
      } else {
        history.push(`/add/${newCurrencyIdA}/${currencyIdB}`)
      }
    },
    [currencyIdB, history, currencyIdA]
  )
  const handleCurrencyBSelect = useCallback(
    (currencyB: Currency) => {
      const newCurrencyIdB = currencyId(currencyB)
      if (currencyIdA === newCurrencyIdB) {
        if (currencyIdB) {
          history.push(`/add/${currencyIdB}/${newCurrencyIdB}`)
        } else {
          history.push(`/add/${newCurrencyIdB}`)
        }
      } else {
        history.push(`/add/${currencyIdA ? currencyIdA : 'PLS'}/${newCurrencyIdB}`)
      }
    },
    [currencyIdA, history, currencyIdB]
  )

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
    }
    setTxHash('')
  }, [onFieldAInput, txHash])

  return (
    <>
      <AppBody>
        <AddRemoveTabs adding={true} />
        <Wrapper>
          <TransactionConfirmationModal
            isOpen={showConfirm}
            onDismiss={handleDismissConfirmation}
            attemptingTxn={attemptingTxn}
            hash={txHash}
            content={() => (
              <ConfirmationModalContent
                title={noLiquidity ? 'You are creating a pool' : 'You will receive'}
                onDismiss={handleDismissConfirmation}
                topContent={modalHeader}
                bottomContent={modalBottom}
              />
            )}
            pendingText={pendingText}
          />
          <AutoColumn gap="20px">
            {noLiquidity && (
              <ColumnCenter>
                <BlueCard>
                  <AutoColumn gap="10px">
                    <TYPE.link fontWeight={600} color={'primaryText1'}>
                      You are the first liquidity provider.
                    </TYPE.link>
                    <TYPE.link fontWeight={400} color={'primaryText1'}>
                      The ratio of tokens you add will set the price of this pool.
                    </TYPE.link>
                    <TYPE.link fontWeight={400} color={'primaryText1'}>
                      Once you are happy with the rate click supply to review.
                    </TYPE.link>
                  </AutoColumn>
                </BlueCard>
              </ColumnCenter>
            )}
            <CurrencyInputPanel
              value={formattedAmounts[Field.CURRENCY_A]}
              onUserInput={onFieldAInput}
              onMax={() => {
                onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')
              }}
              maxButtonMenuItems={maxAmounts[Field.CURRENCY_A] ? maxMenuItemsA : undefined}
              onCurrencySelect={handleCurrencyASelect}
              showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
              currency={currencies[Field.CURRENCY_A]}
              id="add-liquidity-input-tokena"
              showCommonBases
              fiatValue={currencyAFiatValue}
            />
            <ColumnCenter>
              <Plus size="16" color={theme.text2} />
            </ColumnCenter>
            <CurrencyInputPanel
              value={formattedAmounts[Field.CURRENCY_B]}
              onUserInput={onFieldBInput}
              onCurrencySelect={handleCurrencyBSelect}
              onMax={() => {
                onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
              }}
              maxButtonMenuItems={maxAmounts[Field.CURRENCY_B] ? maxMenuItemsB : undefined}
              showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
              currency={currencies[Field.CURRENCY_B]}
              id="add-liquidity-input-tokenb"
              showCommonBases
              fiatValue={currencyBFiatValue}
            />
            {currencies[Field.CURRENCY_A] && currencies[Field.CURRENCY_B] && pairState !== PairState.INVALID && (
              <>
                <GreyCard padding="0px" borderRadius={'20px'}>
                  <RowBetween padding="1rem">
                    <TYPE.subHeader fontWeight={500} fontSize={14}>
                      {noLiquidity ? 'Initial prices' : 'Prices'} and pool share
                    </TYPE.subHeader>
                  </RowBetween>{' '}
                  <LightCard padding="1rem" borderRadius={'20px'}>
                    <PoolPriceBar
                      currencies={currencies}
                      poolTokenPercentage={poolTokenPercentage}
                      noLiquidity={noLiquidity}
                      price={price}
                      pair={pair}
                    />
                  </LightCard>
                </GreyCard>
              </>
            )}

            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
            ) : (
              <AutoColumn gap={'md'}>
                {isValid && (approvalTokenA || approvalTokenB) && (
                  <>
                    <ApprovalModeRow>
                      <ApprovalModeButton width="49%" selected={!useExactApproval} onClick={() => setUseExactApproval(false)}>
                        Unlimited Approval
                      </ApprovalModeButton>
                      <ApprovalModeButton width="49%" selected={useExactApproval} onClick={() => setUseExactApproval(true)}>
                        Exact Approval
                      </ApprovalModeButton>
                    </ApprovalModeRow>
                    {approvalTokenA && (
                      <RowBetween>
                        <ButtonConfirmed
                          onClick={handleApproveA}
                          disabled={approvalA !== ApprovalState.NOT_APPROVED}
                          width="48%"
                          altDisabledStyle={approvalA === ApprovalState.PENDING}
                          confirmed={approvalA === ApprovalState.APPROVED}
                        >
                          {approvalA === ApprovalState.PENDING ? (
                            <Dots>Approving {currencies[Field.CURRENCY_A]?.symbol}</Dots>
                          ) : approvalA === ApprovalState.APPROVED ? (
                            'Approved'
                          ) : useExactApproval ? (
                            `Approve Exact ${currencies[Field.CURRENCY_A]?.symbol}`
                          ) : (
                            `Approve Max ${currencies[Field.CURRENCY_A]?.symbol}`
                          )}
                        </ButtonConfirmed>
                        <ButtonLight onClick={handleRevokeApprovalA} width="48%" disabled={approvalA !== ApprovalState.APPROVED || revokingA}>
                          {revokingA ? 'Revoking...' : `Revoke ${currencies[Field.CURRENCY_A]?.symbol}`}
                        </ButtonLight>
                      </RowBetween>
                    )}
                    {approvalTokenB && (
                      <RowBetween>
                        <ButtonConfirmed
                          onClick={handleApproveB}
                          disabled={approvalB !== ApprovalState.NOT_APPROVED}
                          width="48%"
                          altDisabledStyle={approvalB === ApprovalState.PENDING}
                          confirmed={approvalB === ApprovalState.APPROVED}
                        >
                          {approvalB === ApprovalState.PENDING ? (
                            <Dots>Approving {currencies[Field.CURRENCY_B]?.symbol}</Dots>
                          ) : approvalB === ApprovalState.APPROVED ? (
                            'Approved'
                          ) : useExactApproval ? (
                            `Approve Exact ${currencies[Field.CURRENCY_B]?.symbol}`
                          ) : (
                            `Approve Max ${currencies[Field.CURRENCY_B]?.symbol}`
                          )}
                        </ButtonConfirmed>
                        <ButtonLight onClick={handleRevokeApprovalB} width="48%" disabled={approvalB !== ApprovalState.APPROVED || revokingB}>
                          {revokingB ? 'Revoking...' : `Revoke ${currencies[Field.CURRENCY_B]?.symbol}`}
                        </ButtonLight>
                      </RowBetween>
                    )}
                  </>
                )}
                <ButtonError
                  onClick={() => {
                    expertMode ? onAdd() : setShowConfirm(true)
                  }}
                  disabled={!isValid || approvalA !== ApprovalState.APPROVED || approvalB !== ApprovalState.APPROVED}
                  error={!isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
                >
                  <Text fontSize={20} fontWeight={500}>
                    {error ?? 'Supply'}
                  </Text>
                </ButtonError>
                {approvalActionError ? <TYPE.error error={true}>{approvalActionError}</TYPE.error> : null}
                {addError ? <TYPE.error error={true}>{addError}</TYPE.error> : null}
              </AutoColumn>
            )}
          </AutoColumn>
        </Wrapper>
      </AppBody>

      {pair && !noLiquidity && pairState !== PairState.INVALID ? (
        <AutoColumn style={{ minWidth: '20rem', marginTop: '1rem' }}>
          <MinimalPositionCard showUnwrapped={oneCurrencyIsWETH} pair={pair} />
        </AutoColumn>
      ) : null}
    </>
  )
}
