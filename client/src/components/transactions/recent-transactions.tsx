import { useTransactions } from "@/hooks/use-portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function RecentTransactions() {
  const { data: transactions, isLoading } = useTransactions(10);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-slate-50">Recent Transactions</h3>
      </div>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Pair
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Route
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Profit
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-slate-700/50">
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-6 w-20" />
                    </td>
                  </tr>
                ))
              ) : (
                transactions?.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-300 font-mono">
                        {format(new Date(transaction.executedAt), "HH:mm:ss")}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono font-medium text-slate-50">
                        {transaction.assetPairFrom}/{transaction.assetPairTo}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-300">
                        {transaction.sourceChain} → {transaction.targetChain}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-slate-50">${transaction.amount}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono font-semibold text-emerald-400">
                        +${transaction.profit}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
