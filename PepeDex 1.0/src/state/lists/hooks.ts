import { ChainId, Token } from '@uniswap/sdk'
import { Tags, TokenInfo, TokenList } from '@uniswap/token-lists'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { AppState } from '../index'

type TagDetails = Tags[keyof Tags]
export interface TagInfo extends TagDetails {
  id: string
}

/**
 * Token instances created from token info.
 */
export class WrappedTokenInfo extends Token {
  public readonly tokenInfo: TokenInfo
  public readonly tags: TagInfo[]
  constructor(tokenInfo: TokenInfo, tags: TagInfo[]) {
    super(tokenInfo.chainId, tokenInfo.address, tokenInfo.decimals, tokenInfo.symbol, tokenInfo.name)
    this.tokenInfo = tokenInfo
    this.tags = tags
  }
  public get logoURI(): string | undefined {
    return this.tokenInfo.logoURI
  }
}

export type TokenAddressMap = Readonly<{ [chainId in ChainId]: Readonly<{ [tokenAddress: string]: WrappedTokenInfo }> }>

/**
 * An empty result, useful as a default.
 */
const EMPTY_LIST: TokenAddressMap = {
  [ChainId.MAINNET]: {}
}

const DEFAULT_LOCAL_LIST_URL = 'default'

const listCache: WeakMap<TokenList, TokenAddressMap> | null =
  typeof WeakMap !== 'undefined' ? new WeakMap<TokenList, TokenAddressMap>() : null

export function listToTokenMap(list: TokenList): TokenAddressMap {
  const result = listCache?.get(list)
  if (result) return result

  const map = list.tokens.reduce<TokenAddressMap>(
    (tokenMap, tokenInfo) => {
      const tags: TagInfo[] =
        tokenInfo.tags
          ?.map(tagId => {
            if (!list.tags?.[tagId]) return undefined
            return { ...list.tags[tagId], id: tagId }
          })
          ?.filter((x): x is TagInfo => Boolean(x)) ?? []
      const token = new WrappedTokenInfo(tokenInfo, tags)
      // Initialize the chainId if it doesn't exist
      if (!tokenMap[token.chainId]) {
        tokenMap = {
          ...tokenMap,
          [token.chainId]: {}
        }
      }
      if (tokenMap[token.chainId][token.address] !== undefined) throw Error('Duplicate tokens.')
      return {
        ...tokenMap,
        [token.chainId]: {
          ...tokenMap[token.chainId],
          [token.address]: token
        }
      }
    },
    { ...EMPTY_LIST }
  )
  listCache?.set(list, map)
  return map
}

export function useTokenList(url: string | undefined): TokenAddressMap {
  const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  return useMemo(() => {
    if (!url) return EMPTY_LIST
    const current = lists[url]?.current
    if (!current) return EMPTY_LIST
    try {
      return listToTokenMap(current)
    } catch (error) {
      console.error('Could not show token list due to error', error)
      return EMPTY_LIST
    }
  }, [lists, url])
}

export function useSelectedListUrl(): string | undefined {
  return useSelector<AppState, AppState['lists']['selectedListUrl']>(state => state.lists.selectedListUrl)
}

export function useEnabledListUrls(): string[] {
  return useSelector<AppState, AppState['lists']['enabledListUrls']>(
    state => state.lists.enabledListUrls ?? ['default']
  )
}

export function useIsListEnabled(url: string): boolean {
  const enabledListUrls = useEnabledListUrls()
  return (enabledListUrls ?? []).includes(url)
}

export function useSelectedTokenList(): TokenAddressMap {
  const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  const enabledListUrls = useEnabledListUrls()
  return useMemo(() => {
    const urls = Array.from(new Set([DEFAULT_LOCAL_LIST_URL, ...(enabledListUrls ?? Object.keys(lists))]))
    if (urls.length === 0) return EMPTY_LIST
    return urls.reduce<TokenAddressMap>(
      (merged, url) => {
        const current = lists[url]?.current
        if (!current) return merged
        try {
          const tokenMap = listToTokenMap(current)
          const mergedChain = {
            ...merged[ChainId.MAINNET],
            ...tokenMap[ChainId.MAINNET]
          }
          return { [ChainId.MAINNET]: mergedChain } as TokenAddressMap
        } catch (error) {
          console.error('Could not show token list due to error', error)
          return merged
        }
      },
      { ...EMPTY_LIST }
    )
  }, [lists, enabledListUrls])
}

export function useSelectedListInfo(): { current: TokenList | null; pending: TokenList | null; loading: boolean } {
  const selectedUrl = useSelectedListUrl()
  const listsByUrl = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  const list = selectedUrl ? listsByUrl[selectedUrl] : undefined
  return {
    current: list?.current ?? null,
    pending: list?.pendingUpdate ?? null,
    loading: list?.loadingRequestId !== null
  }
}

// returns all downloaded current lists
export function useAllLists(): TokenList[] {
  const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)

  return useMemo(
    () =>
      Object.keys(lists)
        .map(url => lists[url].current)
        .filter((l): l is TokenList => Boolean(l)),
    [lists]
  )
}
