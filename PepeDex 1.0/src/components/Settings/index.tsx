// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useRef, useContext, useState } from 'react'
import { Settings, X } from 'react-feather'
import styled from 'styled-components'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import {
  useUserSlippageTolerance,
  useExpertModeManager,
  useUserDeadline,
  useDarkModeManager
} from '../../state/user/hooks'
import TransactionSettings from '../TransactionSettings'
import { RowFixed, RowBetween } from '../Row'
import { TYPE } from '../../theme'
import QuestionHelper from '../QuestionHelper'
import Toggle from '../Toggle'
import { ThemeContext } from 'styled-components'
import { AutoColumn } from '../Column'
import { ButtonError } from '../Button'
import { useSettingsMenuOpen, useToggleSettingsMenu } from '../../state/application/hooks'
import { Text } from 'rebass'
import Modal from '../Modal'
import { SearchInput } from '../SearchModal/styleds'

const StyledMenuIcon = styled(Settings)`
  height: 20px;
  width: 20px;

  > * {
    stroke: ${({ theme }) => theme.text1};
  }
`

const StyledCloseIcon = styled(X)`
  height: 20px;
  width: 20px;
  :hover {
    cursor: pointer;
  }

  > * {
    stroke: ${({ theme }) => theme.text1};
  }
`

const StyledMenuButton = styled.button`
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 35px;
  background-color: ${({ theme }) => theme.bg3};

  padding: 0.15rem 0.5rem;
  border-radius: 0.5rem;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }

  svg {
    margin-top: 2px;
  }
`
const EmojiWrapper = styled.div`
  position: absolute;
  bottom: -6px;
  right: 0px;
  font-size: 14px;
`

const StyledMenu = styled.div`
  margin-left: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
  text-align: left;
`

const MenuFlyout = styled.span`
  min-width: 20.125rem;
  background-color: ${({ theme }) => theme.bg2};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border: 3px solid ${({ theme }) => theme.text1};
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  position: absolute;
  top: 3rem;
  right: 0rem;
  z-index: 100;

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    min-width: 18.125rem;
    right: -46px;
  `};
`

const Break = styled.div`
  width: 100%;
  height: 1px;
  background-color: ${({ theme }) => theme.bg3};
`

const ModalContentWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  background-color: ${({ theme }) => theme.bg2};
  border-radius: 5px;
`

const ConfirmationInput = styled(SearchInput)`
  font-size: 16px;
`

export default function SettingsTab() {
  const node = useRef<HTMLDivElement>()
  const open = useSettingsMenuOpen()
  const toggle = useToggleSettingsMenu()

  const theme = useContext(ThemeContext)
  const [userSlippageTolerance, setUserslippageTolerance] = useUserSlippageTolerance()

  const [deadline, setDeadline] = useUserDeadline()

  const [expertMode, toggleExpertMode] = useExpertModeManager()

  const [darkMode, toggleDarkMode] = useDarkModeManager()

  // show confirmation view before turning on
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [expertConfirmationText, setExpertConfirmationText] = useState('')

  const closeConfirmation = () => {
    setShowConfirmation(false)
    setExpertConfirmationText('')
  }

  useOnClickOutside(node, open ? toggle : undefined)

  return (
    <div ref={node as React.RefObject<HTMLDivElement>}>
      <StyledMenu>
        <Modal isOpen={showConfirmation} onDismiss={closeConfirmation} maxHeight={100}>
          <ModalContentWrapper>
            <AutoColumn gap="lg">
              <RowBetween style={{ padding: '0 2rem' }}>
                <div />
                <Text fontWeight={500} fontSize={20}>
                  Are you sure?
                </Text>
                <StyledCloseIcon onClick={closeConfirmation} />
              </RowBetween>
              <Break />
              <AutoColumn gap="lg" style={{ padding: '0 2rem' }}>
                <Text fontWeight={500} fontSize={20}>
                  Expert mode turns off the confirm transaction prompt and allows high slippage trades that often result
                  in bad rates and lost funds.
                </Text>
                <Text fontWeight={600} fontSize={20}>
                  ONLY USE THIS MODE IF YOU KNOW WHAT YOU ARE DOING.
                </Text>
                <Text fontWeight={500} fontSize={14} color={theme.text2}>
                  Type <b>confirm</b> to enable expert mode.
                </Text>
                <ConfirmationInput
                  value={expertConfirmationText}
                  onChange={event => setExpertConfirmationText(event.target.value)}
                  placeholder="Type confirm"
                  onKeyDown={event => {
                    if (event.key === 'Enter' && expertConfirmationText.trim().toLowerCase() === 'confirm') {
                      toggleExpertMode()
                      closeConfirmation()
                    }
                  }}
                />
                <ButtonError
                  error={true}
                  padding={'12px'}
                  disabled={expertConfirmationText.trim().toLowerCase() !== 'confirm'}
                  onClick={() => {
                    toggleExpertMode()
                    closeConfirmation()
                  }}
                >
                  <Text fontSize={20} fontWeight={500} id="confirm-expert-mode">
                    Turn On Expert Mode
                  </Text>
                </ButtonError>
              </AutoColumn>
            </AutoColumn>
          </ModalContentWrapper>
        </Modal>
        <StyledMenuButton onClick={toggle} id="open-settings-dialog-button">
          <StyledMenuIcon />
          {expertMode && (
            <EmojiWrapper>
              <span role="img" aria-label="wizard-icon">
                ðŸ§™
              </span>
            </EmojiWrapper>
          )}
        </StyledMenuButton>
        {open && (
          <MenuFlyout>
            <AutoColumn gap="md" style={{ padding: '1rem' }}>
              <Text fontWeight={600} fontSize={14}>
                Transaction Settings
              </Text>
              <TransactionSettings
                rawSlippage={userSlippageTolerance}
                setRawSlippage={setUserslippageTolerance}
                deadline={deadline}
                setDeadline={setDeadline}
              />
              <Text fontWeight={600} fontSize={14}>
                Interface Settings
              </Text>
              <RowBetween>
                <RowFixed>
                  <TYPE.black fontWeight={400} fontSize={14} color={theme.text2}>
                    Toggle Expert Mode
                  </TYPE.black>
                  <QuestionHelper text="Bypasses confirmation modals and allows high slippage trades. Use at your own risk." />
                </RowFixed>
                <Toggle
                  id="toggle-expert-mode-button"
                  isActive={expertMode}
                  toggle={
                    expertMode
                      ? () => {
                          toggleExpertMode()
                          closeConfirmation()
                        }
                      : () => {
                          toggle()
                          setShowConfirmation(true)
                        }
                  }
                />
              </RowBetween>
              <RowBetween>
                <RowFixed>
                  <TYPE.black fontWeight={400} fontSize={14} color={theme.text2}>
                    Toggle Dark Mode
                  </TYPE.black>
                </RowFixed>
                <Toggle isActive={darkMode} toggle={toggleDarkMode} />
              </RowBetween>
            </AutoColumn>
          </MenuFlyout>
        )}
      </StyledMenu>
    </div>
  )
}
