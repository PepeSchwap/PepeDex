// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useState } from 'react'
import { HelpCircle as Question } from 'react-feather'
import styled from 'styled-components'
import Tooltip from '../Tooltip'

const QuestionWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border: ${({ theme }) => theme.text1};
  background: none;
  outline: none;
  cursor: default;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text2};

  :hover,
  :focus {
    opacity: 0.7;
  }
`

export default function QuestionHelper({ text }: { text: string }) {
  const [show, setShow] = useState<boolean>(false)

  const toggle = useCallback(() => setShow(s => !s), [])
  const close = useCallback(() => setShow(false), [])

  return (
    <span style={{ marginLeft: 4 }}>
      <Tooltip text={text} show={show}>
        <QuestionWrapper onClick={toggle} onMouseLeave={close}>
          <Question size={16} />
        </QuestionWrapper>
      </Tooltip>
    </span>
  )
}
