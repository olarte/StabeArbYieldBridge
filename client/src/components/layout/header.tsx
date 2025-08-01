import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, ArrowRightLeft, ChevronDown } from "lucide-react";
// @ts-ignore
import WalletConnect from "@/components/WalletConnect.jsx";
import SuiWalletConnect from "@/components/SuiWalletConnect";

interface HeaderProps {
  walletConnections?: any;
  suiWalletInfo?: any;
  onWalletUpdate?: (type: string, info: any) => void;
}

export function Header({ walletConnections, suiWalletInfo, onWalletUpdate }: HeaderProps) {
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white/80 border-b border-gray-200 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="text-white text-sm" size={16} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">🤺 Sabre</h1>
              <p className="text-xs text-gray-600">Stable Arbitrage Bridge</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Ethereum Wallet Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={walletConnections?.account ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <span className="text-2xl">🩶</span>
                {walletConnections?.account ? formatAddress(walletConnections.account) : "Connect Ethereum"}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🩶</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Ethereum Wallet</h3>
                    <p className="text-sm text-gray-600">Sepolia Testnet</p>
                  </div>
                </div>
                <WalletConnect 
                  onWalletUpdate={(info: any) => onWalletUpdate?.('ethereum', info)}
                />
                {walletConnections?.account && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-mono text-xs">{formatAddress(walletConnections.account)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Chain ID:</span>
                      <span>{walletConnections.chainId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="default" className="text-xs">Connected</Badge>
                    </div>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sui Wallet Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={suiWalletInfo?.account?.address ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <span className="text-2xl">🔵</span>
                {suiWalletInfo?.account?.address ? formatAddress(suiWalletInfo.account.address) : "Connect Sui"}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔵</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Sui Wallet</h3>
                    <p className="text-sm text-gray-600">Testnet</p>
                  </div>
                </div>
                <SuiWalletConnect 
                  onWalletUpdate={(info: any) => onWalletUpdate?.('sui', info)}
                />
                {suiWalletInfo?.account?.address && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-mono text-xs">{formatAddress(suiWalletInfo.account.address)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Balance:</span>
                      <span>{suiWalletInfo.balance || '0'} SUI</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="default" className="text-xs">Connected</Badge>
                    </div>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
            <Settings size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}
