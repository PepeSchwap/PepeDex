// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useEffect, useRef } from 'react'

import styled from 'styled-components'

import { useActiveWeb3React } from '../../hooks'
import Jazzicon from 'jazzicon'

const StyledIdenticonContainer = styled.div`
  height: 1rem;
  width: 1rem;
  border-radius: 1.125rem;
  background-color: ${({ theme }) => theme.bg4};
  overflow: hidden;

  > div {
    height: 100%;
    width: 100%;
  }
`

export default function Identicon() {
  const ref = useRef<HTMLDivElement>()

  const { account } = useActiveWeb3React()

  useEffect(() => {
    if (account && ref.current) {
      ref.current.innerHTML = ''
      ref.current.appendChild(Jazzicon(16, parseInt(account.slice(2, 10), 16)))
    }
  }, [account])

  // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/30451
  return (
    <StyledIdenticonContainer>
      <div ref={ref as React.RefObject<HTMLDivElement>} />
    </StyledIdenticonContainer>
  )
}
