import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | bigint | string

export enum ChainId {
  MAINNET = 369
}

// Constants related to PulseChain and RPC Providers
export const PULSECHAIN_RPC = {
  MAINNET: 'https://rpc.pulsechain.com',
  BACKUP: 'https://rpc-pulsechain.g4mm4.io',
}

export const DEFAULT_RPC = PULSECHAIN_RPC.MAINNET // Default RPC endpoint to use

// Example contract addresses and other constants
export const FACTORY_ADDRESS = '0x26594d3F4c172554A30D06e8fDc59229B860eAb0'
export const INIT_CODE_HASH = '0xa40dbc6c2b33751f05d9f248d9e1156138ecac661f2f73b91a6a6d4490d44255'
export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// Common constants for internal use
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const TWO = JSBI.BigInt(2)
export const THREE = JSBI.BigInt(3)
export const FIVE = JSBI.BigInt(5)
export const TEN = JSBI.BigInt(10)
export const _100 = JSBI.BigInt(100)
export const _997 = JSBI.BigInt(8500)
export const _1000 = JSBI.BigInt(10000)

// Trade-related constants and enums
export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP
}

// Solidity types and maxima
export enum SolidityType {
  uint8 = 'uint8',
  uint256 = 'uint256'
}

export const SOLIDITY_TYPE_MAXIMA = {
  [SolidityType.uint8]: JSBI.BigInt('0xff'),
  [SolidityType.uint256]: JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
}
