/**
 * Given a URI, return fetch-able HTTPS/HTTP URLs.
 * IPFS/IPNS are intentionally disabled to avoid embedding third-party IPFS gateways in production bundles.
 * @param uri to convert to fetch-able http url
 */
export default function uriToHttp(uri: string): string[] {
  const protocol = uri.split(':')[0].toLowerCase()
  switch (protocol) {
    case 'https':
      return [uri]
    case 'http':
      return ['https' + uri.substr(4), uri]
    default:
      return []
  }
}
