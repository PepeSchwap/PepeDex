import { Currency, Pair, Token } from '@uniswap/sdk'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useState, useContext, useCallback, useEffect, useRef } from 'react'
import styled, { ThemeContext } from 'styled-components'
import { darken } from 'polished'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import CurrencySearchModal from '../SearchModal/CurrencySearchModal'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { RowBetween } from '../Row'
import { TYPE } from '../../theme'
import { Input as NumericalInput } from '../NumericalInput'
import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'
import { Check, Copy } from 'react-feather'

import { useActiveWeb3React } from '../../hooks'
import { useTranslation } from 'react-i18next'

const InputRow = styled.div<{ selected: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  padding: ${({ selected }) => (selected ? '0.75rem 0.5rem 0.75rem 1rem' : '0.75rem 0.75rem 0.75rem 1rem')};
  margin-bottom: 0.5rem;
`

const SelectMetaRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  padding-right: 1rem;
`

const CurrencySelect = styled.button<{ selected: boolean }>`
  align-items: center;
  height: 2.2rem;
  font-size: 20px;
  font-weight: 500;
  background-color: ${({ selected, theme }) => (selected ? theme.bg1 : theme.bg2)};
  color: ${({ selected, theme }) => (selected ? theme.text1 : theme.text1)};
  border-radius: 5px;
  box-shadow: ${({ selected }) => (selected ? 'none' : '0px 6px 10px rgba(0, 0, 0, 0.075)')};
  outline: none;
  cursor: pointer;
  user-select: none;
  border: 1px solid #444444;
  margin-top: 0.5rem;
  margin-left: 1rem;
  margin-bottom: 0.5rem;
  :focus,
  :hover {
    background-color: ${({ selected, theme }) => (selected ? theme.bg2 : darken(0.05, theme.primary1))};
  }
`

const LabelRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  color: ${({ theme }) => theme.text1};
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.75rem 1rem 0 1rem;
  span:hover {
    cursor: pointer;
    color: ${({ theme }) => darken(0.2, theme.text2)};
  }
`

const RightMetaRow = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 0.55rem;
`

const FiatValueText = styled(TYPE.body)`
  color: ${({ theme }) => theme.text2};
  font-size: 0.85rem;
  font-weight: 500;
`

const CopyAddressIconButton = styled.button`
  border: 1px solid #444444;
  background: transparent;
  color: ${({ theme }) => theme.text2};
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  padding: 0;
  cursor: pointer;
  :hover {
    border-color: ${({ theme }) => theme.primary1};
    color: ${({ theme }) => theme.text1};
  }
`

const Aligner = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const StyledDropDown = styled(DropDown)<{ selected: boolean }>`
  margin: 0 0.25rem 0 0.5rem;
  height: 35%;

  path {
    stroke: ${({ selected, theme }) => (selected ? theme.text1 : theme.text1)};
    stroke-width: 1.5px;
  }
`

const InputPanel = styled.div<{ hideInput?: boolean; menuOpen?: boolean }>`
  ${({ theme }) => theme.flexColumnNoWrap}
  position: relative;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.bg2};
  z-index: ${({ menuOpen }) => (menuOpen ? 20 : 1)};
`

const Container = styled.div<{ hideInput: boolean }>`
  border-radius: ${({ hideInput }) => (hideInput ? '8px' : '20px')};
  border: 2px solid #373737;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.bg1};
`

const StyledTokenName = styled.span<{ active?: boolean }>`
  ${({ active }) => (active ? '  margin: 0 0.25rem 0 0.75rem;' : '  margin: 0 0.25rem 0 0.25rem;')}
  font-size:  ${({ active }) => (active ? '20px' : '16px')};

`

const StyledBalanceMax = styled.button`
  height: 28px;
  min-width: 28px;
  background-color: ${({ theme }) => theme.primary5};
  border: 1px solid white;
  border-radius: 0.5rem;
  font-size: 1rem;

  font-weight: 500;
  cursor: pointer;
  margin-right: 0;
  color: ${({ theme }) => theme.primaryText1};
  :hover {
    border: 1px solid ${({ theme }) => theme.primary1};
  }
  :focus {
    border: 1px solid ${({ theme }) => theme.primary1};
    outline: none;
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    margin-right: 0.5rem;
  `};
`

const MaxButtonWrapper = styled.div`
  position: relative;
  margin-right: 0.05rem;
`

const MaxMenu = styled.div`
  position: absolute;
  right: 0;
  top: 34px;
  min-width: 50px;
  background-color: ${({ theme }) => theme.bg1};
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 8px;
  overflow: hidden;
  z-index: 30;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.15);
`

const MaxMenuItem = styled.button`
  width: 100%;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.text1};
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;

  :hover {
    background-color: ${({ theme }) => theme.bg2};
  }
`

interface MaxButtonMenuItem {
  label: string
  onClick: () => void
}

interface CurrencyInputPanelProps {
  value: string
  onUserInput: (value: string) => void
  onMax?: () => void
  maxButtonMenuItems?: MaxButtonMenuItem[]
  showMaxButton: boolean
  label?: string
  onCurrencySelect?: (currency: Currency) => void
  currency?: Currency | null
  disableCurrencySelect?: boolean
  hideBalance?: boolean
  pair?: Pair | null
  hideInput?: boolean
  otherCurrency?: Currency | null
  id: string
  showCommonBases?: boolean
  fiatValue?: string
}

export default function CurrencyInputPanel({
  value,
  onUserInput,
  onMax,
  maxButtonMenuItems,
  showMaxButton,
  label = 'Input',
  onCurrencySelect,
  currency,
  disableCurrencySelect = false,
  hideBalance = false,
  pair = null, // used for double token logo
  hideInput = false,
  otherCurrency,
  id,
  showCommonBases,
  fiatValue
}: CurrencyInputPanelProps) {
  const { t } = useTranslation()

  const [modalOpen, setModalOpen] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [maxMenuOpen, setMaxMenuOpen] = useState(false)
  const maxMenuRef = useRef<HTMLDivElement | null>(null)
  const { account } = useActiveWeb3React()
  const selectedCurrencyBalance = useCurrencyBalance(account ?? undefined, currency ?? undefined)
  const theme = useContext(ThemeContext)

  const handleDismissSearch = useCallback(() => {
    setModalOpen(false)
  }, [setModalOpen])

  const handleCopyAddress = useCallback(() => {
    if (!(currency instanceof Token)) return
    if (!navigator?.clipboard?.writeText) return
    navigator.clipboard.writeText(currency.address).then(() => {
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 1400)
    })
  }, [currency])

  const hasMaxMenuItems = Boolean(maxButtonMenuItems && maxButtonMenuItems.length > 0)

  useEffect(() => {
    if (!maxMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (maxMenuRef.current && !maxMenuRef.current.contains(event.target as Node)) {
        setMaxMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [maxMenuOpen])

  const handleMaxButtonClick = useCallback(() => {
    if (hasMaxMenuItems) {
      setMaxMenuOpen(open => !open)
      return
    }

    onMax?.()
  }, [hasMaxMenuItems, onMax])

  const handleMaxMenuItemClick = useCallback((itemAction: () => void) => {
    itemAction()
    setMaxMenuOpen(false)
  }, [])

  return (
    <InputPanel id={id} menuOpen={maxMenuOpen}>
      <Container hideInput={hideInput}>
        {/* Label Row with Balance */}
        <LabelRow>
          <RowBetween>
            <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
              {label}
            </TYPE.body>
            {account && (
              <TYPE.body
                onClick={onMax}
                color={theme.text2}
                fontWeight={500}
                fontSize={14}
                style={{ display: 'inline', cursor: 'pointer' }}
              >
                {!hideBalance && !!currency && selectedCurrencyBalance
                  ? 'Balance: ' + selectedCurrencyBalance?.toSignificant(6)
                  : ' -'}
              </TYPE.body>
            )}
          </RowBetween>
        </LabelRow>

        {/* Currency Select Button and Right-Side Meta */}
        <SelectMetaRow>
          <CurrencySelect
            selected={!!currency}
            className="open-currency-select-button"
            onClick={() => {
              if (!disableCurrencySelect) {
                setModalOpen(true)
              }
            }}
          >
            <Aligner>
              {pair ? (
                <DoubleCurrencyLogo currency0={pair.token0} currency1={pair.token1} size={24} margin={true} />
              ) : currency ? (
                <CurrencyLogo currency={currency} size={'24px'} />
              ) : null}
              {pair ? (
                <StyledTokenName className="pair-name-container">
                  {pair?.token0.symbol}:{pair?.token1.symbol}
                </StyledTokenName>
              ) : (
                <StyledTokenName className="token-symbol-container" active={Boolean(currency && currency.symbol)}>
                  {(currency && currency.symbol && currency.symbol.length > 20
                    ? currency.symbol.slice(0, 4) + '...' + currency.symbol.slice(currency.symbol.length - 5)
                    : currency?.symbol) || t('selectToken')}
                </StyledTokenName>
              )}
              {!disableCurrencySelect && <StyledDropDown selected={!!currency} />}
            </Aligner>
          </CurrencySelect>
          {currency instanceof Token && (
            <CopyAddressIconButton onClick={handleCopyAddress} aria-label={copiedAddress ? 'Copied' : 'Copy address'}>
              {copiedAddress ? <Check size={12} /> : <Copy size={12} />}
            </CopyAddressIconButton>
          )}
          <RightMetaRow>
            <FiatValueText>{fiatValue ?? '-'}</FiatValueText>
          </RightMetaRow>
        </SelectMetaRow>

        {/* Input Row with Numerical Input and Max Button */}
        {!hideInput && (
          <InputRow style={{ padding: '0.5rem 1rem' }} selected={disableCurrencySelect}>
            <NumericalInput
              className="token-amount-input"
              value={value}
              onUserInput={val => {
                onUserInput(val)
              }}
            />
            {account && currency && showMaxButton && label !== 'To' && (
              <MaxButtonWrapper ref={maxMenuRef}>
                <StyledBalanceMax onClick={handleMaxButtonClick}>%</StyledBalanceMax>
                {hasMaxMenuItems && maxMenuOpen && (
                  <MaxMenu>
                    {maxButtonMenuItems?.map(item => (
                      <MaxMenuItem key={item.label} onClick={() => handleMaxMenuItemClick(item.onClick)}>
                        {item.label}
                      </MaxMenuItem>
                    ))}
                  </MaxMenu>
                )}
              </MaxButtonWrapper>
            )}
          </InputRow>
        )}
      </Container>

      {/* Currency Search Modal */}
      {!disableCurrencySelect && onCurrencySelect && (
        <CurrencySearchModal
          isOpen={modalOpen}
          onDismiss={handleDismissSearch}
          onCurrencySelect={onCurrencySelect}
          selectedCurrency={currency}
          otherSelectedCurrency={otherCurrency}
          showCommonBases={showCommonBases}
        />
      )}
    </InputPanel>
  )
}
