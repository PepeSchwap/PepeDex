import { stringify } from 'qs'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import useToggledVersion, { Version } from '../../hooks/useToggledVersion'
import { MouseoverTooltip } from '../Tooltip'

const VersionLabel = styled.span<{ enabled: boolean }>`
  padding: 0.35rem 0.6rem;
  border-radius: 5px;
  background: ${({ theme, enabled }) => (enabled ? theme.primary1 : 'none')};
  color: ${({ theme, enabled }) => (enabled ? theme.white : theme.text1)};
  font-size: 1rem;
  font-weight: ${({ enabled }) => (enabled ? '500' : '400')};
  :hover {
    user-select: ${({ enabled }) => (enabled ? 'none' : 'initial')};
    background: ${({ theme, enabled }) => (enabled ? theme.primary1 : 'none')};
    color: ${({ theme, enabled }) => (enabled ? theme.white : theme.text1)};
  }
`

interface VersionToggleProps extends React.ComponentProps<typeof Link> {
  enabled: boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VersionToggle = styled(({ enabled, ...rest }: VersionToggleProps) => <Link {...rest} />)<VersionToggleProps>`
  border-radius: 5px;
  opacity: ${({ enabled }) => (enabled ? 1 : 0.5)};
  cursor: ${({ enabled }) => (enabled ? 'pointer' : 'default')};
  background: ${({ theme }) => theme.bg1};
  color: ${({ theme }) => theme.primary1};
  display: flex;
  width: fit-content;
  margin-left: 0.5rem;
  text-decoration: none;
  :hover {
    text-decoration: none;
  }
`

export default function VersionSwitch() {
  const version = useToggledVersion()
  const query = useParsedQueryString()
  const versionSwitchAvailable = window.location.pathname === '/swap' || window.location.pathname === '/send'

  const toggleDest = useMemo(() => {
    const hashIndex = window.location.hash.indexOf('?')
    const pathname = hashIndex >= 0 ? window.location.hash.substring(0, hashIndex) : window.location.hash
    const newSearch = stringify({ ...query, use: version === Version.v1 ? undefined : Version.v1 })
    return versionSwitchAvailable
      ? {
          pathname: pathname.startsWith('#') ? pathname.slice(1) : pathname,
          search: `?${newSearch}`
        }
      : { pathname: pathname.startsWith('#') ? pathname.slice(1) : pathname }
  }, [query, version, versionSwitchAvailable])

  const handleClick = useCallback(
    e => {
      if (!versionSwitchAvailable) e.preventDefault()
    },
    [versionSwitchAvailable]
  )

  const toggle = (
    <VersionToggle enabled={versionSwitchAvailable} to={toggleDest} onClick={handleClick}>
      <VersionLabel enabled={version === Version.v2 || !versionSwitchAvailable}>15%</VersionLabel>
      <VersionLabel enabled={version === Version.v1 && versionSwitchAvailable}>Legacy</VersionLabel>
    </VersionToggle>
  )
  return versionSwitchAvailable ? (
    toggle
  ) : (
    <MouseoverTooltip text="This page is only compatible with PEPE Dex V2.">{toggle}</MouseoverTooltip>
  )
}
