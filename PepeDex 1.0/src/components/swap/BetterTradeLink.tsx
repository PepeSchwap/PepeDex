import { stringify } from 'qs'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useContext, useMemo } from 'react'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { DEFAULT_VERSION, Version } from '../../hooks/useToggledVersion'

import { StyledInternalLink } from '../../theme'
import { YellowCard } from '../Card'
import { AutoColumn } from '../Column'

export default function BetterTradeLink({ version }: { version: Version }) {
  const theme = useContext(ThemeContext)
  const search = useParsedQueryString()

  const linkDestination = useMemo(() => {
    const hashIndex = window.location.hash.indexOf('?')
    const pathname = hashIndex >= 0 ? window.location.hash.substring(0, hashIndex) : window.location.hash
    const newSearch = stringify({
      ...search,
      use: version !== DEFAULT_VERSION ? version : undefined
    })
    return {
      pathname: pathname.startsWith('#') ? pathname.slice(1) : pathname,
      search: `?${newSearch}`
    }
  }, [search, version])

  return (
    <YellowCard style={{ marginTop: '12px', padding: '8px 4px' }}>
      <AutoColumn gap="sm" justify="center" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Text lineHeight="145.23%;" fontSize={14} fontWeight={400} color={theme.text1}>
          There is a better price for this trade on{' '}
          <StyledInternalLink to={linkDestination}>
            <b>PEPE Dex {version.toUpperCase()} -&gt;</b>
          </StyledInternalLink>
        </Text>
      </AutoColumn>
    </YellowCard>
  )
}
