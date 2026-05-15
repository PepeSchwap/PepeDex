import { createReducer } from '@reduxjs/toolkit'
import { getVersionUpgrade, VersionUpgrade } from '@uniswap/token-lists'
import { TokenList } from '@uniswap/token-lists/dist/types'
import { updateVersion } from '../global/actions'
import { acceptListUpdate, addList, disableList, enableList, fetchTokenList, removeList, selectList } from './actions'
import { pulseChainTokenList } from '../../utils/getTokenList'
import { OPTIONAL_GITHUB_TOKEN_LIST_URL, OPTIONAL_PITEAS_TOKEN_LIST_URL } from '../../constants/lists'

/* eslint-disable prettier/prettier */
export interface ListsState {
  readonly byUrl: {
    readonly [url: string]: {
      readonly current: TokenList | null
      readonly pendingUpdate: TokenList | null
      readonly loadingRequestId: string | null
      readonly error: string | null
    }
  }
  readonly selectedListUrl: string | undefined
  readonly enabledListUrls: string[]
}
/* eslint-enable prettier/prettier */

const NEW_LIST_STATE: ListsState['byUrl'][string] = {
  error: null,
  current: null,
  loadingRequestId: null,
  pendingUpdate: null
}

const DEFAULT_LOCAL_LIST_URL = 'default'

const initialState: ListsState = {
  byUrl: {
    default: {
      error: null,
      current: pulseChainTokenList, // Directly load the default token list here
      loadingRequestId: null,
      pendingUpdate: null
    },
    [OPTIONAL_GITHUB_TOKEN_LIST_URL]: {
      error: null,
      current: null,
      loadingRequestId: null,
      pendingUpdate: null
    },
    [OPTIONAL_PITEAS_TOKEN_LIST_URL]: {
      error: null,
      current: null,
      loadingRequestId: null,
      pendingUpdate: null
    }
  },
  selectedListUrl: 'default', // Directly select 'default' list as the active list
  enabledListUrls: ['default']
}

export default createReducer(initialState, builder =>
  builder
    .addCase(fetchTokenList.pending, (state, { payload: { requestId, url } }) => {
      state.byUrl[url] = {
        ...state.byUrl[url],
        current: null,
        pendingUpdate: null,
        loadingRequestId: requestId,
        error: null
      }
    })
    .addCase(fetchTokenList.fulfilled, (state, { payload: { requestId, tokenList, url } }) => {
      const current = state.byUrl[url]?.current
      const loadingRequestId = state.byUrl[url]?.loadingRequestId

      if (current) {
        const upgradeType = getVersionUpgrade(current.version, tokenList.version)
        if (upgradeType === VersionUpgrade.NONE) return
        if (loadingRequestId === null || loadingRequestId === requestId) {
          state.byUrl[url] = {
            ...state.byUrl[url],
            loadingRequestId: null,
            error: null,
            current: current,
            pendingUpdate: tokenList
          }
        }
      } else {
        state.byUrl[url] = {
          ...state.byUrl[url],
          loadingRequestId: null,
          error: null,
          current: tokenList,
          pendingUpdate: null
        }
      }
    })
    .addCase(fetchTokenList.rejected, (state, { payload: { url, requestId, errorMessage } }) => {
      if (state.byUrl[url]?.loadingRequestId !== requestId) {
        return
      }

      state.byUrl[url] = {
        ...state.byUrl[url],
        loadingRequestId: null,
        error: errorMessage,
        current: null,
        pendingUpdate: null
      }
    })
    .addCase(selectList, (state, { payload: url }) => {
      state.selectedListUrl = url
      if (!state.byUrl[url]) {
        state.byUrl[url] = NEW_LIST_STATE
      }
    })
    .addCase(addList, (state, { payload: url }) => {
      if (!state.byUrl[url]) {
        state.byUrl[url] = NEW_LIST_STATE
      }
    })
    .addCase(removeList, (state, { payload: url }) => {
      if (url === DEFAULT_LOCAL_LIST_URL) {
        return
      }
      if (state.byUrl[url]) {
        delete state.byUrl[url]
      }
      const enabled = state.enabledListUrls ?? Object.keys(state.byUrl)
      state.enabledListUrls = [DEFAULT_LOCAL_LIST_URL, ...enabled.filter(u => u !== url && u !== DEFAULT_LOCAL_LIST_URL)]
      if (state.selectedListUrl === url) {
        state.selectedListUrl = state.enabledListUrls[0] ?? Object.keys(state.byUrl)[0] ?? undefined
      }
    })
    .addCase(enableList, (state, { payload: url }) => {
      const enabled = state.enabledListUrls ?? Object.keys(state.byUrl)
      if (!enabled.includes(url)) {
        state.enabledListUrls = [DEFAULT_LOCAL_LIST_URL, ...enabled.filter(u => u !== DEFAULT_LOCAL_LIST_URL), url]
      } else {
        state.enabledListUrls = [DEFAULT_LOCAL_LIST_URL, ...enabled.filter(u => u !== DEFAULT_LOCAL_LIST_URL)]
      }
    })
    .addCase(disableList, (state, { payload: url }) => {
      if (url === DEFAULT_LOCAL_LIST_URL) {
        return
      }
      const enabled = state.enabledListUrls ?? Object.keys(state.byUrl)
      state.enabledListUrls = [DEFAULT_LOCAL_LIST_URL, ...enabled.filter(u => u !== url && u !== DEFAULT_LOCAL_LIST_URL)]
    })
    .addCase(acceptListUpdate, (state, { payload: url }) => {
      if (!state.byUrl[url]?.pendingUpdate) {
        throw new Error('accept list update called without pending update')
      }
      state.byUrl[url] = {
        ...state.byUrl[url],
        current: state.byUrl[url].pendingUpdate,
        pendingUpdate: null
      }
    })
    .addCase(updateVersion, state => {
      // Reset state if necessary, but no need for list management on first load anymore
    })
)
