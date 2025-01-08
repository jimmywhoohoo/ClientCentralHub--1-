import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, HelpCircle, RefreshCw } from "lucide-react";
import type { Task } from "@db/schema";

interface TaskError {
  type: 'sync' | 'validation' | 'permission' | 'network';
  message: string;
  taskId?: number;
  details?: string;
}

interface TaskErrorDialogProps {
  error: TaskError | null;
  onClose: () => void;
  onRetry?: () => void;
  onFixPermissions?: () => void;
}

export function TaskErrorDialog({ 
  error, 
  onClose, 
  onRetry,
  onFixPermissions 
}: TaskErrorDialogProps) {
  if (!error) return null;

  const getSuggestedFix = (error: TaskError) => {
    switch (error.type) {
      case 'sync':
        return {
          title: "Synchronization Error",
          description: "Changes couldn't be saved due to a connection issue.",
          action: onRetry && (
            <Button onClick={onRetry} className="w-full mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Sync
            </Button>
          )
        };
      case 'validation':
        return {
          title: "Invalid Task Data",
          description: "The task information doesn't meet the required format.",
          action: (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Common Solutions:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Ensure all required fields are filled</li>
                <li>Check the date format is correct</li>
                <li>Verify the task status is valid</li>
              </ul>
            </div>
          )
        };
      case 'permission':
        return {
          title: "Permission Error",
          description: "You don't have the required permissions for this action.",
          action: onFixPermissions && (
            <Button onClick={onFixPermissions} className="w-full mt-4">
              Request Access
            </Button>
          )
        };
      case 'network':
        return {
          title: "Connection Error",
          description: "Unable to communicate with the server.",
          action: onRetry && (
            <Button onClick={onRetry} className="w-full mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )
        };
      default:
        return {
          title: "Unknown Error",
          description: "An unexpected error occurred.",
          action: null
        };
    }
  };

  const fix = getSuggestedFix(error);

  return (
    <Dialog open={!!error} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {fix.title}
          </DialogTitle>
          <DialogDescription>
            {fix.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error.message && (
            <div className="text-sm text-muted-foreground">
              {error.message}
            </div>
          )}

          {error.details && (
            <div className="text-sm bg-muted p-4 rounded-lg font-mono">
              {error.details}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>
              If the problem persists, try refreshing the page or contact support.
            </span>
          </div>

          {fix.action}
        </div>
      </DialogContent>
    </Dialog>
  );
}
