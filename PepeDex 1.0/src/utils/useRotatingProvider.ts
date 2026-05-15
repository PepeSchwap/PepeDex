// Returns a getProvider(callIndex) that alternates between two RPC URLs
import { Web3Provider } from '@ethersproject/providers'

const RPC1 = process.env.REACT_APP_NETWORK_URL
const RPC2 = process.env.REACT_APP_NETWORK_URL_2

export function useRotatingProvider() {
  return (callIndex: number) => {
    const url = RPC2 && callIndex % 2 === 1 ? RPC2 : RPC1
    return new Web3Provider(url ? (window as any).ethereum || url : undefined)
  }
}
