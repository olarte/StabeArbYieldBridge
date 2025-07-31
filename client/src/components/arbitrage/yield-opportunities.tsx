import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, TrendingUp, DollarSign, Clock, Shield } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface YieldOpportunity {
  protocol: string;
  apy: number;
  tvl: string;
  riskLevel: string;
  minDeposit: number;
  description: string;
  returns: {
    daily: string;
    monthly: string;
    yearly: string;
  };
}

export default function YieldOpportunities() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("USDY");
  const [amount, setAmount] = useState<number>(1000);
  const [holdingPeriod, setHoldingPeriod] = useState<number>(30);
  const { toast } = useToast();

  // Execute yield-enhanced swap
  const yieldSwapMutation = useMutation({
    mutationFn: async (params: { fromToken: string; toToken: string; amount: number }) => {
      const response = await fetch('/api/swap/sepolia-sui-yield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          sessionId: `yield-${Date.now()}`,
          enableYieldRouting: true,
          yieldStrategy: selectedStrategy,
          holdingPeriod,
          minSpread: 0.1
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to execute yield swap');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Yield Swap Initiated",
        description: `Expected return: $${data.data.totalExpectedReturn} over ${holdingPeriod} days`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/history'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Swap Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const yieldStrategies: YieldOpportunity[] = [
    {
      protocol: "USDY",
      apy: 5.2,
      tvl: "$2.1B",
      riskLevel: "LOW",
      minDeposit: 100,
      description: "Tokenized USD backed by US Treasury bills",
      returns: {
        daily: ((amount * 5.2 / 100 / 365)).toFixed(2),
        monthly: ((amount * 5.2 / 100 / 12)).toFixed(2),
        yearly: ((amount * 5.2 / 100)).toFixed(2)
      }
    },
    {
      protocol: "Scallop",
      apy: 4.8,
      tvl: "$45M",
      riskLevel: "MEDIUM",
      minDeposit: 50,
      description: "Sui DeFi lending protocol with variable rates",
      returns: {
        daily: ((amount * 4.8 / 100 / 365)).toFixed(2),
        monthly: ((amount * 4.8 / 100 / 12)).toFixed(2),
        yearly: ((amount * 4.8 / 100)).toFixed(2)
      }
    },
    {
      protocol: "SUI Staking",
      apy: 3.1,
      tvl: "$8.2B",
      riskLevel: "LOW",
      minDeposit: 1,
      description: "Native SUI network validation rewards",
      returns: {
        daily: ((amount * 3.1 / 100 / 365)).toFixed(2),
        monthly: ((amount * 3.1 / 100 / 12)).toFixed(2),
        yearly: ((amount * 3.1 / 100)).toFixed(2)
      }
    }
  ];

  const selectedYieldData = yieldStrategies.find(s => s.protocol === selectedStrategy);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Yield Farming Opportunities
        </CardTitle>
        <CardDescription>
          Maximize returns with integrated yield strategies while executing arbitrage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Investment Amount ($)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              min="100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Yield Strategy</label>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDY">USDY (5.2% APY)</SelectItem>
                <SelectItem value="Scallop">Scallop (4.8% APY)</SelectItem>
                <SelectItem value="SUI Staking">SUI Staking (3.1% APY)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Holding Period (days)</label>
            <Input
              type="number"
              value={holdingPeriod}
              onChange={(e) => setHoldingPeriod(parseInt(e.target.value) || 30)}
              min="1"
              max="365"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {yieldStrategies.map((strategy) => (
            <Card key={strategy.protocol} className={`${selectedStrategy === strategy.protocol ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{strategy.protocol}</span>
                      <Badge variant={strategy.riskLevel === 'LOW' ? 'default' : 'secondary'}>
                        {strategy.riskLevel} RISK
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-2xl font-bold text-green-600">{strategy.apy}% APY</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        TVL: {strategy.tvl}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {strategy.description}
                    </p>
                    
                    <div className="text-xs text-muted-foreground">
                      Min Deposit: ${strategy.minDeposit}
                    </div>
                  </div>

                  {selectedStrategy === strategy.protocol && (
                    <div className="space-y-2 text-right">
                      <div className="text-sm font-medium">Projected Returns</div>
                      <div className="space-y-1">
                        <div className="text-xs">
                          Daily: <span className="font-medium text-green-600">+${strategy.returns.daily}</span>
                        </div>
                        <div className="text-xs">
                          Monthly: <span className="font-medium text-green-600">+${strategy.returns.monthly}</span>
                        </div>
                        <div className="text-xs">
                          Yearly: <span className="font-medium text-green-600">+${strategy.returns.yearly}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => yieldSwapMutation.mutate({ fromToken: "USDC", toToken: "USDY", amount })}
                        disabled={yieldSwapMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {yieldSwapMutation.isPending ? "Executing..." : "Execute Swap"}
                      </Button>
                    </div>
                  )}
                </div>

                {selectedStrategy !== strategy.protocol && (
                  <div className="mt-3 text-right">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedStrategy(strategy.protocol)}
                    >
                      Select Strategy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedYieldData && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-lg">Enhanced Return Summary</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Base Arbitrage</div>
                <div className="text-lg font-bold text-blue-600">+$5.00</div>
                <div className="text-xs text-muted-foreground">~0.5% profit</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Yield Earnings ({holdingPeriod}d)</div>
                <div className="text-lg font-bold text-purple-600">
                  +${((amount * selectedYieldData.apy / 100 * holdingPeriod / 365)).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">{selectedYieldData.apy}% APY</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total Expected</div>
                <div className="text-xl font-bold text-green-600">
                  +${(5 + (amount * selectedYieldData.apy / 100 * holdingPeriod / 365)).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Combined returns</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}