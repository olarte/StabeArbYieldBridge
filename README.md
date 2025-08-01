# 🤺 Sabre

A sophisticated multichain DeFi arbitrage platform that enables automated stablecoin swaps between Celo and Sui networks with yield optimization capabilities.

## Features

- **Live Arbitrage Opportunities**: Real-time scanning for price discrepancies between Celo and Sui networks
- **Trading Agents**: Automated bots for executing trades based on user-defined criteria
- **Portfolio Management**: Comprehensive balance tracking and profit/loss calculations
- **One-Click Execution**: Simple interface for manual arbitrage execution
- **Dark Theme Dashboard**: Professional trading interface with real-time updates

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** for styling
- **TanStack Query** for server state management
- **Wouter** for lightweight routing

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **In-memory storage** for fast development
- **RESTful API** with structured error handling

### Key Components

#### Core Business Logic
- Arbitrage opportunity detection and management
- Automated trading agent system
- Portfolio tracking and analytics
- Transaction history and status monitoring
- Chain status monitoring for Celo, Sui, and Ethereum

#### Data Models
- **Arbitrage Opportunities**: Price spreads with profit calculations
- **Trading Agents**: Automated trading configurations
- **Transactions**: Complete trade execution records
- **Portfolio**: Balance and performance metrics
- **Chain Status**: Network health monitoring

## Getting Started

### Prerequisites
- Node.js 20 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at the local development URL.

## API Endpoints

### Arbitrage
- `GET /api/arbitrage/opportunities` - Get active arbitrage opportunities
- `POST /api/arbitrage/execute` - Execute an arbitrage trade

### Trading Agents
- `GET /api/agents` - Get all trading agents
- `GET /api/agents/active` - Get active trading agents
- `POST /api/agents` - Create a new trading agent
- `PATCH /api/agents/:id` - Update a trading agent
- `DELETE /api/agents/:id` - Delete a trading agent

### Portfolio & Transactions
- `GET /api/portfolio` - Get portfolio overview
- `GET /api/transactions` - Get transaction history
- `POST /api/transactions` - Create a new transaction

### Market Data
- `GET /api/market/stats` - Get market statistics
- `GET /api/chains/status` - Get blockchain network status

## Future Integrations

The platform is designed to integrate with:

- **1Inch Fusion+ SDK** for DEX aggregation
- **Chainlink Oracles** for price feeds and peg protection
- **WalletConnect** for multi-chain wallet connections
- **Alchemy/Sui RPC** for blockchain connectivity

## Development

### Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and configurations
│   │   └── pages/          # Page components
├── server/                 # Backend Express application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data storage layer
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema and types
└── components.json        # Shadcn/ui configuration
```

### Key Features in This Version

- ✅ Complete data schema for all business entities
- ✅ RESTful API with full CRUD operations
- ✅ Dark-themed dashboard with professional design
- ✅ Live data updates with polling
- ✅ Interactive arbitrage opportunity table
- ✅ Trading agent creation and management
- ✅ Portfolio overview with real-time stats
- ✅ Transaction history tracking
- ✅ Chain status monitoring

## License

This project is developed for DeFi arbitrage and yield optimization purposes.