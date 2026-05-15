import { parse, ParsedQs } from 'qs'
import { useEffect, useMemo, useState } from 'react'

function getCurrentSearch(): string {
  if (typeof window === 'undefined') return ''

  const hashQueryIndex = window.location.hash.indexOf('?')
  if (hashQueryIndex >= 0) {
    return window.location.hash.slice(hashQueryIndex)
  }

  return window.location.search
}

export default function useParsedQueryString(): ParsedQs {
  const [search, setSearch] = useState(getCurrentSearch)

  useEffect(() => {
    const updateSearch = () => {
      setSearch(getCurrentSearch())
    }

    window.addEventListener('hashchange', updateSearch)
    window.addEventListener('popstate', updateSearch)

    return () => {
      window.removeEventListener('hashchange', updateSearch)
      window.removeEventListener('popstate', updateSearch)
    }
  }, [])

  return useMemo(
    () => (search && search.length > 1 ? parse(search, { parseArrays: false, ignoreQueryPrefix: true }) : {}),
    [search]
  )
}
