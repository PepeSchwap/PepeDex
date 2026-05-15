import { MaxUint256 } from '@ethersproject/constants'
import { TransactionResponse } from '@ethersproject/providers'
import { Trade, TokenAmount, CurrencyAmount, ETHER } from '@uniswap/sdk'
import { useCallback, useMemo } from 'react'
import { ROUTER_ADDRESS } from '../constants'
import { useTokenAllowance } from '../data/Allowances'
import { getTradeVersion, useV1TradeExchangeAddress } from '../data/V1'
import { Field } from '../state/swap/actions'
import { useTransactionAdder, useHasPendingApproval } from '../state/transactions/hooks'
import { computeSlippageAdjustedAmounts } from '../utils/prices'
import { calculateGasMargin, getHigherGasPrice } from '../utils'
import { useTokenContract } from './useContract'
import { useActiveWeb3React } from './index'
import { Version } from './useToggledVersion'

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED
}

// returns a variable indicating the state of the approval and a function which approves if necessary or early returns
export function useApproveCallback(
  amountToApprove?: CurrencyAmount,
  spender?: string,
  useExactApproval = false
): [ApprovalState, () => Promise<void>] {
  const { account } = useActiveWeb3React()
  const token = amountToApprove instanceof TokenAmount ? amountToApprove.token : undefined
  const currentAllowance = useTokenAllowance(token, account ?? undefined, spender)
  const pendingApproval = useHasPendingApproval(token?.address, spender)

  // check the current approval status
  const approvalState: ApprovalState = useMemo(() => {
    if (!amountToApprove || !spender) return ApprovalState.UNKNOWN
    if (amountToApprove.currency === ETHER) return ApprovalState.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance) return ApprovalState.UNKNOWN

    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove)
      ? pendingApproval
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  }, [amountToApprove, currentAllowance, pendingApproval, spender])

  const tokenContract = useTokenContract(token?.address)
  const addTransaction = useTransactionAdder()

  const approve = useCallback(async (): Promise<void> => {
    if (approvalState !== ApprovalState.NOT_APPROVED) {
      console.error('approve was called unnecessarily')
      return
    }
    if (!token) {
      console.error('no token')
      return
    }

    if (!tokenContract) {
      console.error('tokenContract is null')
      return
    }

    if (!amountToApprove) {
      console.error('missing amount to approve')
      return
    }

    if (!spender) {
      console.error('no spender')
      return
    }

    const exactAmount = amountToApprove.raw.toString()
    let approvalAmount = useExactApproval ? exactAmount : MaxUint256

    const estimatedGas = await tokenContract.estimateGas.approve(spender, approvalAmount).catch(() => {
      // fallback for tokens that restrict max approvals
      approvalAmount = exactAmount
      return tokenContract.estimateGas.approve(spender, exactAmount)
    })

    const gasPrice = await getHigherGasPrice(tokenContract.provider as { getGasPrice?: () => Promise<any> })

    return tokenContract
      .approve(spender, approvalAmount, {
        gasLimit: calculateGasMargin(estimatedGas),
        ...(gasPrice ? { gasPrice } : {})
      })
      .then((response: TransactionResponse) => {
        localStorage.setItem(
          'dextop.lastApproval',
          JSON.stringify({ tokenAddress: token.address, spender, exact: approvalAmount === exactAmount })
        )

        addTransaction(response, {
          summary: (approvalAmount === exactAmount ? 'Approve exact ' : 'Approve unlimited ') + amountToApprove.currency.symbol,
          approval: { tokenAddress: token.address, spender: spender }
        })
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [approvalState, token, tokenContract, amountToApprove, spender, addTransaction, useExactApproval])

  return [approvalState, approve]
}

// wraps useApproveCallback in the context of a swap
export function useApproveCallbackFromTrade(trade?: Trade, allowedSlippage = 0, useExactApproval = false) {
  const amountToApprove = useMemo(
    () => (trade ? computeSlippageAdjustedAmounts(trade, allowedSlippage)[Field.INPUT] : undefined),
    [trade, allowedSlippage]
  )
  const tradeIsV1 = getTradeVersion(trade) === Version.v1
  const v1ExchangeAddress = useV1TradeExchangeAddress(trade)
  return useApproveCallback(amountToApprove, tradeIsV1 ? v1ExchangeAddress : ROUTER_ADDRESS, useExactApproval)
}
