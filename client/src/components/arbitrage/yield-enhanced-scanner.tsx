import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Zap, DollarSign, Clock, Shield, Target, Sparkles } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface YieldStrategy {
  protocol: string;
  apy: number;
  riskLevel: string;
  tvl: string;
  minDeposit: number;
  description: string;
}

interface YieldOpportunity {
  baseArbitrage: {
    spread: number;
    profit: string;
  };
  yieldEnhancement: {
    strategy: string;
    apy: number;
    expectedYield: number;
    holdingPeriod: string;
  };
  totalExpectedReturn: string;
  riskAssessment: {
    arbitrageRisk: string;
    yieldRisk: string;
    overallRisk: string;
  };
  estimatedTimeline: {
    arbitrageExecution: string;
    yieldSetup: string;
    totalSetup: string;
    holdingPeriod: string;
  };
}

export default function YieldEnhancedScanner() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("USDY");
  const [holdingPeriod, setHoldingPeriod] = useState<number>(30);
  const [amount, setAmount] = useState<number>(1000);
  const [minSpread, setMinSpread] = useState<number>(0.3);
  const { toast } = useToast();

  // Fetch yield-enhanced arbitrage opportunities
  const { data: yieldArbitrageData, isLoading: arbitrageLoading, refetch: refetchArbitrage } = useQuery({
    queryKey: ['/api/arbitrage/sepolia-sui-yield', minSpread],
    queryFn: async () => {
      const response = await fetch(`/api/arbitrage/sepolia-sui-yield?minSpread=${minSpread}&yieldEnabled=true`);
      if (!response.ok) throw new Error('Failed to fetch yield arbitrage');
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Execute yield-enhanced swap mutation
  const yieldSwapMutation = useMutation({
    mutationFn: async (params: {
      fromToken: string;
      toToken: string;
      amount: number;
      yieldStrategy: string;
      holdingPeriod: number;
    }) => {
      const response = await fetch('/api/swap/sepolia-sui-yield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          sessionId: `yield-${Date.now()}`,
          enableYieldRouting: true,
          minSpread
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
        title: "Yield-Enhanced Swap Initiated",
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

  const arbitrageData = yieldArbitrageData?.data || {};
  const yieldOpportunities = arbitrageData.yieldOpportunities || [];
  const yieldData = arbitrageData.yieldData || {};

  // Available yield strategies
  const yieldStrategies: YieldStrategy[] = [
    {
      protocol: "USDY",
      apy: 5.2,
      riskLevel: "LOW",
      tvl: "$2.1B",
      minDeposit: 100,
      description: "Tokenized USD deposits backed by short-term US Treasury bills"
    },
    {
      protocol: "Scallop",
      apy: 4.8,
      riskLevel: "MEDIUM",
      tvl: "$45M",
      minDeposit: 50,
      description: "Sui DeFi lending protocol with variable rates"
    },
    {
      protocol: "SUI Staking",
      apy: 3.1,
      riskLevel: "LOW",
      tvl: "$8.2B",
      minDeposit: 1,
      description: "Native SUI network validation rewards"
    }
  ];

  const executeYieldSwap = (fromToken: string, toToken: string) => {
    yieldSwapMutation.mutate({
      fromToken,
      toToken,
      amount,
      yieldStrategy: selectedStrategy,
      holdingPeriod
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Yield-Enhanced Arbitrage Scanner
            <Badge variant="secondary" className="ml-auto">
              Enhanced Strategy
            </Badge>
          </CardTitle>
          <CardDescription>
            Advanced arbitrage opportunities with integrated yield farming across Ethereum Sepolia and Sui networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="opportunities" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="opportunities">Live Opportunities</TabsTrigger>
              <TabsTrigger value="strategies">Yield Strategies</TabsTrigger>
              <TabsTrigger value="calculator">Return Calculator</TabsTrigger>
            </TabsList>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Spread (%)</label>
                  <Input
                    type="number"
                    value={minSpread}
                    onChange={(e) => setMinSpread(parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ($)</label>
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
                      <SelectItem value="SUI">SUI Staking (3.1% APY)</SelectItem>
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

              <div className="flex gap-2 mb-4">
                <Button 
                  onClick={() => refetchArbitrage()} 
                  disabled={arbitrageLoading}
                  variant="outline"
                >
                  {arbitrageLoading ? "Scanning..." : "Refresh Opportunities"}
                </Button>
                <Button 
                  onClick={() => executeYieldSwap("USDC", "USDY")}
                  disabled={yieldSwapMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {yieldSwapMutation.isPending ? "Executing..." : "Execute USDC → USDY"}
                </Button>
              </div>

              {arbitrageLoading ? (
                <div className="space-y-4">
                  <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              ) : yieldOpportunities.length > 0 ? (
                <div className="space-y-4">
                  {yieldOpportunities.map((opportunity: any, index: number) => (
                    <Card key={index} className="border-purple-200 dark:border-purple-800">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Base Arbitrage</div>
                            <div className="font-bold text-lg">
                              {opportunity.spread?.toFixed(4)}% spread
                            </div>
                            <div className="text-sm text-green-600">
                              +${opportunity.estimatedProfit || '0.00'} profit
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Yield Enhancement</div>
                            <div className="font-bold text-lg text-purple-600">
                              {yieldData[selectedStrategy]?.apy}% APY
                            </div>
                            <div className="text-sm">
                              {holdingPeriod} days holding
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Total Expected Return</div>
                            <div className="font-bold text-xl text-green-600">
                              +${((parseFloat(opportunity.estimatedProfit || '0') + (amount * yieldData[selectedStrategy]?.apy / 100 * holdingPeriod / 365)) || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              on ${amount} investment
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Risk Level</div>
                            <Badge variant="outline" className="w-fit">
                              LOW-MEDIUM
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              Estimated setup: 30-55 min
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <div className="text-lg font-medium mb-2">No Yield Opportunities Found</div>
                    <div className="text-muted-foreground mb-4">
                      Current market conditions don't meet the minimum spread requirement of {minSpread}%
                    </div>
                    <Button 
                      onClick={() => setMinSpread(0.1)} 
                      variant="outline"
                    >
                      Lower Minimum Spread to 0.1%
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="strategies" className="space-y-4">
              <div className="grid gap-4">
                {yieldStrategies.map((strategy) => (
                  <Card key={strategy.protocol} className={selectedStrategy === strategy.protocol ? "border-purple-500" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="font-bold text-lg">{strategy.protocol}</div>
                          <div className="text-2xl font-bold text-purple-600">{strategy.apy}% APY</div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={strategy.riskLevel === 'LOW' ? 'default' : 'secondary'}>
                            {strategy.riskLevel} RISK
                          </Badge>
                          <div className="text-sm text-muted-foreground">TVL: {strategy.tvl}</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        {strategy.description}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          Min Deposit: <span className="font-medium">${strategy.minDeposit}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant={selectedStrategy === strategy.protocol ? "default" : "outline"}
                          onClick={() => setSelectedStrategy(strategy.protocol)}
                        >
                          {selectedStrategy === strategy.protocol ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calculator" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Yield-Enhanced Return Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
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
                            <SelectItem value="SUI">SUI Staking (3.1% APY)</SelectItem>
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

                    <div className="space-y-4">
                      {(() => {
                        const selectedYield = yieldStrategies.find(s => s.protocol === selectedStrategy);
                        const yieldReturn = amount * (selectedYield?.apy || 0) / 100 * holdingPeriod / 365;
                        const arbitrageReturn = amount * 0.5 / 100; // Estimated 0.5% arbitrage
                        const totalReturn = yieldReturn + arbitrageReturn;
                        
                        return (
                          <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-lg font-bold">Projected Returns</div>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm">Base Investment:</span>
                                <span className="font-medium">${amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Arbitrage Profit:</span>
                                <span className="font-medium text-green-600">+${arbitrageReturn.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Yield Earnings ({holdingPeriod}d):</span>
                                <span className="font-medium text-purple-600">+${yieldReturn.toFixed(2)}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between text-lg">
                                <span className="font-bold">Total Return:</span>
                                <span className="font-bold text-green-600">+${totalReturn.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Total Value:</span>
                                <span>${(amount + totalReturn).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}