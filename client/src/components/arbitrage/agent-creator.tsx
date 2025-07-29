import { useCreateTradingAgent } from "@/hooks/use-agents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTradingAgentSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertTradingAgentSchema.extend({
  minSpread: z.string().min(1, "Min spread is required"),
  maxAmount: z.string().min(1, "Max amount is required"),
  frequency: z.string().min(1, "Frequency is required"),
});

type FormData = z.infer<typeof formSchema>;

export function AgentCreator() {
  const createAgent = useCreateTradingAgent();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      minSpread: "",
      maxAmount: "",
      assetPair: "",
      sourceChain: "",
      targetChain: "",
      frequency: "",
      isActive: true,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createAgent.mutateAsync({
        ...data,
        frequency: parseInt(data.frequency),
      });

      toast({
        title: "Agent Created",
        description: "Trading agent created successfully",
        variant: "default",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create trading agent",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-50 mb-4">Create Trading Agent</h3>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-400">Agent Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="e.g., USDC Arbitrage Bot"
              className="bg-slate-700 border-slate-600 text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {form.formState.errors.name && (
              <p className="text-red-400 text-xs mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minSpread" className="text-slate-400">Min Spread (%)</Label>
              <Input
                id="minSpread"
                type="number"
                step="0.1"
                {...form.register("minSpread")}
                placeholder="0.5"
                className="bg-slate-700 border-slate-600 text-slate-50 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
              {form.formState.errors.minSpread && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.minSpread.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="maxAmount" className="text-slate-400">Max Amount ($)</Label>
              <Input
                id="maxAmount"
                type="number"
                {...form.register("maxAmount")}
                placeholder="1000"
                className="bg-slate-700 border-slate-600 text-slate-50 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
              {form.formState.errors.maxAmount && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.maxAmount.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <Label className="text-slate-400">Asset Pair</Label>
            <Select onValueChange={(value) => {
              const [pair, route] = value.split('|');
              const [source, target] = route.split(' → ');
              form.setValue("assetPair", pair);
              form.setValue("sourceChain", source);
              form.setValue("targetChain", target);
            }}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-50">
                <SelectValue placeholder="Select asset pair and route" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="USDC/USDC|Celo → Sui">USDC/USDC (Celo → Sui)</SelectItem>
                <SelectItem value="USDT/USDT|Sui → Celo">USDT/USDT (Sui → Celo)</SelectItem>
                <SelectItem value="DAI/USDC|Celo → Sui">DAI/USDC (Celo → Sui)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-slate-400">Execution Frequency</Label>
            <Select onValueChange={(value) => form.setValue("frequency", value)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-50">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="1">Every 1 minute</SelectItem>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="60">Every 1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            type="submit"
            disabled={createAgent.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {createAgent.isPending ? "Creating Agent..." : "Create Agent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
