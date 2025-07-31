# StableArbYieldBridge - Replit Configuration

## Overview

StableArbYieldBridge is a sophisticated multichain DeFi arbitrage platform that enables automated stablecoin swaps between Celo and Sui networks. The application focuses on detecting and executing arbitrage opportunities while providing yield farming capabilities through intelligent routing to yield-bearing protocols. The business vision is to provide a seamless and profitable cross-chain arbitrage experience, leveraging market inefficiencies across multiple blockchain networks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints
- **Development**: TSX for TypeScript execution

### Database & ORM
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit

### Key Capabilities
- **Arbitrage Opportunity Detection**: Real-time scanning for price discrepancies between Ethereum Sepolia and Sui Testnet.
- **Trading Agents**: Automated bots for executing trades.
- **Portfolio Management**: Balance tracking and profit/loss calculations.
- **Transaction Management**: Complete trade history and status tracking.
- **Chain Status Monitoring**: Real-time blockchain network health monitoring.
- **Cross-Chain Atomic Swaps**: Bidirectional swaps between Ethereum Sepolia and Sui Testnet with real 1Inch Fusion+ cryptographic hashlock/timelock security and yield optimization (USDC to USDY on Sui).
- **Peg Protection**: Multi-source price validation (Uniswap V3, Cetus DEX, Chainlink Oracles) for real-time deviation detection.
- **Cross-Chain Limit Orders**: Management of limit orders across Ethereum Sepolia and Sui Testnet using 1Inch Fusion+ and Cetus DEX.

### Core Architectural Decisions
- **Database Choice**: Drizzle ORM with PostgreSQL for type-safe operations and robust data management.
- **State Management**: TanStack Query for efficient server state synchronization and real-time updates.
- **UI Framework**: Shadcn/ui + Radix UI for highly customizable and accessible components.
- **Real-time Updates**: Polling strategy for live market data, balancing simplicity and reliability.
- **Transaction Execution**: Backend-executed transactions using private keys to bypass wallet interface compatibility issues, ensuring reliable real blockchain execution on Ethereum Sepolia and Sui Testnet.
- **Network Focus**: Primary focus on Ethereum Sepolia and Sui Testnet for cross-chain USDC/USDY arbitrage.

## External Dependencies

### Blockchain Integration
- **1Inch Fusion+ SDK**: Primary DEX aggregator for swap execution on Ethereum Sepolia.
- **Cetus DEX**: For swaps on Sui network.
- **Chainlink Oracles**: Price feeds and peg protection mechanisms on Ethereum Sepolia and Sui Testnet.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Alchemy**: Blockchain RPC provider for Ethereum Sepolia.
- **Sui RPC**: Official Sui network connectivity.

### Wallet & Authentication
- **WalletConnect**: Multi-chain wallet connection support (used for frontend wallet detection, but transactions are backend-executed).
- **MetaMask**: For Ethereum Sepolia wallet interaction (detection, not direct transaction signing in production flow).
- **Sui Wallet**: Native Sui network wallet support (detection, not direct transaction signing in production flow).

### Development Tools
- **Replit Integration**: Development environment optimization.
- **Vite Plugins**: Runtime error handling and development cartographer.