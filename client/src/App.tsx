import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import ArbitrageTradingPage from "@/pages/arbitrage-trading";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/trading" component={ArbitrageTradingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force browser cache refresh
  console.log('🚀 StableArbYieldBridge v2.0 - Dashboard Mode Active:', new Date().toISOString());
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;