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
  // Force browser cache refresh - NEW CLEAN VERSION
  console.log('🚀 StableArbYieldBridge v3.0 - CLEAN DASHBOARD VERSION:', new Date().toISOString());
  console.log('🔥 OLD DARK MODE REMOVED - ONLY DASHBOARD LOADS NOW');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div style={{ background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', padding: '2px', position: 'fixed', top: 0, right: 0, zIndex: 9999, fontSize: '10px', color: 'white' }}>
          CLEAN v3.0 - {Date.now()}
        </div>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;