import { Contract } from '@ethersproject/contracts'
import { useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useActiveWeb3React } from '../../hooks'
import { useMulticallContract } from '../../hooks/useContract'
import useDebounce from '../../hooks/useDebounce'
import chunkArray from '../../utils/chunkArray'
import { retry, RetryableError } from '../../utils/retry'
import { useBlockNumber } from '../application/hooks'
import { AppDispatch, AppState } from '../index'
import {
  Call,
  errorFetchingMulticallResults,
  fetchingMulticallResults,
  parseCallKey,
  updateMulticallResults
} from './actions'

// chunk calls so we do not exceed the gas limit
const DEFAULT_CALL_CHUNK_SIZE = 4
const DEFAULT_MAX_PARALLEL_CHUNKS = 2

function parsePositiveIntegerOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const CALL_CHUNK_SIZE = parsePositiveIntegerOrDefault(process.env.REACT_APP_MULTICALL_CHUNK_SIZE, DEFAULT_CALL_CHUNK_SIZE)
const MAX_PARALLEL_CHUNKS = parsePositiveIntegerOrDefault(
  process.env.REACT_APP_MULTICALL_MAX_PARALLEL_CHUNKS,
  DEFAULT_MAX_PARALLEL_CHUNKS
)

function toSafeBlockNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number(value)
  if (value && typeof value.toNumber === 'function') return value.toNumber()
  if (value && typeof value._hex === 'string') return Number(value._hex)

  throw new Error(`Unsupported block number type: ${String(value)}`)
}

/**
 * Fetches a chunk of calls, enforcing a minimum block number constraint
 * @param multicallContract multicall contract to fetch against
 * @param chunk chunk of calls to make
 * @param minBlockNumber minimum block number of the result set
 */
async function fetchChunk(
  multicallContract: Contract,
  chunk: Call[],
  minBlockNumber: number
): Promise<{ results: Array<string | null>; blockNumber: number }> {
  console.debug('Fetching chunk', multicallContract, chunk, minBlockNumber)
  let resultsBlockNumber, returnData
  try {
    ;[resultsBlockNumber, returnData] = await multicallContract.aggregate(chunk.map(obj => [obj.address, obj.callData]))
  } catch (error) {
    console.debug('Failed to fetch chunk via aggregate, falling back to per-call eth_call', error)

    const provider = multicallContract.provider
    if (!provider) {
      throw error
    }

    const individualResults = await Promise.all(
      chunk.map(call =>
        provider
          .call({ to: call.address, data: call.callData }, 'latest')
          .then(result => result)
          .catch(individualError => {
            console.debug('Individual multicall fallback failed', call, individualError)
            return null
          })
      )
    )

    resultsBlockNumber = await provider.getBlockNumber()
    returnData = individualResults
  }
  const normalizedBlockNumber = toSafeBlockNumber(resultsBlockNumber)
  if (normalizedBlockNumber < minBlockNumber) {
    console.debug(`Fetched results for old block number: ${normalizedBlockNumber} vs. ${minBlockNumber}`)
    throw new RetryableError('Fetched for old block number')
  }
  return { results: returnData, blockNumber: normalizedBlockNumber }
}

/**
 * From the current all listeners state, return each call key mapped to the
 * minimum number of blocks per fetch. This is how often each key must be fetched.
 * @param allListeners the all listeners state
 * @param chainId the current chain id
 */
export function activeListeningKeys(
  allListeners: AppState['multicall']['callListeners'],
  chainId?: number
): { [callKey: string]: number } {
  if (!allListeners || !chainId) return {}
  const listeners = allListeners[chainId]
  if (!listeners) return {}

  return Object.keys(listeners).reduce<{ [callKey: string]: number }>((memo, callKey) => {
    const keyListeners = listeners[callKey]

    memo[callKey] = Object.keys(keyListeners)
      .filter(key => {
        const blocksPerFetch = parseInt(key)
        if (blocksPerFetch <= 0) return false
        return keyListeners[blocksPerFetch] > 0
      })
      .reduce((previousMin, current) => {
        return Math.min(previousMin, parseInt(current))
      }, Infinity)
    return memo
  }, {})
}

/**
 * Return the keys that need to be refetched
 * @param callResults current call result state
 * @param listeningKeys each call key mapped to how old the data can be in blocks
 * @param chainId the current chain id
 * @param latestBlockNumber the latest block number
 */
export function outdatedListeningKeys(
  callResults: AppState['multicall']['callResults'],
  listeningKeys: { [callKey: string]: number },
  chainId: number | undefined,
  latestBlockNumber: number | undefined
): string[] {
  if (!chainId || !latestBlockNumber) return []
  const results = callResults[chainId]
  // no results at all, load everything
  if (!results) return Object.keys(listeningKeys)

  return Object.keys(listeningKeys).filter(callKey => {
    const blocksPerFetch = listeningKeys[callKey]

    const data = callResults[chainId][callKey]
    // no data, must fetch
    if (!data) return true

    const minDataBlockNumber = latestBlockNumber - (blocksPerFetch - 1)

    // already fetching it for a recent enough block, don't refetch it
    if (data.fetchingBlockNumber && data.fetchingBlockNumber >= minDataBlockNumber) return false

    // if data is older than minDataBlockNumber, fetch it
    return !data.blockNumber || data.blockNumber < minDataBlockNumber
  })
}

export default function Updater(): null {
  const dispatch = useDispatch<AppDispatch>()
  const state = useSelector<AppState, AppState['multicall']>(state => state.multicall)
  // wait for listeners to settle before triggering updates
  const debouncedListeners = useDebounce(state.callListeners, 100)
  const latestBlockNumber = useBlockNumber()
  const { chainId } = useActiveWeb3React()
  const multicallContract = useMulticallContract()
  const cancellations = useRef<{ blockNumber: number; cancellations: (() => void)[] }>()

  const listeningKeys: { [callKey: string]: number } = useMemo(() => {
    return activeListeningKeys(debouncedListeners, chainId)
  }, [debouncedListeners, chainId])

  const unserializedOutdatedCallKeys = useMemo(() => {
    return outdatedListeningKeys(state.callResults, listeningKeys, chainId, latestBlockNumber)
  }, [chainId, state.callResults, listeningKeys, latestBlockNumber])

  const serializedOutdatedCallKeys = useMemo(() => JSON.stringify(unserializedOutdatedCallKeys.sort()), [
    unserializedOutdatedCallKeys
  ])

  useEffect(() => {
    if (!latestBlockNumber || !chainId || !multicallContract) return

    const outdatedCallKeys: string[] = JSON.parse(serializedOutdatedCallKeys)
    if (outdatedCallKeys.length === 0) return
    const calls = outdatedCallKeys.map(key => parseCallKey(key))

    const chunkedCalls = chunkArray(calls, CALL_CHUNK_SIZE)
    const chunkedCallKeys = chunkArray(outdatedCallKeys, CALL_CHUNK_SIZE)

    // Only clear cancellations if it's defined
    if (cancellations.current?.blockNumber !== latestBlockNumber) {
      cancellations.current?.cancellations?.forEach(c => c())
    }

    dispatch(
      fetchingMulticallResults({
        calls,
        chainId,
        fetchingBlockNumber: latestBlockNumber
      })
    )

    cancellations.current = {
      blockNumber: latestBlockNumber,
      cancellations: []
    }

    const fetchAndDispatchChunk = (chunk: Call[], chunkCallKeys: string[]) => {
      const { promise, cancel } = retry(() => fetchChunk(multicallContract, chunk, latestBlockNumber), {
        n: 3,
        minWait: 400,
        maxWait: 2000
      })

      cancellations.current?.cancellations.push(cancel)

      return promise
        .then(({ results: returnData, blockNumber: fetchBlockNumber }) => {
          dispatch(
            updateMulticallResults({
              chainId,
              results: chunkCallKeys.reduce<{ [callKey: string]: string | null }>((memo, callKey, i) => {
                  memo[callKey] = returnData[i] ?? null
                  return memo
                }, {}),
              blockNumber: fetchBlockNumber
            })
          )
        })
        .catch(error => {
          if (error?.name === 'CancelledError' || String(error?.message || '').toLowerCase().includes('cancelled')) {
            console.debug('Multicall chunk cancelled', chunk, chainId)
            return
          }
          console.error('Failed to fetch multicall chunk', chunk, chainId, error)
          dispatch(
            errorFetchingMulticallResults({
              calls: chunk,
              chainId,
              fetchingBlockNumber: latestBlockNumber
            })
          )
        })
    }

    // Limit parallel chunk requests to reduce PulseChain RPC burst pressure.
    const run = async () => {
      for (let i = 0; i < chunkedCalls.length; i += MAX_PARALLEL_CHUNKS) {
        const windowed = chunkedCalls.slice(i, i + MAX_PARALLEL_CHUNKS)
        await Promise.all(
          windowed.map((chunk, idx) => {
            const chunkCallKeys = chunkedCallKeys[i + idx] ?? []
            return fetchAndDispatchChunk(chunk, chunkCallKeys)
          })
        )
      }
    }

    run().catch(error => {
      console.error('One or more multicall chunks failed', error)
    })
  }, [chainId, multicallContract, dispatch, serializedOutdatedCallKeys, latestBlockNumber])

  return null
}
