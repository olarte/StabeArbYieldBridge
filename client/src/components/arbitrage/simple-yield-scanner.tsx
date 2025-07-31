import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles } from "lucide-react";

export default function SimpleYieldScanner() {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Yield-Enhanced Arbitrage Scanner
        </CardTitle>
        <CardDescription>
          Real-time yield opportunities with cross-chain arbitrage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">5.2%</div>
            <div className="text-sm text-muted-foreground">USDY APY</div>
            <Badge variant="secondary" className="mt-2">LOW RISK</Badge>
          </div>
          <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">4.8%</div>
            <div className="text-sm text-muted-foreground">Scallop APY</div>
            <Badge variant="secondary" className="mt-2">MEDIUM RISK</Badge>
          </div>
          <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-green-600">3.1%</div>
            <div className="text-sm text-muted-foreground">SUI Staking APY</div>
            <Badge variant="secondary" className="mt-2">LOW RISK</Badge>
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-semibold">Live Opportunity</span>
          </div>
          <div className="text-sm text-muted-foreground">
            USDC → USDY swap with 5.2% APY yield farming
          </div>
          <div className="text-lg font-bold text-green-600 mt-1">
            Expected: +$0.43/month on $1000
          </div>
        </div>
      </CardContent>
    </Card>
  );
}