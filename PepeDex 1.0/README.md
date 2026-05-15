# PepeDex

PepeDex is a PulseChain-based decentralized exchange focused on community-aligned trading and liquidity.

- https://pepedex.app

## What PepeDex Does

- Token swaps on PulseChain
- Liquidity pool creation and liquidity management
- Community-focused fee model connected to PEPE support mechanics
- Non-custodial trading through your wallet

## How It Works

PepeDex uses an AMM (automated market maker) model.

- Traders swap directly against on-chain liquidity pools
- Liquidity providers supply token pairs to earn a share of trading fees
- Protocol mechanics are designed to route value back into the PEPE ecosystem

## Fee Model (15%)

PepeDex applies a 15% fee on swaps.

- Example: on a 100-token input swap, 85 tokens are used for swap pricing and 15 tokens are collected as fee value.
- That fee value is split 50/50 by protocol design.

50/50 split:
- 50% to liquidity depth and LP value: this portion remains in the pool system and strengthens liquidity over time.
- 50% to the PEPE support path: this portion is routed through the PepeDex buy-and-burn flow.

In short, the fee is designed to do two jobs at once: improve pool strength and support PEPE-focused tokenomics.

## Key Benefits

- Non-custodial: users keep control of funds in their own wallet
- On-chain transparency: swaps and liquidity actions are verifiable on PulseChain
- Community alignment: protocol behavior is designed around long-term PEPE support
- Simple UX: swap, provide liquidity, and manage positions from one interface

- Factory: [0x26594d3F4c172554A30D06e8fDc59229B860eAb0](https://otter-pulsechain.g4mm4.io/address/0x26594d3F4c172554A30D06e8fDc59229B860eAb0)
- Router: [0xd3F72D6DE6FC310Fcab2ABd9A69d59ed95dAf17B](https://otter-pulsechain.g4mm4.io/address/0xd3F72D6DE6FC310Fcab2ABd9A69d59ed95dAf17B)


## Quick Start (Local)

Requirements:
- Node.js
- Yarn

Run locally:
1. Install dependencies: yarn
2. Start dev server: yarn start
3. Open the app at http://localhost:3000

Build production bundle:
- yarn build

Run tests:
- yarn test

## License

GPL-3.0-or-later
