import React, { useContext, useMemo, useState } from 'react'
import { AlertTriangle } from 'react-feather'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'
import { ButtonLight, ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import Modal from '../Modal'
import { RowBetween } from '../Row'
import { CloseIcon } from '../../theme/components'

type PriceImpactMode = 'confirm' | 'type-confirm'

const Wrapper = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.bg2};
  border: 3px solid ${({ theme }) => theme.text1};
`

const Section = styled(AutoColumn)`
  padding: 20px;
`

const Footer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 1fr;
  `}
`

const ConfirmInput = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.bg3};
  background: ${({ theme }) => theme.bg1};
  color: ${({ theme }) => theme.text1};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primary1};
  }
`

export default function PriceImpactConfirmationModal({
  isOpen,
  onDismiss,
  onConfirm,
  mode,
  thresholdPercent
}: {
  isOpen: boolean
  onDismiss: () => void
  onConfirm: () => void
  mode: PriceImpactMode
  thresholdPercent: number
}) {
  const theme = useContext(ThemeContext)
  const [confirmText, setConfirmText] = useState('')

  const requiresTypedConfirmation = mode === 'type-confirm'
  const canConfirm = useMemo(() => {
    if (!requiresTypedConfirmation) return true
    return confirmText.trim().toLowerCase() === 'confirm'
  }, [confirmText, requiresTypedConfirmation])

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={90} alignTop mobileScale={0.75}>
      <Wrapper>
        <Section gap="12px">
          <RowBetween>
            <Text fontWeight={600} fontSize={20}>
              Confirm Swap
            </Text>
            <CloseIcon onClick={onDismiss} />
          </RowBetween>

          <AutoColumn gap="10px" style={{ paddingTop: '2px' }}>
            <AlertTriangle color={theme.yellow2} size={26} />
            {requiresTypedConfirmation ? (
              <Text fontSize={14} color={theme.text1}>
                This swap has a price impact of at least {thresholdPercent}%. Type "confirm" to continue.
              </Text>
            ) : (
              <Text fontSize={14} color={theme.text1}>
                This swap has a price impact of at least {thresholdPercent}%. Please confirm that you want to continue.
              </Text>
            )}
          </AutoColumn>

          {requiresTypedConfirmation ? (
            <ConfirmInput
              value={confirmText}
              onChange={event => setConfirmText(event.target.value)}
              placeholder='Type "confirm"'
              autoComplete="off"
            />
          ) : null}

          <Footer>
            <ButtonLight onClick={onDismiss}>Cancel</ButtonLight>
            <ButtonPrimary onClick={onConfirm} disabled={!canConfirm}>
              Continue Swap
            </ButtonPrimary>
          </Footer>
        </Section>
      </Wrapper>
    </Modal>
  )
}
