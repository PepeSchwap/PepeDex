import { CurrencyAmount, JSBI, Token, TokenAmount, Trade, Currency, ETHER } from '@uniswap/sdk'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Repeat } from 'react-feather'
import ReactGA from 'react-ga'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonError, ButtonLight, ButtonPrimary, ButtonConfirmed } from '../../components/Button'
import Card, { GreyCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import { AutoRow, RowBetween } from '../../components/Row'
import AdvancedSwapDetailsDropdown from '../../components/swap/AdvancedSwapDetailsDropdown'
import BetterTradeLink from '../../components/swap/BetterTradeLink'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import { PriceImpactConfirmationRequirement } from '../../components/swap/confirmPriceImpactWithoutFee'
import PriceImpactConfirmationModal from '../../components/swap/PriceImpactConfirmationModal'
import { ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper } from '../../components/swap/styleds'
import TradePrice from '../../components/swap/TradePrice'
import TokenWarningModal from '../../components/TokenWarningModal'
import ProgressSteps from '../../components/ProgressSteps'
import { RouteComponentProps, withRouter } from 'react-router-dom'
import {
  ALLOWED_PRICE_IMPACT_HIGH,
  BETTER_TRADE_LINK_THRESHOLD,
  INITIAL_ALLOWED_SLIPPAGE,
  PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN,
  ROUTER_ADDRESS
} from '../../constants'
import { getTradeVersion, isTradeBetter, useV1TradeExchangeAddress } from '../../data/V1'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import { useTokenContract } from '../../hooks/useContract'
import useENSAddress from '../../hooks/useENSAddress'
import { useSwapCallback } from '../../hooks/useSwapCallback'
import useToggledVersion, { Version } from '../../hooks/useToggledVersion'
import useWrapCallback, { WrapType } from '../../hooks/useWrapCallback'
import { useToggleSettingsMenu, useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState
} from '../../state/swap/hooks'
import { useExpertModeManager, useUserDeadline, useUserSlippageTolerance } from '../../state/user/hooks'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { LinkStyledButton, TYPE } from '../../theme'
import { calculateGasMargin, getHigherGasPrice } from '../../utils'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { computeTradePriceBreakdown, warningSeverity } from '../../utils/prices'
import formatUsdValue from '../../utils/formatUsdValue'
import useUSDCPrice from '../../utils/useUSDCPrice'
import AppBody from '../AppBody'
import { ClickableText } from '../Pool/styleds'
import Loader from '../../components/Loader'
import { MaxButton } from '../Pool/styleds'

const ApprovalModeRow = styled(RowBetween)`
  margin-bottom: 10px;
`

const ApprovalModeButton = styled(MaxButton)<{ selected: boolean }>`
  width: 49%;
  border: 1px solid ${({ theme, selected }) => (selected ? theme.primary1 : theme.text2)};
  color: ${({ theme, selected }) => (selected ? theme.primary1 : theme.text2)};
`

function Swap({ history }: RouteComponentProps) {
  const loadedUrlParams = useDefaultsFromURLSearch()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId)
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(true)
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  const { account, library } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // for expert mode
  const toggleSettings = useToggleSettingsMenu()
  const [isExpertMode] = useExpertModeManager()

  // get custom setting values for user
  const [deadline] = useUserDeadline()
  const [allowedSlippage] = useUserSlippageTolerance()

  // swap state
  const { independentField, typedValue, recipient } = useSwapState()
  const {
    v1Trade,
    v2Trade,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError
  } = useDerivedSwapInfo()
  const { wrapType, execute: onWrap, inputError: wrapInputError } = useWrapCallback(
    currencies[Field.INPUT],
    currencies[Field.OUTPUT],
    typedValue
  )
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const { address: recipientAddress } = useENSAddress(recipient)
  const toggledVersion = useToggledVersion()
  const trade = showWrap
    ? undefined
    : {
        [Version.v1]: v1Trade,
        [Version.v2]: v2Trade
      }[toggledVersion]

  const betterTradeLinkVersion: Version | undefined =
    toggledVersion === Version.v2 && isTradeBetter(v2Trade, v1Trade, BETTER_TRADE_LINK_THRESHOLD)
      ? Version.v1
      : toggledVersion === Version.v1 && isTradeBetter(v1Trade, v2Trade)
      ? Version.v2
      : undefined

  const parsedAmounts = showWrap
    ? {
        [Field.INPUT]: parsedAmount,
        [Field.OUTPUT]: parsedAmount
      }
    : {
        [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
        [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount
      }

  const inputUsdPrice = useUSDCPrice(currencies[Field.INPUT])
  const outputUsdPrice = useUSDCPrice(currencies[Field.OUTPUT])

  const inputFiatValue = useMemo(() => formatUsdValue(parsedAmounts[Field.INPUT], inputUsdPrice), [
    parsedAmounts,
    inputUsdPrice
  ])
  const outputFiatValue = useMemo(() => formatUsdValue(parsedAmounts[Field.OUTPUT], outputUsdPrice), [
    parsedAmounts,
    outputUsdPrice
  ])

  const { onSwitchTokens, onUserInput, onChangeRecipient } = useSwapActionHandlers()
  const isValid = !swapInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // Modal and loading states
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined
  })

  const [priceImpactModalState, setPriceImpactModalState] = useState<{
    isOpen: boolean
    mode: Extract<PriceImpactConfirmationRequirement, 'confirm' | 'type-confirm'>
  }>({
    isOpen: false,
    mode: 'confirm'
  })

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
  }

  const route = trade?.route
  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )
  const noRoute = !route

  // approval checks
  const [useExactApproval, setUseExactApproval] = useState(false)
  const [approvalActionError, setApprovalActionError] = useState<string | undefined>()
  const [revokingApproval, setRevokingApproval] = useState(false)

  const [approval, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage, useExactApproval)
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
  const addTransaction = useTransactionAdder()

  const tradeIsV1 = getTradeVersion(trade) === Version.v1
  const v1ExchangeAddress = useV1TradeExchangeAddress(trade)
  const approvalSpender = tradeIsV1 ? v1ExchangeAddress : ROUTER_ADDRESS
  const inputToken = trade?.inputAmount?.currency instanceof Token ? trade.inputAmount.currency : undefined
  const approvalTokenContract = useTokenContract(inputToken?.address)

  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval])

  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))

  // swap callback
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
    trade,
    allowedSlippage,
    deadline,
    recipient
  )

  const { priceImpactWithoutFee } = computeTradePriceBreakdown(trade)

  const executeSwap = useCallback(
    (skipPriceImpactConfirm = false) => {
      if (priceImpactWithoutFee && !skipPriceImpactConfirm) {
        const requirement = confirmPriceImpactWithoutFee(priceImpactWithoutFee)
        if (requirement !== 'none') {
          setPriceImpactModalState({ isOpen: true, mode: requirement })
          return
        }
      }

      if (!swapCallback) {
        return
      }
      setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
      swapCallback()
        .then(hash => {
          setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })

          ReactGA.event({
            category: 'Swap',
            action:
              recipient === null
                ? 'Swap w/o Send'
                : (recipientAddress ?? recipient) === account
                ? 'Swap w/o Send + recipient'
                : 'Swap w/ Send',
            label: [
              trade?.inputAmount?.currency?.symbol,
              trade?.outputAmount?.currency?.symbol,
              getTradeVersion(trade)
            ].join('/')
          })
        })
        .catch(error => {
          setSwapState({
            attemptingTxn: false,
            tradeToConfirm,
            showConfirm,
            swapErrorMessage: error.message,
            txHash: undefined
          })
        })
    },
    [tradeToConfirm, account, priceImpactWithoutFee, recipient, recipientAddress, showConfirm, swapCallback, trade]
  )

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return
    }
    executeSwap(false)
  }, [executeSwap, swapCallback])

  // errors and warnings
  const [showInverted, setShowInverted] = useState<boolean>(false)
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)
  const tokenApprovalApplicable = Boolean(inputToken)

  const showApproveFlow =
    tokenApprovalApplicable &&
    !swapInputError &&
    approval !== ApprovalState.UNKNOWN &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleConfirmDismiss = useCallback(() => {
    setSwapState({ showConfirm: false, tradeToConfirm, attemptingTxn, swapErrorMessage, txHash })
    // if there was a tx hash, clear input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  // ------------- HERE: Routing handlers for token selection ----------------

  // Helper to get token ID string for URL (address or symbol)
  const tokenId = (currency?: Currency | null) => {
    if (!currency) return undefined
    return currency instanceof Token ? currency.address : currency.symbol
  }

  const currencyIdA = tokenId(currencies[Field.INPUT])
  const currencyIdB = tokenId(currencies[Field.OUTPUT])

  const handleCurrencyASelect = useCallback(
    (currencyA: Currency) => {
      const newCurrencyIdA = tokenId(currencyA)
      if (!newCurrencyIdA) return

      const searchParams = new URLSearchParams()
      searchParams.set('inputCurrency', newCurrencyIdA)
      if (currencyIdB) searchParams.set('outputCurrency', currencyIdB)

      history.replace({ pathname: '/#/swap', search: `?${searchParams.toString()}` })
    },
    [currencyIdB, history]
  )

  const handleCurrencyBSelect = useCallback(
    (currencyB: Currency) => {
      const newCurrencyIdB = tokenId(currencyB)
      if (!newCurrencyIdB) return

      const searchParams = new URLSearchParams()
      searchParams.set('outputCurrency', newCurrencyIdB)
      if (currencyIdA) searchParams.set('inputCurrency', currencyIdA)

      history.replace({ pathname: '/#/swap', search: `?${searchParams.toString()}` })
    },
    [currencyIdA, history]
  )
  // ---------------------

  // Handlers now use routing handlers for token selection, and reset approvalSubmitted on input change

  const handleInputSelect = useCallback(
    (inputCurrency: Currency) => {
      setApprovalSubmitted(false)
      handleCurrencyASelect(inputCurrency)
    },
    [handleCurrencyASelect]
  )

  const handleOutputSelect = useCallback(
    (outputCurrency: Currency) => {
      setApprovalSubmitted(false)
      handleCurrencyBSelect(outputCurrency)
    },
    [handleCurrencyBSelect]
  )

  const handleMaxInput = useCallback(() => {
    maxAmountInput && onUserInput(Field.INPUT, maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  const handlePercentInput = useCallback(
    (percent: number) => {
      if (!maxAmountInput) return

      const scaledRaw = JSBI.divide(JSBI.multiply(maxAmountInput.raw, JSBI.BigInt(percent)), JSBI.BigInt(100))

      const percentAmount =
        maxAmountInput.currency === ETHER
          ? CurrencyAmount.ether(scaledRaw)
          : new TokenAmount((maxAmountInput as TokenAmount).token, scaledRaw)

      onUserInput(Field.INPUT, percentAmount.toExact())
    },
    [maxAmountInput, onUserInput]
  )

  const maxButtonMenuItems = useMemo(
    () => [
      { label: '25%', onClick: () => handlePercentInput(25) },
      { label: '50%', onClick: () => handlePercentInput(50) },
      { label: '75%', onClick: () => handlePercentInput(75) },
      { label: 'Max', onClick: handleMaxInput }
    ],
    [handleMaxInput, handlePercentInput]
  )

  const handleApproveClick = useCallback(async () => {
    setApprovalActionError(undefined)
    try {
      await approveCallback()
    } catch (error) {
      const err = error as { message?: string }
      setApprovalActionError(err?.message || 'Approval failed')
    }
  }, [approveCallback])

  const handleRevokeApproval = useCallback(async () => {
    if (!approvalTokenContract || !approvalSpender || !inputToken) return

    setApprovalActionError(undefined)
    setRevokingApproval(true)
    try {
      const estimatedGas = await approvalTokenContract.estimateGas.approve(approvalSpender, '0')
      const gasPrice = await getHigherGasPrice(library)
      const response = await approvalTokenContract.approve(approvalSpender, '0', {
        gasLimit: calculateGasMargin(estimatedGas),
        ...(gasPrice ? { gasPrice } : {})
      })

      addTransaction(response, {
        summary: `Revoke ${inputToken.symbol} approval`,
        approval: { tokenAddress: inputToken.address, spender: approvalSpender }
      })

      setApprovalSubmitted(false)
    } catch (error) {
      const err = error as { message?: string }
      setApprovalActionError(err?.message || 'Revoke failed')
    } finally {
      setRevokingApproval(false)
    }
  }, [addTransaction, approvalSpender, approvalTokenContract, inputToken, library])

  // You can use these new handlers in your CurrencyInputPanel components as:
  // <CurrencyInputPanel ... onCurrencySelect={handleInputSelect} ... />
  // <CurrencyInputPanel ... onCurrencySelect={handleOutputSelect} ... />

  // ... rest of your JSX rendering Swap UI ...
  return (
    <>
      <TokenWarningModal
        isOpen={urlLoadedTokens.length > 0 && !dismissTokenWarning}
        tokens={urlLoadedTokens}
        onConfirm={handleConfirmTokenWarning}
      />
      <PriceImpactConfirmationModal
        isOpen={priceImpactModalState.isOpen}
        mode={priceImpactModalState.mode}
        thresholdPercent={
          priceImpactModalState.mode === 'type-confirm'
            ? Number(PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN.toFixed(0))
            : Number(ALLOWED_PRICE_IMPACT_HIGH.toFixed(0))
        }
        onDismiss={() => {
          setPriceImpactModalState(prev => ({ ...prev, isOpen: false }))
        }}
        onConfirm={() => {
          setPriceImpactModalState(prev => ({ ...prev, isOpen: false }))
          executeSwap(true)
        }}
      />
      <AppBody>
        <SwapPoolTabs active={'swap'} />
        <Wrapper id="swap-page">
          <ConfirmSwapModal
            isOpen={showConfirm}
            trade={trade}
            originalTrade={tradeToConfirm}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            allowedSlippage={allowedSlippage}
            onConfirm={handleSwap}
            swapErrorMessage={swapErrorMessage}
            onDismiss={handleConfirmDismiss}
          />

          <AutoColumn gap={'6px'}>
            <CurrencyInputPanel
              label={independentField === Field.OUTPUT && !showWrap && trade ? '' : '-sell-'}
              value={formattedAmounts[Field.INPUT]}
              showMaxButton={!atMaxAmountInput}
              currency={currencies[Field.INPUT]}
              onUserInput={handleTypeInput}
              onMax={handleMaxInput}
              maxButtonMenuItems={!showWrap && maxAmountInput ? maxButtonMenuItems : undefined}
              onCurrencySelect={handleInputSelect}
              otherCurrency={currencies[Field.OUTPUT]}
              id="swap-currency-input"
              fiatValue={inputFiatValue}
            />
            <AutoColumn justify="center" style={{ margin: '-2px 0' }}>
              <AutoRow justify={isExpertMode ? 'space-between' : 'center'} style={{ padding: '0 .3rem' }}>
                <ArrowWrapper clickable>
                  <Repeat
                    size="16"
                    onClick={() => {
                      setApprovalSubmitted(false)
                      onSwitchTokens()
                    }}
                    color={currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.text1 : theme.text2}
                  />
                </ArrowWrapper>
                {recipient === null && !showWrap && isExpertMode ? (
                  <LinkStyledButton id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                    + Add a send (optional)
                  </LinkStyledButton>
                ) : null}
              </AutoRow>
            </AutoColumn>
            <CurrencyInputPanel
              value={formattedAmounts[Field.OUTPUT]}
              onUserInput={handleTypeOutput}
              label={independentField === Field.INPUT && !showWrap && trade ? 'To -buy-' : 'To'}
              showMaxButton={false}
              currency={currencies[Field.OUTPUT]}
              onCurrencySelect={handleOutputSelect}
              otherCurrency={currencies[Field.INPUT]}
              id="swap-currency-output"
              fiatValue={outputFiatValue}
            />

            {recipient !== null && !showWrap ? (
              <>
                <AutoRow justify="space-between" style={{ padding: '0 .3rem' }}>
                  <ArrowWrapper clickable={false}>
                    <Repeat size="18" color={theme.text2} />
                  </ArrowWrapper>
                  <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                    - Remove send
                  </LinkStyledButton>
                </AutoRow>
                <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
              </>
            ) : null}

            {showWrap ? null : (
              <Card padding={'.25rem .75rem 0 .75rem'} borderRadius={'20px'}>
                <AutoColumn gap="4px">
                  {Boolean(trade) && (
                    <RowBetween align="center">
                      <Text fontWeight={500} fontSize={14} color={theme.text2}>
                        Price
                      </Text>
                      <TradePrice
                        price={trade?.executionPrice}
                        showInverted={showInverted}
                        setShowInverted={setShowInverted}
                      />
                    </RowBetween>
                  )}
                  {allowedSlippage !== INITIAL_ALLOWED_SLIPPAGE && (
                    <RowBetween align="center">
                      <ClickableText fontWeight={500} fontSize={14} color={theme.text2} onClick={toggleSettings}>
                        Slippage Tolerance
                      </ClickableText>
                      <ClickableText fontWeight={500} fontSize={14} color={theme.text2} onClick={toggleSettings}>
                        {allowedSlippage / 100}%
                      </ClickableText>
                    </RowBetween>
                  )}
                </AutoColumn>
              </Card>
            )}
          </AutoColumn>

          <BottomGrouping>
            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
            ) : showWrap ? (
              <ButtonPrimary disabled={Boolean(wrapInputError)} onClick={onWrap}>
                {wrapInputError ??
                  (wrapType === WrapType.WRAP ? 'Wrap' : wrapType === WrapType.UNWRAP ? 'Unwrap' : null)}
              </ButtonPrimary>
            ) : noRoute && userHasSpecifiedInputOutput ? (
              <GreyCard style={{ textAlign: 'center' }}>
                <TYPE.main mb="4px">Insufficient liquidity for this trade.</TYPE.main>
              </GreyCard>
            ) : showApproveFlow ? (
              <>
                <ApprovalModeRow>
                  <ApprovalModeButton width="49%" selected={!useExactApproval} onClick={() => setUseExactApproval(false)}>
                    Unlimited Approval
                  </ApprovalModeButton>
                  <ApprovalModeButton width="49%" selected={useExactApproval} onClick={() => setUseExactApproval(true)}>
                    Exact Approval
                  </ApprovalModeButton>
                </ApprovalModeRow>
                <RowBetween>
                  <ButtonConfirmed
                    onClick={handleApproveClick}
                    disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                    width="31%"
                    altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
                    confirmed={approval === ApprovalState.APPROVED}
                  >
                    {approval === ApprovalState.PENDING ? (
                      <AutoRow gap="6px" justify="center">
                        Approving <Loader stroke="white" />
                      </AutoRow>
                    ) : approval === ApprovalState.APPROVED ? (
                      'Approved'
                    ) : useExactApproval ? (
                      'Approve Exact'
                    ) : (
                      'Approve Max'
                    )}
                  </ButtonConfirmed>
                  <ButtonLight
                    onClick={handleRevokeApproval}
                    width="31%"
                    disabled={
                      approval !== ApprovalState.APPROVED ||
                      revokingApproval ||
                      !approvalTokenContract ||
                      !approvalSpender ||
                      !inputToken
                    }
                  >
                    {revokingApproval ? 'Revoking...' : 'Revoke'}
                  </ButtonLight>
                  <ButtonError
                    onClick={() => {
                      if (isExpertMode) {
                        handleSwap()
                      } else {
                        setSwapState({
                          tradeToConfirm: trade,
                          attemptingTxn: false,
                          swapErrorMessage: undefined,
                          showConfirm: true,
                          txHash: undefined
                        })
                      }
                    }}
                    width="31%"
                    id="swap-button"
                    disabled={
                      !isValid || approval !== ApprovalState.APPROVED || (priceImpactSeverity > 3 && !isExpertMode)
                    }
                    error={isValid && priceImpactSeverity > 2}
                  >
                    <Text fontSize={16} fontWeight={500}>
                      {priceImpactSeverity > 3 && !isExpertMode
                        ? `Price Impact High`
                        : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                    </Text>
                  </ButtonError>
                </RowBetween>
                {approvalActionError && (
                  <TYPE.body style={{ marginTop: '8px' }} color="red1">
                    {approvalActionError}
                  </TYPE.body>
                )}
              </>
            ) : (
              <ButtonError
                onClick={() => {
                  if (isExpertMode) {
                    handleSwap()
                  } else {
                    setSwapState({
                      tradeToConfirm: trade,
                      attemptingTxn: false,
                      swapErrorMessage: undefined,
                      showConfirm: true,
                      txHash: undefined
                    })
                  }
                }}
                id="swap-button"
                disabled={!isValid || (priceImpactSeverity > 3 && !isExpertMode) || !!swapCallbackError}
                error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
              >
                <Text fontSize={20} fontWeight={500}>
                  {swapInputError
                    ? swapInputError
                    : priceImpactSeverity > 3 && !isExpertMode
                    ? `Price Impact Too High`
                    : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                </Text>
              </ButtonError>
            )}
            {showApproveFlow && <ProgressSteps steps={[approval === ApprovalState.APPROVED]} />}
            {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
            {betterTradeLinkVersion && <BetterTradeLink version={betterTradeLinkVersion} />}
          </BottomGrouping>
          <AutoRow justify="center" marginTop={'10px'}></AutoRow>
        </Wrapper>
      </AppBody>
      <AdvancedSwapDetailsDropdown trade={trade} />
    </>
  )
}

export default withRouter(Swap)
