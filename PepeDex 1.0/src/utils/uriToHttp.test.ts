import uriToHttp from './uriToHttp'

describe('uriToHttp', () => {
  it('returns empty array for ens names', () => {
    expect(uriToHttp('t2crtokens.eth')).toEqual([])
  })

  it('returns https first for http', () => {
    expect(uriToHttp('http://test.com')).toEqual(['https://test.com', 'http://test.com'])
  })

  it('returns https for https', () => {
    expect(uriToHttp('https://test.com')).toEqual(['https://test.com'])
  })

  it('returns empty array for ipfs urls', () => {
    expect(uriToHttp('ipfs://QmV8AfDE8GFSGQvt3vck8EwAzsPuNTmtP8VcQJE3qxRPaZ')).toEqual([])
  })

  it('returns empty array for ipns urls', () => {
    expect(uriToHttp('ipns://app.uniswap.org')).toEqual([])
  })

  it('returns empty array for invalid scheme', () => {
    expect(uriToHttp('blah:test')).toEqual([])
  })
})
