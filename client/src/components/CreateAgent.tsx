import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Target, Clock, DollarSign, Play, Pause, Trash2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema
const createAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  assetPair: z.string().min(1, "Asset pair is required"),
  sourceChain: z.string().min(1, "Source chain is required"),
  targetChain: z.string().min(1, "Target chain is required"),
  minSpread: z.string().min(1, "Minimum spread is required"),
  maxAmount: z.string().min(1, "Maximum amount is required"),
  goalType: z.string().min(1, "Goal type is required"),
  goalValue: z.string().min(1, "Goal value is required"),
});

type CreateAgentForm = z.infer<typeof createAgentSchema>;

interface TradingAgent {
  id: string;
  name: string;
  assetPair: string;
  sourceChain: string;
  targetChain: string;
  minSpread: string;
  maxAmount: string;
  goalType: string;
  goalValue: string;
  currentProgress: string;
  goalAchieved: boolean;
  isActive: boolean;
  totalTrades: number;
  totalProfit: string;
  ethereumWallet?: string;
  suiWallet?: string;
  lastExecutedAt?: string;
  createdAt: string;
}

interface CreateAgentProps {
  walletConnections: any;
  suiWalletInfo: any;
}

export function CreateAgent({ walletConnections, suiWalletInfo }: CreateAgentProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateAgentForm>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      assetPair: "USDC/USDY",
      sourceChain: "ethereum",
      targetChain: "sui",
      minSpread: "0.01",
      maxAmount: "100",
      goalType: "profit_target",
      goalValue: "10",
    },
  });

  // Listen for form prepopulation events
  useEffect(() => {
    const handlePrepopulate = (event: CustomEvent) => {
      const { assetPair, sourceChain, targetChain, minSpread, maxAmount } = event.detail;
      
      // Prepopulate the form
      form.reset({
        name: `Auto-${assetPair}-${sourceChain}-${targetChain}`,
        assetPair,
        sourceChain,
        targetChain,
        minSpread,
        maxAmount,
        goalType: 'profit_target',
        goalValue: '10',
      });
      
      // Show the form
      setShowCreateForm(true);
      
      toast({
        title: "Form Prepopulated",
        description: `Agent form filled with ${assetPair} arbitrage data`,
      });
    };

    window.addEventListener('prepopulate-agent-form', handlePrepopulate as EventListener);
    
    return () => {
      window.removeEventListener('prepopulate-agent-form', handlePrepopulate as EventListener);
    };
  }, [form, toast]);

  // Fetch active agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['/api/agents'],
  });

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (data: CreateAgentForm) => {
      const agentData = {
        ...data,
        frequency: 5, // 5 minutes
        ethereumWallet: walletConnections?.account || walletConnections?.ethereum || null,
        suiWallet: suiWalletInfo?.address || null,
      };
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setShowCreateForm(false);
      form.reset();
      toast({
        title: "Agent Created",
        description: "Your trading agent has been created and will start executing in 5 minutes.",
      });
    },
  });

  // Toggle agent mutation
  const toggleAgentMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/agents/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
    },
  });

  const onSubmit = (data: CreateAgentForm) => {
    createAgentMutation.mutate(data);
  };

  const getProgressPercentage = (agent: TradingAgent) => {
    const current = parseFloat(agent.currentProgress || "0");
    const goal = parseFloat(agent.goalValue);
    return Math.min((current / goal) * 100, 100);
  };

  const formatGoalDisplay = (agent: TradingAgent) => {
    switch (agent.goalType) {
      case 'profit_target':
        return `$${agent.currentProgress || '0'} / $${agent.goalValue}`;
      case 'trade_count':
        return `${agent.totalTrades} / ${agent.goalValue} trades`;
      case 'time_limit':
        return `Running until target time`;
      default:
        return `${agent.currentProgress || '0'} / ${agent.goalValue}`;
    }
  };

  const getChainEmoji = (chain: string) => {
    switch (chain.toLowerCase()) {
      case 'ethereum':
        return '⚡';
      case 'sui':
        return '🌊';
      default:
        return '🔗';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl text-gray-900">Create Agent</CardTitle>
                <CardDescription>
                  Set up automated trading agents with 1Inch Limit Orders that execute trades every 5 minutes until your goal is met
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Bot className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Create Agent Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Configure New Agent</CardTitle>
            <CardDescription>
              Set up your automated trading parameters and goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., USDC Arbitrage Bot"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="assetPair">Asset Pair</Label>
                  <Select
                    value={form.watch("assetPair")}
                    onValueChange={(value) => form.setValue("assetPair", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset pair" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC/USDY">USDC/USDY</SelectItem>
                      <SelectItem value="USDC/DAI">USDC/DAI</SelectItem>
                      <SelectItem value="USDT/USDY">USDT/USDY</SelectItem>
                      <SelectItem value="DAI/USDY">DAI/USDY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sourceChain">Source Chain</Label>
                  <Select
                    value={form.watch("sourceChain")}
                    onValueChange={(value) => form.setValue("sourceChain", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source chain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">⚡ Ethereum Sepolia</SelectItem>
                      <SelectItem value="sui">🌊 Sui Testnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="targetChain">Target Chain</Label>
                  <Select
                    value={form.watch("targetChain")}
                    onValueChange={(value) => form.setValue("targetChain", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target chain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">⚡ Ethereum Sepolia</SelectItem>
                      <SelectItem value="sui">🌊 Sui Testnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="minSpread">Minimum Spread (%)</Label>
                  <Input
                    id="minSpread"
                    type="number"
                    step="0.01"
                    placeholder="0.01"
                    {...form.register("minSpread")}
                  />
                </div>

                <div>
                  <Label htmlFor="maxAmount">Max Amount Per Trade</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    placeholder="100"
                    {...form.register("maxAmount")}
                  />
                </div>

                <div>
                  <Label htmlFor="goalType">Goal Type</Label>
                  <Select
                    value={form.watch("goalType")}
                    onValueChange={(value) => form.setValue("goalType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profit_target">💰 Profit Target</SelectItem>
                      <SelectItem value="trade_count">📊 Trade Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="goalValue">
                    Goal Value {form.watch("goalType") === "profit_target" ? "($)" : "(trades)"}
                  </Label>
                  <Input
                    id="goalValue"
                    type="number"
                    placeholder={form.watch("goalType") === "profit_target" ? "10" : "50"}
                    {...form.register("goalValue")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAgentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Agents - Only show when wallets are connected */}
      {(walletConnections?.ethereum || walletConnections?.account || suiWalletInfo?.address) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Active Agents</CardTitle>
            <CardDescription>
              Your automated trading agents and their progress towards goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading agents...</div>
            ) : (!agents || agents.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                No agents created yet. Create your first automated trading agent above.
              </div>
            ) : (
              <div className="space-y-4">
                {(Array.isArray(agents) ? agents : []).map((agent: TradingAgent) => (
                <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">{agent.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{getChainEmoji(agent.sourceChain)} {agent.sourceChain}</span>
                          <span>→</span>
                          <span>{getChainEmoji(agent.targetChain)} {agent.targetChain}</span>
                          <span>•</span>
                          <span>{agent.assetPair}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={agent.isActive ? "default" : "secondary"}>
                        {agent.isActive ? "Active" : "Paused"}
                      </Badge>
                      {agent.goalAchieved && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Goal Achieved
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-600">{formatGoalDisplay(agent)}</span>
                    </div>
                    <Progress value={getProgressPercentage(agent)} className="h-2" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Trades</div>
                      <div className="font-medium text-gray-900">{agent.totalTrades}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Profit</div>
                      <div className="font-medium text-green-600">${agent.totalProfit}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Min Spread</div>
                      <div className="font-medium text-gray-900">{agent.minSpread}%</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      {agent.lastExecutedAt ? (
                        <>Last executed: {new Date(agent.lastExecutedAt).toLocaleString()}</>
                      ) : (
                        <>Created: {new Date(agent.createdAt).toLocaleString()}</>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAgentMutation.mutate({ id: agent.id, isActive: agent.isActive })}
                        disabled={toggleAgentMutation.isPending}
                      >
                        {agent.isActive ? (
                          <>
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAgentMutation.mutate(agent.id)}
                        disabled={deleteAgentMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message when no wallets connected */}
      {!walletConnections?.ethereum && !walletConnections?.account && !suiWalletInfo?.address && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Connect Wallets to View Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                Connect your Ethereum and Sui wallets to view and manage your active trading agents.
              </div>
              <div className="text-sm text-gray-400">
                Agents require wallet connections to execute automated trades across networks.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}