import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from "lucide-react";

interface UniswapPriceData {
  success: boolean;
  data: {
    pair: string;
    poolAddress: string;
    fee: number;
    price: {
      token0ToToken1: number;
      token1ToToken0: number;
      formatted: string;
    };
    poolStats: {
      sqrtPriceX96: string;
      tick: number;
      liquidity: string;
      tvl: {
        liquidity: number;
        estimated: boolean;
        note: string;
      };
    };
    tokens: {
      token0: { address: string; symbol: string };
      token1: { address: string; symbol: string };
    };
    timestamp: string;
  };
  source: string;
  note: string;
}

interface UniswapQuoteData {
  success: boolean;
  data: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    estimatedAmountOut: string;
    rate: number;
    fee: number;
    priceImpact: string;
    poolAddress: string;
    minimumAmountOut: string;
    gasEstimate: string;
    timestamp: string;
  };
  source: string;
  note: string;
}

export function UniswapPrices() {
  // Fetch Uniswap prices for cUSD-USDC pair
  const { data: priceData, isLoading: priceLoading, refetch: refetchPrice } = useQuery<UniswapPriceData>({
    queryKey: ['/api/uniswap/price/cUSD-USDC'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch quote for 100 cUSD to USDC
  const { data: quoteData, isLoading: quoteLoading, refetch: refetchQuote } = useQuery<UniswapQuoteData>({
    queryKey: ['/api/uniswap/quote'],
    queryFn: () => fetch('/api/uniswap/quote?tokenIn=cUSD&tokenOut=USDC&amountIn=100').then(res => res.json()),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetchPrice();
    refetchQuote();
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Uniswap V3 Prices
          </CardTitle>
          <CardDescription className="text-slate-400">
            Live Celo DEX prices and trading quotes
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={priceLoading || quoteLoading}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${(priceLoading || quoteLoading) ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price Data */}
        {priceLoading ? (
          <div className="text-slate-400">Loading price data...</div>
        ) : priceData?.success ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Current Price:</span>
              <div className="text-right">
                <div className="text-lg font-semibold text-slate-50">
                  {priceData.data.price.formatted}
                </div>
                <div className="text-xs text-slate-400">
                  Fee Tier: {(priceData.data.fee * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            
            <Separator className="bg-slate-700" />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">cUSD → USDC</div>
                <div className="text-sm font-medium text-green-400">
                  {priceData.data.price.token0ToToken1.toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">USDC → cUSD</div>
                <div className="text-sm font-medium text-red-400">
                  {priceData.data.price.token1ToToken0.toFixed(6)}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              <div className="text-xs text-slate-400">Pool Information</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Liquidity:</span>
                  <div className="text-slate-300 font-mono">
                    {priceData.data.poolStats.tvl.liquidity.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Tick:</span>
                  <div className="text-slate-300 font-mono">
                    {priceData.data.poolStats.tick}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-400">Failed to load price data</div>
        )}

        <Separator className="bg-slate-700" />

        {/* Quote Data */}
        <div>
          <div className="text-sm font-medium text-slate-300 mb-2">
            Trade Quote (100 cUSD)
          </div>
          
          {quoteLoading ? (
            <div className="text-slate-400">Loading quote...</div>
          ) : quoteData?.success ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">You get:</span>
                <span className="text-sm font-semibold text-green-400">
                  {quoteData.data.estimatedAmountOut} USDC
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Price Impact:</span>
                <Badge 
                  variant={parseFloat(quoteData.data.priceImpact) < 1 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {quoteData.data.priceImpact}%
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Min. received:</span>
                <span className="text-xs text-slate-300">
                  {quoteData.data.minimumAmountOut} USDC
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Gas estimate:</span>
                <span className="text-xs text-slate-300">
                  {quoteData.data.gasEstimate}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-red-400">Failed to load quote</div>
          )}
        </div>

        {/* Status */}
        <div className="pt-2 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Source: {priceData?.source || 'Uniswap V3'}</span>
            <span>Updated: {priceData?.data?.timestamp ? new Date(priceData.data.timestamp).toLocaleTimeString() : 'N/A'}</span>
          </div>
          {priceData?.note && (
            <div className="text-xs text-blue-400 mt-1">
              {priceData.note}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}