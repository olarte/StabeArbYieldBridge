# StableArbYieldBridge - Replit Configuration

## Overview

StableArbYieldBridge is a sophisticated multichain DeFi arbitrage platform that enables automated stablecoin swaps between Celo and Sui networks. The application focuses on detecting and executing arbitrage opportunities while providing yield farming capabilities through intelligent routing to yield-bearing protocols.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints with structured error handling
- **Development**: TSX for TypeScript execution in development

### Database & ORM
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon serverless driver for serverless compatibility

## Key Components

### Core Business Logic
1. **Arbitrage Opportunity Detection**: Real-time scanning for price discrepancies between Celo and Sui
2. **Trading Agents**: Automated bots for executing trades based on predefined criteria
3. **Portfolio Management**: Balance tracking and profit/loss calculations
4. **Transaction Management**: Complete trade history and status tracking
5. **Chain Status Monitoring**: Real-time blockchain network health monitoring

### Frontend Components
- **Dashboard**: Central hub displaying market stats, opportunities, and active agents
- **Portfolio Overview**: Real-time balance and performance metrics
- **Opportunity Table**: Live arbitrage opportunities with execution capabilities
- **Agent Management**: Creation and management of automated trading bots
- **Charts & Analytics**: Price spread visualization and market analysis

### Data Models
- **Users**: Authentication and user management
- **Arbitrage Opportunities**: Market opportunities with spread calculations
- **Trading Agents**: Automated trading configurations
- **Transactions**: Complete trade execution records
- **Portfolio**: User balance and performance tracking
- **Chain Status**: Blockchain network monitoring

## Data Flow

1. **Market Data Ingestion**: External APIs feed price data from multiple chains
2. **Opportunity Detection**: Backend algorithms identify profitable arbitrage opportunities
3. **Agent Execution**: Automated agents execute trades based on user-defined parameters
4. **Real-time Updates**: Frontend receives live updates via polling mechanism
5. **Transaction Processing**: Blockchain interactions through 1Inch Fusion+ integration
6. **Portfolio Updates**: Balance and performance metrics updated in real-time

## External Dependencies

### Blockchain Integration
- **1Inch Fusion+ SDK**: Primary DEX aggregator for swap execution
- **Chainlink Oracles**: Price feeds and peg protection mechanisms
- **Neon Database**: Serverless PostgreSQL hosting
- **Alchemy/Similar**: Blockchain RPC providers for Ethereum and Celo
- **Sui RPC**: Official Sui network connectivity

### Wallet & Authentication
- **WalletConnect**: Multi-chain wallet connection support
- **MetaMask**: Celo network wallet integration
- **Sui Wallet**: Native Sui network wallet support

### Development Tools
- **Replit Integration**: Development environment optimization
- **Vite Plugins**: Runtime error handling and development cartographer

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Type Safety**: Comprehensive TypeScript configuration
- **Error Handling**: Runtime error modal for development debugging
- **Code Generation**: Automatic route and schema validation

### Production Build
- **Frontend**: Vite build with optimized bundling
- **Backend**: esbuild compilation for Node.js deployment
- **Database**: Drizzle migrations for schema deployment
- **Environment**: Node.js production runtime

### Architecture Decisions

#### Database Choice: Drizzle + PostgreSQL
- **Problem**: Need for type-safe database operations with complex financial data
- **Solution**: Drizzle ORM with PostgreSQL for ACID compliance and type safety
- **Rationale**: Superior TypeScript integration and migration management
- **Trade-offs**: Learning curve vs. runtime safety and developer experience

#### State Management: TanStack Query
- **Problem**: Complex server state synchronization with real-time updates
- **Solution**: React Query for caching, background updates, and optimistic updates
- **Rationale**: Built-in polling, error handling, and cache invalidation
- **Trade-offs**: Bundle size vs. comprehensive state management features

#### UI Framework: Shadcn/ui + Radix
- **Problem**: Need for professional, accessible, and customizable components
- **Solution**: Shadcn/ui built on Radix primitives with Tailwind styling
- **Rationale**: Copy-paste components with full customization control
- **Trade-offs**: Manual component management vs. design system flexibility

#### Real-time Updates: Polling Strategy
- **Problem**: Need for live market data without WebSocket complexity
- **Solution**: Aggressive polling with smart intervals (5-30 seconds)
- **Rationale**: Simpler implementation with reliable fallback behavior
- **Trade-offs**: Network overhead vs. implementation simplicity

## Recent Changes

### January 29, 2025
- ✅ **Initial Application Build**: Created complete StableArbYieldBridge DeFi arbitrage platform
- ✅ **Data Schema**: Implemented comprehensive schema for arbitrage opportunities, trading agents, transactions, portfolio, and chain status
- ✅ **Backend API**: Built RESTful API with full CRUD operations and sample data
- ✅ **Frontend Dashboard**: Developed dark-themed trading interface with real-time updates
- ✅ **Core Components**: Live opportunity table, agent creator, portfolio overview, transaction history
- ✅ **TypeScript Fixes**: Resolved all type compatibility issues in storage layer
- ✅ **Documentation**: Added comprehensive README.md for repository
- ✅ **DeFi Bridge API**: Added production-ready index.js with real blockchain integrations
- ✅ **1Inch Integration**: Configured live API for price feeds and DEX aggregation
- ✅ **Chainlink Oracles**: Added oracle support for stablecoin peg monitoring
- ✅ **Cross-Chain Arbitrage**: Implemented Celo-Sui arbitrage detection
- ✅ **Environment Configuration**: Created .env.example template for deployment
- ✅ **GitHub Repository**: Successfully pushed all changes to production repository
- ✅ **Enhanced Price Endpoints**: Integrated advanced code snippet with multi-chain oracle support
- ✅ **Alchemy Integration**: Added testnet API key for enhanced blockchain connectivity  
- ✅ **Automated Peg Monitoring**: Real-time stablecoin deviation detection with auto-pause
- ✅ **Testnet Configuration**: Updated to Sepolia and Alfajores testnets with live oracles
- ✅ **Comprehensive Multi-Chain API**: Deployed complete enhanced index.js with advanced DeFi features
- ✅ **Full Testnet Connectivity**: Ethereum Sepolia, Celo Alfajores, and Sui testnet all connected
- ✅ **Advanced Oracle Integration**: Live Chainlink feeds with automated peg monitoring system
- ✅ **Production-Ready Error Handling**: Robust fallback mechanisms and graceful degradation
- ✅ **Wallet Integration Complete**: Added CELO_PRIVATE_KEY and SUI_PRIVATE_KEY to environment
- ✅ **Live Wallet Connectivity**: Celo wallet (0x391F48752acD48271040466d748FcB367f2d2a1F) connected to Alfajores testnet
- ✅ **Wallet Balance Endpoint**: Added /api/wallet/balances for real-time balance monitoring
- ✅ **Transaction-Ready Setup**: Full wallet integration for automated arbitrage trading
- ✅ **Transaction Lookup System**: Added /api/transactions/:txHash endpoint for real transaction verification
- ✅ **Simulated Cross-Chain Swap**: Successfully demonstrated complete arbitrage flow with profit calculation
- ✅ **Real Swap Endpoint**: Added /api/swap/execute for live cUSD blockchain transactions
- ✅ **Swap Integration**: Complete swap functionality integrated into main application with portfolio updates
- ✅ **Transaction Recording**: Automatic transaction storage and balance tracking system operational