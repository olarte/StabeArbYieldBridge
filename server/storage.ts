import { 
  type User, 
  type InsertUser, 
  type ArbitrageOpportunity, 
  type InsertArbitrageOpportunity,
  type TradingAgent,
  type InsertTradingAgent,
  type Transaction,
  type InsertTransaction,
  type Portfolio,
  type InsertPortfolio,
  type ChainStatus,
  type InsertChainStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Arbitrage Opportunities
  getArbitrageOpportunities(): Promise<ArbitrageOpportunity[]>;
  getActiveArbitrageOpportunities(): Promise<ArbitrageOpportunity[]>;
  createArbitrageOpportunity(opportunity: InsertArbitrageOpportunity): Promise<ArbitrageOpportunity>;
  updateArbitrageOpportunity(id: string, updates: Partial<ArbitrageOpportunity>): Promise<ArbitrageOpportunity | undefined>;

  // Trading Agents
  getTradingAgents(): Promise<TradingAgent[]>;
  getActiveTradingAgents(): Promise<TradingAgent[]>;
  getTradingAgent(id: string): Promise<TradingAgent | undefined>;
  createTradingAgent(agent: InsertTradingAgent): Promise<TradingAgent>;
  updateTradingAgent(id: string, updates: Partial<TradingAgent>): Promise<TradingAgent | undefined>;
  deleteTradingAgent(id: string): Promise<boolean>;

  // Transactions
  getTransactions(limit?: number): Promise<Transaction[]>;
  getTransactionsByAgent(agentId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Portfolio
  getPortfolio(): Promise<Portfolio | undefined>;
  updatePortfolio(updates: Partial<Portfolio>): Promise<Portfolio>;

  // Chain Status
  getChainStatuses(): Promise<ChainStatus[]>;
  getChainStatus(chainName: string): Promise<ChainStatus | undefined>;
  updateChainStatus(chainName: string, updates: Partial<ChainStatus>): Promise<ChainStatus>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private arbitrageOpportunities: Map<string, ArbitrageOpportunity>;
  private tradingAgents: Map<string, TradingAgent>;
  private transactions: Map<string, Transaction>;
  private portfolio: Portfolio | undefined;
  private chainStatuses: Map<string, ChainStatus>;

  constructor() {
    this.users = new Map();
    this.arbitrageOpportunities = new Map();
    this.tradingAgents = new Map();
    this.transactions = new Map();
    this.chainStatuses = new Map();
    
    // Initialize default portfolio
    this.portfolio = {
      id: randomUUID(),
      totalBalance: "12458.32",
      dailyProfit: "186.45",
      weeklyProfit: "892.18",
      totalProfit: "3421.67",
      successRate: "94.20",
      updatedAt: new Date(),
    };

    // Initialize chain statuses
    this.initializeChainStatuses();
    this.initializeSampleData();
  }

  private initializeChainStatuses() {
    const chains = [
      { chainName: "Celo", isOnline: true, latency: 12, lastBlockNumber: "20123456" },
      { chainName: "Sui", isOnline: true, latency: 8, lastBlockNumber: "15789123" },
      { chainName: "Ethereum", isOnline: true, latency: 2100, lastBlockNumber: "18934567" },
    ];

    chains.forEach(chain => {
      const status: ChainStatus = {
        id: randomUUID(),
        ...chain,
        updatedAt: new Date(),
      };
      this.chainStatuses.set(chain.chainName, status);
    });
  }

  private initializeSampleData() {
    // Sample arbitrage opportunities
    const opportunities = [
      {
        assetPairFrom: "USDC",
        assetPairTo: "USDC",
        sourceChain: "Celo",
        targetChain: "Sui",
        spread: "1.24",
        profitEstimate: "12.40",
        minAmount: "500.00",
        maxAmount: "10000.00",
        isActive: true,
      },
      {
        assetPairFrom: "USDT",
        assetPairTo: "USDT",
        sourceChain: "Sui",
        targetChain: "Celo",
        spread: "0.87",
        profitEstimate: "8.70",
        minAmount: "300.00",
        maxAmount: "5000.00",
        isActive: true,
      },
      {
        assetPairFrom: "DAI",
        assetPairTo: "USDC",
        sourceChain: "Celo",
        targetChain: "Sui",
        spread: "0.56",
        profitEstimate: "5.60",
        minAmount: "750.00",
        maxAmount: "15000.00",
        isActive: true,
      },
    ];

    opportunities.forEach(opp => {
      this.createArbitrageOpportunity(opp);
    });

    // Sample trading agents
    const agents = [
      {
        name: "USDC Arbitrage Bot",
        minSpread: "0.5",
        maxAmount: "1000.00",
        assetPair: "USDC/USDC",
        sourceChain: "Celo",
        targetChain: "Sui",
        frequency: 5,
        isActive: true,
      },
      {
        name: "DAI Cross-Chain",
        minSpread: "0.8",
        maxAmount: "2500.00",
        assetPair: "DAI/USDC",
        sourceChain: "Celo",
        targetChain: "Sui",
        frequency: 15,
        isActive: true,
      },
      {
        name: "USDT Monitor",
        minSpread: "1.0",
        maxAmount: "500.00",
        assetPair: "USDT/USDT",
        sourceChain: "Sui",
        targetChain: "Celo",
        frequency: 10,
        isActive: false,
      },
    ];

    agents.forEach(agent => {
      this.createTradingAgent(agent);
    });

    // Real completed transactions from user's previous swaps
    const recentTransactions = [
      {
        agentId: null,
        assetPairFrom: "USDC",
        assetPairTo: "USDY",
        sourceChain: "ethereum",
        targetChain: "sui",
        amount: "10.00",
        profit: "0.085",
        spread: "0.85",
        status: "completed",
        txHash: "0xb822a878a7b4fd0a07ceffb90ec0e1ac33c34fb1700e57ed053c6a2429540656",
      },
      {
        agentId: null,
        assetPairFrom: "USDC",
        assetPairTo: "USDY",
        sourceChain: "ethereum",
        targetChain: "sui",
        amount: "5.00",
        profit: "0.075",
        spread: "1.50",
        status: "completed",
        txHash: "GhhJs73xNrSBzpvP18sgJ6XXDSjdAmjqKXgEGs9f56KF",
      },
    ];

    recentTransactions.forEach(tx => {
      this.createTransaction(tx);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Arbitrage Opportunities methods
  async getArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    return Array.from(this.arbitrageOpportunities.values());
  }

  async getActiveArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    return Array.from(this.arbitrageOpportunities.values()).filter(opp => opp.isActive);
  }

  async createArbitrageOpportunity(insertOpportunity: InsertArbitrageOpportunity): Promise<ArbitrageOpportunity> {
    const id = randomUUID();
    const now = new Date();
    const opportunity: ArbitrageOpportunity = {
      ...insertOpportunity,
      id,
      maxAmount: insertOpportunity.maxAmount || null,
      isActive: insertOpportunity.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.arbitrageOpportunities.set(id, opportunity);
    return opportunity;
  }

  async updateArbitrageOpportunity(id: string, updates: Partial<ArbitrageOpportunity>): Promise<ArbitrageOpportunity | undefined> {
    const opportunity = this.arbitrageOpportunities.get(id);
    if (!opportunity) return undefined;

    const updated: ArbitrageOpportunity = {
      ...opportunity,
      ...updates,
      updatedAt: new Date(),
    };
    this.arbitrageOpportunities.set(id, updated);
    return updated;
  }

  // Trading Agents methods
  async getTradingAgents(): Promise<TradingAgent[]> {
    return Array.from(this.tradingAgents.values());
  }

  async getActiveTradingAgents(): Promise<TradingAgent[]> {
    return Array.from(this.tradingAgents.values()).filter(agent => agent.isActive);
  }

  async getTradingAgent(id: string): Promise<TradingAgent | undefined> {
    return this.tradingAgents.get(id);
  }

  async createTradingAgent(insertAgent: InsertTradingAgent): Promise<TradingAgent> {
    const id = randomUUID();
    const now = new Date();
    const agent: TradingAgent = {
      ...insertAgent,
      id,
      isActive: insertAgent.isActive ?? true,
      totalTrades: 0,
      totalProfit: "0.00",
      createdAt: now,
      updatedAt: now,
    };
    this.tradingAgents.set(id, agent);
    return agent;
  }

  async updateTradingAgent(id: string, updates: Partial<TradingAgent>): Promise<TradingAgent | undefined> {
    const agent = this.tradingAgents.get(id);
    if (!agent) return undefined;

    const updated: TradingAgent = {
      ...agent,
      ...updates,
      updatedAt: new Date(),
    };
    this.tradingAgents.set(id, updated);
    return updated;
  }

  async deleteTradingAgent(id: string): Promise<boolean> {
    return this.tradingAgents.delete(id);
  }

  // Transaction methods
  async getTransactions(limit = 50): Promise<Transaction[]> {
    const transactions = Array.from(this.transactions.values());
    return transactions
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }

  async getTransactionsByAgent(agentId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.agentId === agentId)
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      agentId: insertTransaction.agentId || null,
      txHash: insertTransaction.txHash || null,
      executedAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updated: Transaction = {
      ...transaction,
      ...updates,
    };
    this.transactions.set(id, updated);
    return updated;
  }

  // Portfolio methods
  async getPortfolio(): Promise<Portfolio | undefined> {
    return this.portfolio;
  }

  async updatePortfolio(updates: Partial<Portfolio>): Promise<Portfolio> {
    this.portfolio = {
      ...this.portfolio!,
      ...updates,
      updatedAt: new Date(),
    };
    return this.portfolio;
  }

  // Chain Status methods
  async getChainStatuses(): Promise<ChainStatus[]> {
    return Array.from(this.chainStatuses.values());
  }

  async getChainStatus(chainName: string): Promise<ChainStatus | undefined> {
    return this.chainStatuses.get(chainName);
  }

  async updateChainStatus(chainName: string, updates: Partial<ChainStatus>): Promise<ChainStatus> {
    const existing = this.chainStatuses.get(chainName);
    const status: ChainStatus = {
      id: existing?.id || randomUUID(),
      chainName,
      isOnline: updates.isOnline ?? existing?.isOnline ?? true,
      latency: updates.latency ?? existing?.latency ?? 0,
      lastBlockNumber: updates.lastBlockNumber ?? existing?.lastBlockNumber ?? null,
      updatedAt: new Date(),
    };
    this.chainStatuses.set(chainName, status);
    return status;
  }
}

export const storage = new MemStorage();
