import { TokenList } from '@uniswap/token-lists'
import contenthashToUri from './contenthashToUri'
import { parseENSAddress } from './parseENSAddress'
import uriToHttp from './uriToHttp'
import { OPTIONAL_GITHUB_TOKEN_LIST_URL } from '../constants/lists'

/**
 * The local token list, in this case for PulseChain tokens.
 */
export const pulseChainTokenList: TokenList = {
  name: 'Tokens list',
  timestamp: '2024-15-09T00:00:00+00:00',
  version: { major: 1, minor: 0, patch: 0 },
  tokens: [
    {
      name: 'HEX',
      symbol: 'HEX',
      address: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39',
      chainId: 369,
      decimals: 8,
      logoURI: 'https://tokens.app.pulsex.com/images/tokens/0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39.png'
    },
    {
      name: 'USD Coin from Ethereum',
      symbol: 'USDC from ETH',
      address: '0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07',
      chainId: 369,
      decimals: 6,
      logoURI:
        'https://tokens.app.pulsex.com/images/tokens/0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07.png'
    },
    {
      name: 'Dai Stablecoin from Ethereum',
      symbol: 'DAI from ETH',
      address: '0xefD766cCb38EaF1dfd701853BFCe31359239F305',
      chainId: 369,
      decimals: 18,
      logoURI:
        'https://tokens.app.pulsex.com/images/tokens/0xefD766cCb38EaF1dfd701853BFCe31359239F305.png'
    },
    {
      name: 'Incentive Token',
      symbol: 'INC',
      address: '0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',
      chainId: 369,
      decimals: 18,
      logoURI: 'https://tokens.app.pulsex.com/images/tokens/0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d.png'
    },
    {
      name: 'Pepe Token',
      symbol: 'PEPE',
      address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      chainId: 369,
      decimals: 18,
      logoURI: 'https://tokens.app.pulsex.com/images/tokens/0x6982508145454Ce325dDbE47a25d4ec3d2311933.png'
    },
    {
      name: 'PulseX',
      symbol: 'PLSX',
      address: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
      chainId: 369,
      decimals: 18,
      logoURI: 'https://tokens.app.pulsex.com/images/tokens/0x95B303987A60C71504D99Aa1b13B4DA07b0790ab.png'
    },
    {
      name: 'Wrapped BTC from Ethereum',
      symbol: 'WBTC',
      address: '0xb17D901469B9208B17d916112988A3FeD19b5cA1',
      chainId: 369,
      decimals: 8,
      logoURI: 'https://tokens.app.pulsex.com/images/tokens/0xb17D901469B9208B17d916112988A3FeD19b5cA1.png'
    },
    {
      name: 'Wrapped Pulse',
      symbol: 'WPLS',
      address: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27',
      chainId: 369,
      decimals: 18,
      logoURI: ''
    }
  ],
  logoURI: 'https://tokens.app.pulsex.com/images/tokens/0x6982508145454Ce325dDbE47a25d4ec3d2311933.png'
}

/**
 * Returns a token list from the provided URL/ENS name, with local fallback.
 * @param listUrl The list URL or ENS name to resolve, if needed.
 * @param resolveENSContentHash Function to resolve ENS content hash.
 */
export default async function getTokenList(
  listUrl: string,
  resolveENSContentHash: (ensName: string) => Promise<string>
): Promise<TokenList> {
  // First, try direct URL resolution from the selected list URL.
  const urls = uriToHttp(listUrl)
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const json = await response.json()
        return json as TokenList
      }
    } catch (error) {
      console.debug('Failed to fetch list from', url, error)
    }
  }

  // Then try ENS resolution if provided
  const parsedENS = parseENSAddress(listUrl)
  if (parsedENS) {
    let contentHashUri
    try {
      contentHashUri = await resolveENSContentHash(parsedENS.ensName)
      const translatedUri = contenthashToUri(contentHashUri)
      const urls = uriToHttp(`${translatedUri}${parsedENS.ensPath ?? ''}`)
      for (const url of urls) {
        try {
          const response = await fetch(url)
          if (response.ok) {
            const json = await response.json()
            return json as TokenList
          }
        } catch (error) {
          console.debug('Failed to fetch list from', url, error)
        }
      }
    } catch (error) {
      console.debug(`Failed to resolve ENS name: ${parsedENS.ensName}`, error)
    }
  }

  if (listUrl === OPTIONAL_GITHUB_TOKEN_LIST_URL) {
    console.debug('Optional GitHub token list unavailable, using local fallback list')
  }

  // Fallback to using the locally defined token list
  return pulseChainTokenList
}
