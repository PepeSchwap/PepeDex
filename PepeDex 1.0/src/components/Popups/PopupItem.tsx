// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useContext, useEffect } from 'react'
import { X } from 'react-feather'
import { useSpring } from 'react-spring/web'
import styled, { ThemeContext } from 'styled-components'
import { animated } from 'react-spring'
import { PopupContent } from '../../state/application/actions'
import { useRemovePopup } from '../../state/application/hooks'
import ListUpdatePopup from './ListUpdatePopup'
import TransactionPopup from './TransactionPopup'

export const StyledCloseButton = styled.button`
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 3;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    background: ${({ theme }) => theme.bg3};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary1};
    outline-offset: 1px;
  }
`

export const StyledClose = styled(X)`
  pointer-events: none;
`
export const Popup = styled.div`
  display: inline-block;
  width: 100%;
  padding: 1em;
  background-color: ${({ theme }) => theme.bg1};
  position: relative;
  border-radius: 10px;
  padding: 20px;
  padding-right: 35px;
  overflow: hidden;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    min-width: 290px;
  `}
`
const Fader = styled.div`
  position: absolute;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 2px;
  background-color: ${({ theme }) => theme.bg3};
`

const AnimatedFader = animated(Fader)

export default function PopupItem({
  removeAfterMs,
  content,
  popKey
}: {
  removeAfterMs: number | null
  content: PopupContent
  popKey: string
}) {
  const removePopup = useRemovePopup()
  const removeThisPopup = useCallback(() => removePopup(popKey), [popKey, removePopup])
  useEffect(() => {
    if (removeAfterMs === null) return undefined

    const timeout = setTimeout(() => {
      removeThisPopup()
    }, removeAfterMs)

    return () => {
      clearTimeout(timeout)
    }
  }, [removeAfterMs, removeThisPopup])

  const theme = useContext(ThemeContext)

  let popupContent
  if ('txn' in content) {
    const {
      txn: { hash, success, summary }
    } = content
    popupContent = <TransactionPopup hash={hash} success={success} summary={summary} />
  } else if ('listUpdate' in content) {
    const {
      listUpdate: { listUrl, oldList, newList, auto }
    } = content
    popupContent = <ListUpdatePopup popKey={popKey} listUrl={listUrl} oldList={oldList} newList={newList} auto={auto} />
  }

  const faderStyle = useSpring({
    from: { width: '100%' },
    to: { width: '0%' },
    config: { duration: removeAfterMs ?? undefined }
  })

  return (
    <Popup>
      <StyledCloseButton
        onPointerDown={removeThisPopup}
        onClick={removeThisPopup}
        aria-label="Close notification"
        title="Close notification"
      >
        <StyledClose color={theme.text2} />
      </StyledCloseButton>
      {popupContent}
      {removeAfterMs !== null ? <AnimatedFader style={faderStyle} /> : null}
    </Popup>
  )
}
