import { useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Circle } from "lucide-react";

interface SwapStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

interface SwapProgressBarProps {
  swapId?: string;
  currentStep: number;
  totalSteps: number;
  steps: SwapStep[];
  isVisible: boolean;
  timeRemaining?: number;
  setSwapProgress?: (updater: (prev: any) => any) => void;
}

export function SwapProgressBar({ 
  swapId, 
  currentStep, 
  totalSteps, 
  steps, 
  isVisible, 
  timeRemaining,
  setSwapProgress
}: SwapProgressBarProps) {
  // Countdown timer effect
  useEffect(() => {
    if (!isVisible || !timeRemaining || !setSwapProgress) return;
    
    const timer = setInterval(() => {
      setSwapProgress(prev => {
        const newTime = Math.max(0, prev.timeRemaining - 1);
        return {
          ...prev,
          timeRemaining: newTime
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isVisible, timeRemaining, setSwapProgress]);

  if (!isVisible) return null;

  const progressPercentage = (currentStep / totalSteps) * 100;

  const getStepIcon = (step: SwapStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (step.status === 'in-progress') {
      return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    if (step.status === 'failed') {
      return <Circle className="w-5 h-5 text-red-500" />;
    }
    return <Circle className="w-5 h-5 text-gray-300" />;
  };

  const getStepBadge = (step: SwapStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cross-Chain Swap in Progress</h3>
          <p className="text-sm text-gray-600">
            Step {currentStep} of {totalSteps} • {swapId && `ID: ${swapId.slice(-8)}`}
          </p>
        </div>
        {timeRemaining && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Time Remaining</p>
            <p className="text-lg font-mono text-blue-600">{formatTime(timeRemaining)}</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            <div className="mt-0.5">
              {getStepIcon(step, index)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                {getStepBadge(step)}
              </div>
              <p className="text-xs text-gray-600 mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {currentStep === totalSteps && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-sm font-medium text-green-800">
              Swap completed successfully! Check your transaction history below.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}