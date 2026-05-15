// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'react-feather'
import ReactGA from 'react-ga'
import { usePopper } from 'react-popper'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'rebass'
import styled from 'styled-components'
import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'
import { useFetchListCallback } from '../../hooks/useFetchListCallback'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { OPTIONAL_GITHUB_TOKEN_LIST_URL, OPTIONAL_PITEAS_TOKEN_LIST_URL } from '../../constants/lists'

import useToggle from '../../hooks/useToggle'
import { AppDispatch, AppState } from '../../state'
import { acceptListUpdate, addList, disableList, enableList, removeList } from '../../state/lists/actions'
import { useIsListEnabled, useSelectedListUrl } from '../../state/lists/hooks'
import { CloseIcon, ExternalLink, LinkStyledButton, TYPE } from '../../theme'
import listVersionLabel from '../../utils/listVersionLabel'
import { parseENSAddress } from '../../utils/parseENSAddress'
import uriToHttp from '../../utils/uriToHttp'
import { ButtonError, ButtonLight, ButtonOutlined, ButtonSecondary } from '../Button'

import Column, { AutoColumn } from '../Column'
import ListLogo from '../ListLogo'
import Modal from '../Modal'
import QuestionHelper from '../QuestionHelper'
import Row, { RowBetween } from '../Row'
import { PaddedColumn, SearchInput, Separator, SeparatorDark } from './styleds'

const OPTIONAL_LIST_DISMISSED_STORAGE_KEY = 'dextop.optionalList.dismissed'

function isOptionalListDismissed(): boolean {
  try {
    return window.localStorage.getItem(OPTIONAL_LIST_DISMISSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function setOptionalListDismissed(value: boolean): void {
  try {
    if (value) {
      window.localStorage.setItem(OPTIONAL_LIST_DISMISSED_STORAGE_KEY, '1')
    } else {
      window.localStorage.removeItem(OPTIONAL_LIST_DISMISSED_STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors (private mode, disabled storage, etc.)
  }
}

const UnpaddedLinkStyledButton = styled(LinkStyledButton)`
  padding: 0;
  font-size: 1rem;
  opacity: ${({ disabled }) => (disabled ? '0.4' : '1')};
`

const PopoverContainer = styled.div<{ show: boolean }>`
  z-index: 100;
  visibility: ${props => (props.show ? 'visible' : 'hidden')};
  opacity: ${props => (props.show ? 1 : 0)};
  transition: visibility 150ms linear, opacity 150ms linear;
  background: ${({ theme }) => theme.bg1};
  border: 2px solid ${({ theme }) => theme.bg3};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  color: ${({ theme }) => theme.text2};
  border-radius: 0.5rem;
  padding: 1rem;
  display: grid;
  grid-template-rows: 1fr;
  grid-gap: 8px;
  font-size: 1rem;
  text-align: left;
`

const StyledMenu = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
`

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
`

const ToggleSwitch = styled.button<{ enabled: boolean }>`
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
  padding: 0;
  background: ${({ enabled, theme }) => (enabled ? theme.primary1 : theme.bg3)};
  transition: background 200ms;
  outline: none;
  &:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }
  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${({ enabled }) => (enabled ? '21px' : '3px')};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: left 200ms;
  }
`

const StyledListUrlText = styled.div`
  max-width: 160px;
  opacity: 0.6;
  margin-right: 0.5rem;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
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

const ModalActions = styled(RowBetween)`
  gap: 0.75rem;

  > * {
    flex: 1;
  }
`

function ListOrigin({ listUrl }: { listUrl: string }) {
  const ensName = useMemo(() => parseENSAddress(listUrl)?.ensName, [listUrl])
  const host = useMemo(() => {
    if (ensName) return undefined
    try {
      const url = new URL(listUrl)
      return url.host
    } catch (error) {
      return undefined
    }
  }, [listUrl, ensName])
  return <>{ensName ?? host}</>
}

function listUrlRowHTMLId(listUrl: string) {
  return `list-row-${listUrl.replace(/\./g, '-')}`
}

const ListRow = memo(function ListRow({ listUrl, onBack }: { listUrl: string; onBack: () => void }) {
  const listsByUrl = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  const selectedListUrl = useSelectedListUrl()
  const dispatch = useDispatch<AppDispatch>()
  const fetchList = useFetchListCallback()
  const listState = listsByUrl[listUrl]
  const { current: list, pendingUpdate: pending, loadingRequestId } = listState

  const isSelected = listUrl === selectedListUrl
  const isEnabled = useIsListEnabled(listUrl)
  const isDefaultList = listUrl === 'default'

  const [open, toggle] = useToggle(false)
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false)
  const [removeConfirmationText, setRemoveConfirmationText] = useState('')
  const node = useRef<HTMLDivElement>()
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement>()
  const [popperElement, setPopperElement] = useState<HTMLDivElement>()

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'auto',
    strategy: 'fixed',
    modifiers: [{ name: 'offset', options: { offset: [8, 8] } }]
  })

  useOnClickOutside(node, open ? toggle : undefined)

  const closeRemoveConfirmation = useCallback(() => {
    setShowRemoveConfirmation(false)
    setRemoveConfirmationText('')
  }, [])

  const handleAcceptListUpdate = useCallback(() => {
    if (!pending) return
    ReactGA.event({
      category: 'Lists',
      action: 'Update List from List Select',
      label: listUrl
    })
    dispatch(acceptListUpdate(listUrl))
  }, [dispatch, listUrl, pending])

  const handleToggleList = useCallback(() => {
    if (isDefaultList) return
    if (isEnabled) {
      dispatch(disableList(listUrl))
    } else {
      dispatch(enableList(listUrl))
      if (!list && !loadingRequestId) {
        fetchList(listUrl).catch(error => console.debug('list toggle fetching error', error))
      }
    }
  }, [dispatch, fetchList, isDefaultList, isEnabled, list, listUrl, loadingRequestId])

  const handleRemoveList = useCallback(() => {
    ReactGA.event({
      category: 'Lists',
      action: 'Start Remove List',
      label: listUrl
    })
    if (open) toggle()
    setShowRemoveConfirmation(true)
  }, [listUrl, open, toggle])

  const confirmRemoveList = useCallback(() => {
    ReactGA.event({
      category: 'Lists',
      action: 'Confirm Remove List',
      label: listUrl
    })
    if (listUrl === OPTIONAL_GITHUB_TOKEN_LIST_URL) {
      setOptionalListDismissed(true)
    }
    dispatch(removeList(listUrl))
    closeRemoveConfirmation()
  }, [closeRemoveConfirmation, dispatch, listUrl])

  const displayName =
    list?.name ??
    (listUrl === OPTIONAL_GITHUB_TOKEN_LIST_URL
      ? 'GoDexTop Token List'
      : listUrl === OPTIONAL_PITEAS_TOKEN_LIST_URL
      ? 'Piteas Token List'
      : 'Token list')

  return (
    <Row key={listUrl} align="center" padding="16px" id={listUrlRowHTMLId(listUrl)}>
      <Modal isOpen={showRemoveConfirmation} onDismiss={closeRemoveConfirmation} maxHeight={100}>
        <ModalContentWrapper>
          <AutoColumn gap="lg">
            <RowBetween style={{ padding: '0 2rem' }}>
              <div />
              <Text fontWeight={500} fontSize={20}>
                Remove list?
              </Text>
              <CloseIcon onClick={closeRemoveConfirmation} />
            </RowBetween>
            <SeparatorDark />
            <AutoColumn gap="lg" style={{ padding: '0 2rem' }}>
              <Text fontWeight={500} fontSize={16}>
                Type <b>REMOVE</b> to confirm removal of <b>{displayName}</b>.
              </Text>
              <ConfirmationInput
                value={removeConfirmationText}
                onChange={event => setRemoveConfirmationText(event.target.value)}
                placeholder="Type REMOVE"
                onKeyDown={event => {
                  if (event.key === 'Enter' && removeConfirmationText.trim() === 'REMOVE') {
                    confirmRemoveList()
                  }
                }}
              />
              <ModalActions>
                <ButtonLight onClick={closeRemoveConfirmation}>Cancel</ButtonLight>
                <ButtonError disabled={removeConfirmationText.trim() !== 'REMOVE'} onClick={confirmRemoveList} error>
                  Remove List
                </ButtonError>
              </ModalActions>
            </AutoColumn>
          </AutoColumn>
        </ModalContentWrapper>
      </Modal>
      {list?.logoURI ? (
        <ListLogo style={{ marginRight: '1rem' }} logoURI={list.logoURI} alt={`${displayName} list logo`} />
      ) : (
        <div style={{ width: '24px', height: '24px', marginRight: '1rem' }} />
      )}
      <Column style={{ flex: '1' }}>
        <Row>
          <Text
            fontWeight={isSelected ? 500 : 400}
            fontSize={16}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {displayName}
          </Text>
        </Row>
        <Row
          style={{
            marginTop: '4px'
          }}
        >
          <StyledListUrlText title={listUrl}>
            <ListOrigin listUrl={listUrl} />
          </StyledListUrlText>
        </Row>
      </Column>
      <div ref={node as React.RefObject<HTMLDivElement>}>
        <StyledMenu>
          <ButtonOutlined
            style={{
              width: '2rem',
              padding: '.8rem .35rem',
              borderRadius: '12px',
              fontSize: '14px',
              marginRight: '0.5rem'
            }}
            onClick={toggle}
            ref={setReferenceElement}
          >
            <DropDown />
          </ButtonOutlined>

          {open && (
            <PopoverContainer show={true} ref={setPopperElement as any} style={styles.popper} {...attributes.popper}>
              <div>{list ? listVersionLabel(list.version) : 'Not loaded yet'}</div>
              <SeparatorDark />
              <ExternalLink href={`https://tokenlists.org`}>View list</ExternalLink>
              <UnpaddedLinkStyledButton
                onClick={handleRemoveList}
                disabled={isDefaultList || Object.keys(listsByUrl).length === 1}
              >
                Remove list
              </UnpaddedLinkStyledButton>
              {pending && (
                <UnpaddedLinkStyledButton onClick={handleAcceptListUpdate}>UPDATE LIST</UnpaddedLinkStyledButton>
              )}
            </PopoverContainer>
          )}
        </StyledMenu>
      </div>
      <ToggleWrapper>
        <ToggleSwitch
          enabled={isEnabled}
          onClick={handleToggleList}
          disabled={isDefaultList}
          aria-label={isDefaultList ? 'Default list always enabled' : isEnabled ? 'Disable list' : 'Enable list'}
        />
      </ToggleWrapper>
    </Row>
  )
})

const AddListButton = styled(ButtonSecondary)`
  /* height: 1.8rem; */
  max-width: 4rem;
  margin-left: 1rem;
  border-radius: 5px;
  padding: 10px 18px;
`

const ListContainer = styled.div`
  flex: 1;
  overflow: auto;
`

export function ListSelect({ onDismiss, onBack }: { onDismiss: () => void; onBack: () => void }) {
  const [listUrlInput, setListUrlInput] = useState<string>('')

  const dispatch = useDispatch<AppDispatch>()
  const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  const adding = Boolean(lists[listUrlInput]?.loadingRequestId)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    if (!lists[OPTIONAL_GITHUB_TOKEN_LIST_URL] && !isOptionalListDismissed()) {
      dispatch(addList(OPTIONAL_GITHUB_TOKEN_LIST_URL))
    }
    if (!lists[OPTIONAL_PITEAS_TOKEN_LIST_URL]) {
      dispatch(addList(OPTIONAL_PITEAS_TOKEN_LIST_URL))
    }
  }, [dispatch, lists])

  const handleInput = useCallback(e => {
    setListUrlInput(e.target.value)
    setAddError(null)
  }, [])
  const fetchList = useFetchListCallback()

  const handleAddList = useCallback(() => {
    if (adding) return
    setAddError(null)
    fetchList(listUrlInput)
      .then(() => {
        if (listUrlInput.trim().toLowerCase() === OPTIONAL_GITHUB_TOKEN_LIST_URL.toLowerCase()) {
          setOptionalListDismissed(false)
        }
        setListUrlInput('')
        ReactGA.event({
          category: 'Lists',
          action: 'Add List',
          label: listUrlInput
        })
      })
      .catch(error => {
        ReactGA.event({
          category: 'Lists',
          action: 'Add List Failed',
          label: listUrlInput
        })
        setAddError(error.message)
        dispatch(removeList(listUrlInput))
      })
  }, [adding, dispatch, fetchList, listUrlInput])

  const validUrl: boolean = useMemo(() => {
    return uriToHttp(listUrlInput).length > 0 || Boolean(parseENSAddress(listUrlInput))
  }, [listUrlInput])

  const handleEnterKey = useCallback(
    e => {
      if (validUrl && e.key === 'Enter') {
        handleAddList()
      }
    },
    [handleAddList, validUrl]
  )

  const sortedLists = useMemo(() => {
    const listUrls = Object.keys(lists)
    return listUrls
      .sort((u1, u2) => {
        const { current: l1 } = lists[u1]
        const { current: l2 } = lists[u2]
        const n1 = l1?.name?.toLowerCase() ?? u1.toLowerCase()
        const n2 = l2?.name?.toLowerCase() ?? u2.toLowerCase()
        return n1 < n2 ? -1 : n1 === n2 ? 0 : 1
      })
  }, [lists])

  return (
    <Column style={{ width: '100%', flex: '1 1' }}>
      <PaddedColumn>
        <RowBetween>
          <div>
            <ArrowLeft style={{ cursor: 'pointer' }} onClick={onBack} />
          </div>
          <Text fontWeight={500} fontSize={20}>
            Manage Lists
          </Text>
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
      </PaddedColumn>

      <Separator />

      <PaddedColumn gap="14px">
        <Text fontWeight={600}>
          Add a list{' '}
          <QuestionHelper text="Token lists are an open specification for lists of ERC20 tokens. You can use any token list by entering its URL below. Beware that third party token lists can contain fake or malicious ERC20 tokens." />
        </Text>
        <Row>
          <SearchInput
            type="text"
            id="list-add-input"
            placeholder="https:// or ENS name"
            value={listUrlInput}
            onChange={handleInput}
            onKeyDown={handleEnterKey}
            style={{ height: '2.75rem', borderRadius: 12, padding: '12px' }}
          />
          <AddListButton onClick={handleAddList} disabled={!validUrl}>
            Add
          </AddListButton>
        </Row>
        {addError ? (
          <TYPE.error title={addError} style={{ textOverflow: 'ellipsis', overflow: 'hidden' }} error>
            {addError}
          </TYPE.error>
        ) : null}
      </PaddedColumn>

      <Separator />

      <ListContainer>
        {sortedLists.map(listUrl => (
          <ListRow key={listUrl} listUrl={listUrl} onBack={onBack} />
        ))}
      </ListContainer>
      <Separator />

      <div style={{ padding: '16px', textAlign: 'center' }}>
        <ExternalLink href="https://tokenlists.org">Browse lists</ExternalLink>
      </div>
    </Column>
  )
}
