export const OPTIONAL_GITHUB_TOKEN_LIST_URL =
  'https://raw.githubusercontent.com/GoDexTop/dextopList/refs/heads/main/dextop-list.json'
export const OPTIONAL_PITEAS_TOKEN_LIST_URL =
  'https://raw.githubusercontent.com/piteasio/app-tokens/refs/heads/main/piteas-tokenlist.json'

// Start with the default public token list.
export const DEFAULT_TOKEN_LIST_URL = 'https://tokenlists.org/'

// GitHub list is optional and can be selected manually.
export const DEFAULT_LIST_OF_LISTS: string[] = [
  DEFAULT_TOKEN_LIST_URL,
  OPTIONAL_GITHUB_TOKEN_LIST_URL,
  OPTIONAL_PITEAS_TOKEN_LIST_URL
]
