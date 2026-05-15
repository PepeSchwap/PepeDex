import { diffTokenLists, TokenList } from '@uniswap/token-lists'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useMemo } from 'react'
import ReactGA from 'react-ga'
import { useDispatch } from 'react-redux'
import { Text } from 'rebass'
import { AppDispatch } from '../../state'
import { useRemovePopup } from '../../state/application/hooks'
import { acceptListUpdate } from '../../state/lists/actions'
import { TYPE } from '../../theme'
import listVersionLabel from '../../utils/listVersionLabel'
import { ButtonSecondary } from '../Button'
import { AutoColumn } from '../Column'
import { AutoRow } from '../Row'

export default function ListUpdatePopup({
  popKey,
  listUrl,
  oldList,
  newList,
  auto
}: {
  popKey: string
  listUrl: string
  oldList: TokenList
  newList: TokenList
  auto: boolean
}) {
  const removePopup = useRemovePopup()
  const removeThisPopup = useCallback(() => removePopup(popKey), [popKey, removePopup])
  const dispatch = useDispatch<AppDispatch>()

  const handleAcceptUpdate = useCallback(() => {
    if (auto) return
    ReactGA.event({
      category: 'Lists',
      action: 'Update List from Popup',
      label: listUrl
    })
    dispatch(acceptListUpdate(listUrl))
    removeThisPopup()
  }, [auto, dispatch, listUrl, removeThisPopup])

  const { added: tokensAdded, changed: tokensChanged, removed: tokensRemoved } = useMemo(() => {
    return diffTokenLists(oldList.tokens, newList.tokens)
  }, [newList.tokens, oldList.tokens])
  const numTokensChanged = useMemo(
    () =>
      Object.keys(tokensChanged).reduce((memo, chainId: any) => memo + Object.keys(tokensChanged[chainId]).length, 0),
    [tokensChanged]
  )

  return (
    <AutoRow>
      <AutoColumn style={{ flex: '1', overflowY: 'auto', maxHeight: '80vh' }} gap="8px">
        {auto ? (
          <TYPE.body fontWeight={500}>
            <strong>{listVersionLabel(newList.version)}</strong>.
          </TYPE.body>
        ) : (
          <>
            <div>
              <div style={{ flexGrow: 1, marginRight: 12 }}>
                <ButtonSecondary onClick={handleAcceptUpdate}>Accept update</ButtonSecondary>
              </div>
              <br></br>
              <br></br>
              <Text>
                {oldList.name}
                {listVersionLabel(newList.version)}.
              </Text>
              <ul>
                {tokensAdded.length > 0 ? (
                  <li>
                    {tokensAdded.map((token, i) => (
                      <React.Fragment key={`${token.chainId}-${token.address}`}>
                        <strong title={token.address}>{token.symbol}</strong>
                        {i === tokensAdded.length - 1 ? null : ', '}
                      </React.Fragment>
                    ))}{' '}
                    added
                  </li>
                ) : null}
                {tokensRemoved.length > 0 ? (
                  <li>
                    {tokensRemoved.map((token, i) => (
                      <React.Fragment key={`${token.chainId}-${token.address}`}>
                        <strong title={token.address}>{token.symbol}</strong>
                        {i === tokensRemoved.length - 1 ? null : ', '}
                      </React.Fragment>
                    ))}{' '}
                    removed
                  </li>
                ) : null}
                {numTokensChanged > 0 ? <li>{numTokensChanged} tokens updated</li> : null}
              </ul>
            </div>
            <AutoRow></AutoRow>
          </>
        )}
      </AutoColumn>
    </AutoRow>
  )
}
