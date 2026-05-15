// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React from 'react'
import styled from 'styled-components'

export const BodyWrapper = styled.div`
  position: relative;
  max-width: 500px;
  width: 100%;
  background: ${({ theme }) => theme.bg1};
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 10px;
  padding: 1rem;
  border: 3px solid rgba(169, 169, 169, 0.5); 
  box-shadow: 0 0 5px rgba(169, 169, 169, 0.5); 
`
/**
 * The styled container element that wraps the content of most pages and the tabs.
 */
export default function AppBody({ children }: { children: React.ReactNode }) {
  return <BodyWrapper>{children}</BodyWrapper>
}
