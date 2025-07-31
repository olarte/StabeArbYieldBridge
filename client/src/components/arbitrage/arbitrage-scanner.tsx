import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";

interface ArbitrageScanResult {
  success: boolean;
  data: {
    opportunities: Array<{
      id: string;
      assetPairFrom: string;
      assetPairTo: string;
      currentSpread: string;
      uniswapPrice: string;
      competitorPrice: string;
      estimatedProfit: string;
      optimalAmount: number;
      source: string;
      status: string;
      confidence: string;
      timestamp: string;
    }>;
    scannedPairs: number;
    foundOpportunities: number;
    minSpreadThreshold: number;
    timestamp: string;
    priceSource: string;
  };
  message: string;
}

export function ArbitrageScanner() {
  const [pairs, setPairs] = useState("USDC-WETH,USDC-USDT,USDC-USDY,WETH-USDT,WETH-USDY,USDT-USDY,USDC-DAI,WETH-DAI,USDT-DAI,DAI-USDY");
  const [minSpread, setMinSpread] = useState("0.01");
  const [isScanning, setIsScanning] = useState(false);

  const { data: scanResult, refetch, isLoading } = useQuery<ArbitrageScanResult>({
    queryKey: ['/api/scan-arbs', pairs, minSpread],
    queryFn: () => 
      fetch(`/api/scan-arbs?pairs=${pairs}&minSpread=${minSpread}&demo=true`)
        .then(res => res.json()),
    enabled: false, // Only run when manually triggered
  });

  const handleScan = async () => {
    setIsScanning(true);
    await refetch();
    setIsScanning(false);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-50">
          <Search className="h-5 w-5 text-purple-400" />
          Arbitrage Scanner
        </CardTitle>
        <CardDescription className="text-slate-400">
          Scan for arbitrage opportunities using Uniswap V3 prices on Ethereum Sepolia vs Sui Testnet
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Scanner Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pairs" className="text-slate-300">Token Pairs</Label>
            <Input
              id="pairs"
              value={pairs}
              onChange={(e) => setPairs(e.target.value)}
              placeholder="cUSD-USDC,USDC-CELO"
              className="bg-slate-900 border-slate-600 text-slate-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="minSpread" className="text-slate-300">Min Spread (%)</Label>
            <Input
              id="minSpread"
              value={minSpread}
              onChange={(e) => setMinSpread(e.target.value)}
              placeholder="0.1"
              type="number"
              step="0.1"
              className="bg-slate-900 border-slate-600 text-slate-50"
            />
          </div>
        </div>
        
        <Button 
          onClick={handleScan}
          disabled={isScanning || isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isScanning || isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Scan Opportunities
            </>
          )}
        </Button>
        
        <Separator className="bg-slate-700" />
        
        {/* Results */}
        {scanResult && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-50">Scan Results</h3>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Source: {scanResult.data.priceSource}</span>
                <span>•</span>
                <span>{new Date(scanResult.data.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {scanResult.data.scannedPairs}
                </div>
                <div className="text-xs text-slate-400">Pairs Scanned</div>
              </div>
              
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {scanResult.data.foundOpportunities}
                </div>
                <div className="text-xs text-slate-400">Opportunities</div>
              </div>
              
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {scanResult.data.minSpreadThreshold}%
                </div>
                <div className="text-xs text-slate-400">Min Spread</div>
              </div>
            </div>
            
            {/* Opportunities List */}
            {scanResult.data.opportunities.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-slate-300">Found Opportunities</h4>
                {scanResult.data.opportunities.map((opportunity, index) => (
                  <div key={opportunity.id} className="bg-slate-900 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-lg font-semibold text-slate-50">
                          {opportunity.assetPairFrom} → {opportunity.assetPairTo}
                        </div>
                        <div className="text-sm text-slate-400">
                          Spread: {opportunity.currentSpread}%
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={opportunity.confidence === 'high' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {opportunity.confidence}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {opportunity.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Uniswap Price:</span>
                        <div className="text-slate-300 font-mono">
                          {opportunity.uniswapPrice}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-slate-400">Competitor Price:</span>
                        <div className="text-slate-300 font-mono">
                          {opportunity.competitorPrice}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-slate-400">Est. Profit:</span>
                        <div className="text-green-400 font-semibold">
                          ${opportunity.estimatedProfit}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-slate-400">Optimal Amount:</span>
                        <div className="text-slate-300">
                          ${opportunity.optimalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-xs text-slate-500">
                        Source: {opportunity.source}
                      </span>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Execute Trade
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">
                  No arbitrage opportunities found with current parameters
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Try lowering the minimum spread threshold or scanning different pairs
                </p>
              </div>
            )}
            
            {scanResult.message && (
              <div className="text-sm text-slate-500 italic">
                {scanResult.message}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}