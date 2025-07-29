import { useTradingAgents, useUpdateTradingAgent, useDeleteTradingAgent } from "@/hooks/use-agents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Pause, Play, Trash2 } from "lucide-react";

export function ActiveAgents() {
  const { data: agents, isLoading } = useTradingAgents();
  const updateAgent = useUpdateTradingAgent();
  const deleteAgent = useDeleteTradingAgent();
  const { toast } = useToast();

  const handlePause = async (id: string, isActive: boolean) => {
    try {
      await updateAgent.mutateAsync({
        id,
        updates: { isActive: !isActive },
      });

      toast({
        title: isActive ? "Agent Paused" : "Agent Resumed",
        description: `Trading agent ${isActive ? "paused" : "resumed"} successfully`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update agent status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      await deleteAgent.mutateAsync(id);
      toast({
        title: "Agent Deleted",
        description: "Trading agent deleted successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete trading agent",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-50">Active Agents</h3>
          <span className="text-sm text-slate-400">
            {agents?.filter(a => a.isActive).length || 0} running
          </span>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-6 w-6" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))
          ) : (
            agents?.map((agent) => (
              <div key={agent.id} className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      agent.isActive ? 'bg-emerald-400' : 'bg-yellow-400'
                    }`} />
                    <h4 className="font-medium text-slate-50">{agent.name}</h4>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePause(agent.id, agent.isActive)}
                      className="h-6 w-6 text-slate-400 hover:text-slate-200"
                    >
                      {agent.isActive ? <Pause size={12} /> : <Play size={12} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(agent.id)}
                      className="h-6 w-6 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Spread:</span>
                    <span className="text-slate-50 font-mono ml-1">≥{agent.minSpread}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Max:</span>
                    <span className="text-slate-50 font-mono ml-1">${agent.maxAmount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Executed:</span>
                    <span className="text-slate-50 font-mono ml-1">{agent.totalTrades} trades</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Profit:</span>
                    <span className="text-emerald-400 font-mono ml-1">+${agent.totalProfit}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
