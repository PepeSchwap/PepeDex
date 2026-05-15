// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React from 'react'
import { Redirect, RouteComponentProps } from 'react-router-dom'
// Redirects to swap but only replace the pathname
export function RedirectPathToSwapOnly({ location }: RouteComponentProps) {
  return <Redirect to={{ ...location, pathname: '/swap' }} />
}

// Redirects from the /swap/:outputCurrency path to the /swap?outputCurrency=:outputCurrency format
export function RedirectToSwap(props: RouteComponentProps<{ outputCurrency: string }>) {
  const {
    location: { search },
    match: {
      params: { outputCurrency }
    }
  } = props

  const params = new URLSearchParams(search)
  params.set('outputCurrency', outputCurrency)

  const newSearch = params.toString()

  return (
    <Redirect
      to={{
        ...props.location,
        pathname: '/swap',
        search: newSearch ? `?${newSearch}` : ''
      }}
    />
  )
}
