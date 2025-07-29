import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { useState } from "react";

export function PriceSpreadChart() {
  const [timeframe, setTimeframe] = useState("1H");

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-50">Price Spread Analysis</h3>
          <div className="flex space-x-2">
            {["1H", "4H", "1D"].map((tf) => (
              <Button
                key={tf}
                size="sm"
                variant={timeframe === tf ? "default" : "outline"}
                onClick={() => setTimeframe(tf)}
                className={
                  timeframe === tf
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                }
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="h-64 bg-slate-700 rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent"></div>
          <div className="text-slate-400 text-center z-10">
            <BarChart3 className="mx-auto mb-2" size={48} />
            <div className="text-sm">Chart visualization</div>
            <div className="text-xs mt-1">Showing USDC spread: Celo vs Sui</div>
          </div>
          
          <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">
            Max: 1.24% | Min: 0.31% | Avg: 0.73%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
