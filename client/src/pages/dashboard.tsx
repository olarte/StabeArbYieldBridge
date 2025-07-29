import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview";
import { PriceSpreadChart } from "@/components/charts/price-spread-chart";
import { OpportunityTable } from "@/components/arbitrage/opportunity-table";
import { AgentCreator } from "@/components/arbitrage/agent-creator";
import { ActiveAgents } from "@/components/arbitrage/active-agents";
import { RecentTransactions } from "@/components/transactions/recent-transactions";
import { UniswapPrices } from "@/components/uniswap/uniswap-prices";
import { ArbitrageScanner } from "@/components/arbitrage/arbitrage-scanner";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            {/* Market Overview */}
            <PortfolioOverview />

            {/* Price Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PriceSpreadChart />
              <UniswapPrices />
            </div>

            {/* Live Arbitrage Opportunities */}
            <OpportunityTable />

            {/* Agent Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AgentCreator />
              <ActiveAgents />
            </div>

            {/* Arbitrage Scanner */}
            <ArbitrageScanner />

            {/* Recent Transactions */}
            <RecentTransactions />
          </div>
        </main>
      </div>
    </div>
  );
}
