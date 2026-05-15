import { Currency, Token } from '@uniswap/sdk'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useEffect, useState } from 'react'
import ReactGA from 'react-ga'
import useLast from '../../hooks/useLast'
import { useAddUserToken } from '../../state/user/hooks'
import { useSelectedListUrl } from '../../state/lists/hooks'
import { useSelectedTokenList } from '../../state/lists/hooks'
import { isTokenOnList } from '../../utils'
import Modal from '../Modal'
import TokenWarningModal from '../TokenWarningModal'
import { CurrencySearch } from './CurrencySearch'
import ListIntroduction from './ListIntroduction'
import { ListSelect } from './ListSelect'

interface CurrencySearchModalProps {
  isOpen: boolean
  onDismiss: () => void
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  otherSelectedCurrency?: Currency | null
  showCommonBases?: boolean
}

export default function CurrencySearchModal({
  isOpen,
  onDismiss,
  onCurrencySelect,
  selectedCurrency,
  otherSelectedCurrency,
  showCommonBases = true
}: CurrencySearchModalProps) {
  const [listView, setListView] = useState<boolean>(false)
  const [pendingImportToken, setPendingImportToken] = useState<Token | null>(null)
  const lastOpen = useLast(isOpen)
  const addUserToken = useAddUserToken()
  const selectedTokenList = useSelectedTokenList()

  useEffect(() => {
    if (isOpen && !lastOpen) {
      setListView(false)
      setPendingImportToken(null)
    }
  }, [isOpen, lastOpen])

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      if (currency instanceof Token && !isTokenOnList(selectedTokenList, currency)) {
        setPendingImportToken(currency)
        return
      }

      onCurrencySelect(currency)
      onDismiss()
    },
    [onDismiss, onCurrencySelect, selectedTokenList]
  )

  const handleConfirmImportToken = useCallback(() => {
    if (!pendingImportToken) return
    addUserToken(pendingImportToken)
    onCurrencySelect(pendingImportToken)
    setPendingImportToken(null)
    onDismiss()
  }, [addUserToken, onCurrencySelect, onDismiss, pendingImportToken])

  const handleClickChangeList = useCallback(() => {
    ReactGA.event({
      category: 'Lists',
      action: 'Change Lists'
    })
    setListView(true)
  }, [])
  const handleClickBack = useCallback(() => {
    ReactGA.event({
      category: 'Lists',
      action: 'Back'
    })
    setListView(false)
  }, [])
  const handleSelectListIntroduction = useCallback(() => {
    setListView(true)
  }, [])

  const selectedListUrl = useSelectedListUrl()
  const noListSelected = !selectedListUrl

  return (
    <>
      <Modal isOpen={isOpen} onDismiss={onDismiss} maxHeight={90} minHeight={listView ? 40 : noListSelected ? 0 : 80}>
        {listView ? (
          <ListSelect onDismiss={onDismiss} onBack={handleClickBack} />
        ) : noListSelected ? (
          <ListIntroduction onSelectList={handleSelectListIntroduction} />
        ) : (
          <CurrencySearch
            isOpen={isOpen}
            onDismiss={onDismiss}
            onCurrencySelect={handleCurrencySelect}
            onChangeList={handleClickChangeList}
            selectedCurrency={selectedCurrency}
            otherSelectedCurrency={otherSelectedCurrency}
            showCommonBases={showCommonBases}
          />
        )}
      </Modal>
      <TokenWarningModal isOpen={Boolean(pendingImportToken)} tokens={pendingImportToken ? [pendingImportToken] : []} onConfirm={handleConfirmImportToken} />
    </>
  )
}
