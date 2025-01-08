import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, HelpCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
          icon: (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="w-12 h-12 text-blue-500" />
            </motion.div>
          ),
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
          icon: (
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.1 }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            >
              <AlertCircle className="w-12 h-12 text-yellow-500" />
            </motion.div>
          ),
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
          icon: (
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: [-2, 2, -2] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <AlertCircle className="w-12 h-12 text-red-500" />
            </motion.div>
          ),
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
          icon: (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            >
              <AlertCircle className="w-12 h-12 text-gray-500" />
            </motion.div>
          ),
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
          icon: (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <HelpCircle className="w-12 h-12 text-gray-500" />
            </motion.div>
          ),
          action: null
        };
    }
  };

  const fix = getSuggestedFix(error);

  return (
    <Dialog open={!!error} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={error?.type} //Added ? to handle potential null error.type
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                {fix.icon}
              </motion.div>
            </AnimatePresence>
            <div className="text-center">
              <DialogTitle>{fix.title}</DialogTitle>
              <DialogDescription>
                {fix.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error.message && (
            <div className="text-sm text-muted-foreground">
              {error.message}
            </div>
          )}

          {error.details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-sm bg-muted p-4 rounded-lg font-mono overflow-hidden"
            >
              {error.details}
            </motion.div>
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