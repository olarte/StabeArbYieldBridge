import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const arbitrageOpportunities = pgTable("arbitrage_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetPairFrom: text("asset_pair_from").notNull(),
  assetPairTo: text("asset_pair_to").notNull(),
  sourceChain: text("source_chain").notNull(),
  targetChain: text("target_chain").notNull(),
  spread: decimal("spread", { precision: 10, scale: 4 }).notNull(),
  profitEstimate: decimal("profit_estimate", { precision: 10, scale: 2 }).notNull(),
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tradingAgents = pgTable("trading_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  minSpread: decimal("min_spread", { precision: 10, scale: 4 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }).notNull(),
  assetPair: text("asset_pair").notNull(),
  sourceChain: text("source_chain").notNull(),
  targetChain: text("target_chain").notNull(),
  frequency: integer("frequency").notNull(), // in minutes
  isActive: boolean("is_active").default(true).notNull(),
  totalTrades: integer("total_trades").default(0).notNull(),
  totalProfit: decimal("total_profit", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ethereumWallet: text("ethereum_wallet"),
  suiWallet: text("sui_wallet"),
  assetPairFrom: text("asset_pair_from").notNull(),
  assetPairTo: text("asset_pair_to").notNull(),
  sourceChain: text("source_chain").notNull(),
  targetChain: text("target_chain").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  amountReceived: decimal("amount_received", { precision: 18, scale: 8 }),
  profit: decimal("profit", { precision: 18, scale: 8 }).notNull(),
  spread: decimal("spread", { precision: 10, scale: 4 }).notNull(),
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  ethereumTxHash: text("ethereum_tx_hash"),
  suiTxHash: text("sui_tx_hash"),
  explorerUrls: text("explorer_urls"), // JSON string with both explorer URLs
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const portfolio = pgTable("portfolio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalBalance: decimal("total_balance", { precision: 15, scale: 2 }).default("0").notNull(),
  dailyProfit: decimal("daily_profit", { precision: 10, scale: 2 }).default("0").notNull(),
  weeklyProfit: decimal("weekly_profit", { precision: 10, scale: 2 }).default("0").notNull(),
  totalProfit: decimal("total_profit", { precision: 10, scale: 2 }).default("0").notNull(),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chainStatus = pgTable("chain_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chainName: text("chain_name").notNull().unique(),
  isOnline: boolean("is_online").default(true).notNull(),
  latency: integer("latency").notNull(), // in milliseconds
  lastBlockNumber: text("last_block_number"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertArbitrageOpportunitySchema = createInsertSchema(arbitrageOpportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradingAgentSchema = createInsertSchema(tradingAgents).omit({
  id: true,
  totalTrades: true,
  totalProfit: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  executedAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolio).omit({
  id: true,
  updatedAt: true,
});

export const insertChainStatusSchema = createInsertSchema(chainStatus).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ArbitrageOpportunity = typeof arbitrageOpportunities.$inferSelect;
export type InsertArbitrageOpportunity = z.infer<typeof insertArbitrageOpportunitySchema>;

export type TradingAgent = typeof tradingAgents.$inferSelect;
export type InsertTradingAgent = z.infer<typeof insertTradingAgentSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Portfolio = typeof portfolio.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type ChainStatus = typeof chainStatus.$inferSelect;
export type InsertChainStatus = z.infer<typeof insertChainStatusSchema>;

// Additional types for DeFi operations
export interface ArbOpportunity {
  id: string;
  pair: string;
  spread: number;
  profit: number;
  profitPercent: string;
  direction: string;
  volumeLimit?: number;
  fromChain: string;
  toChain: string;
  minAmount: number;
  maxAmount: number;
}

export interface PegStatus {
  chainlinkFeeds?: {
    celo?: number;
    ethereum?: number;
  };
  dexPrices?: {
    celoUniswap?: number;
    suiCetus?: number;
  };
  safety?: {
    safe: boolean;
    alerts: string[];
  };
  deviations?: any;
  globalStatus?: any;
}

export interface SwapResult {
  id: string;
  opportunity: ArbOpportunity;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  txHash?: string;
  actualProfit?: number;
}
