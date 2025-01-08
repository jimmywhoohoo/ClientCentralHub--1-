import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Task } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle2, AlertCircle, Plus, Loader2, CloudOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { TaskErrorDialog } from "./TaskErrorDialog";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskActivityFeed } from "./TaskActivity";

interface TaskStats {
  pending: number;
  completed: number;
  overdue: number;
  upcomingDeadlines: Task[];
  recentlyCompleted: Task[];
}

interface NewTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  assignedTo: number;
  deadline: string;
}

type PaginatedResponse = {
  users: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SyncStatus = "synced" | "syncing" | "error";

type TaskError = {
  type: 'sync' | 'validation' | 'permission' | 'network';
  message: string;
  taskId?: number;
  details?: string;
};

interface TaskUpdateMessage {
  type: 'task_update';
  task: Task;
  activity: {
    id: number;
    action: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
    };
  };
}

export function TaskDashboard() {
  const { user } = useUser();
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [filters, setFilters] = useState<any>({
    status: "all",
    priority: "all",
    dateRange: "all",
    search: "",
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [newTask, setNewTask] = useState<NewTask>({
    title: "",
    description: "",
    priority: "medium",
    assignedTo: 0,
    deadline: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [taskError, setTaskError] = useState<TaskError | null>(null);
  const [activities, setActivities] = useState<TaskUpdateMessage['activity'][]>([]);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      websocket.send(JSON.stringify({
        userId: user.id,
        username: user.username
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        console.log('WebSocket Connected');
        setSyncStatus("synced");
      } else if (data.type === 'task_update' || data.type === 'task_update_success') {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
        setSyncStatus("synced");

        if (data.activity) {
          setActivities(prev => [data.activity, ...prev].slice(0, 50));
        }
      } else if (data.type === 'error') {
        setSyncStatus("error");
        setTaskError({
          type: 'validation',
          message: data.message,
          details: `Error Code: ${data.code}. ${getErrorDetails(data.code)}`,
        });
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket Disconnected');
      setSyncStatus("error");
    };

    websocket.onerror = () => {
      setSyncStatus("error");
      toast({
        title: "Connection Error",
        description: "Unable to connect to real-time updates",
        variant: "destructive",
      });
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [user]);

  const { data: taskStats, isLoading } = useQuery<TaskStats>({
    queryKey: ['/api/tasks/stats', filters],
  });

  const { data: usersData } = useQuery<PaginatedResponse>({
    queryKey: ['/api/admin/users'],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      setSyncStatus("syncing");

      if (ws?.readyState === WebSocket.OPEN) {
        const now = new Date().toISOString();
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        const message = {
          type: 'task_update' as const,
          taskId: task.id,
          changes: {
            status: newStatus,
            completedAt: newStatus === 'completed' ? now : null,
            updatedAt: now
          },
          userId: user?.id
        };

        try {
          ws.send(JSON.stringify(message));
          return task;
        } catch (err) {
          throw new Error('Failed to send WebSocket message');
        }
      } else {
        setTaskError({
          type: 'network',
          message: 'Unable to connect to real-time updates.',
          taskId: task.id,
          details: 'The WebSocket connection is not available. Your changes will not be synchronized in real-time.'
        });
        throw new Error('WebSocket connection not available');
      }
    },
    onError: (error: Error) => {
      setSyncStatus("error");
      if (!taskError) {
        setTaskError({
          type: 'sync',
          message: error.message,
          details: 'The task status could not be updated. Please try again.'
        });
      }
    },
    onSuccess: () => {
      setSyncStatus("synced");
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: NewTask) => {
      setSyncStatus("syncing");
      const formattedTask = {
        ...task,
        deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedTask),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          setTaskError({
            type: 'permission',
            message: 'You do not have permission to create tasks.',
            details: errorText
          });
        } else if (response.status === 400) {
          setTaskError({
            type: 'validation',
            message: 'The task data is invalid.',
            details: errorText
          });
        } else {
          setTaskError({
            type: 'network',
            message: 'Failed to create task.',
            details: errorText
          });
        }
        throw new Error(errorText || 'Failed to create task');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
      setSyncStatus("synced");
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setShowNewTaskDialog(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: 0,
        deadline: "",
      });
    },
    onError: (error: Error) => {
      setSyncStatus("error");
      if (!taskError) {
        setTaskError({
          type: 'network',
          message: error.message,
          details: 'There was an error creating the task. Please try again.'
        });
      }
    },
  });

  const handleCompleteTask = (task: Task) => {
    if (updateTaskMutation.isPending) return;
    updateTaskMutation.mutate(task);
  };

  const handleRetry = () => {
    if (!taskError) return;

    if (taskError.type === 'sync' && taskError.taskId) {
      const task = taskStats?.upcomingDeadlines.find(t => t.id === taskError.taskId) ||
        taskStats?.recentlyCompleted.find(t => t.id === taskError.taskId);
      if (task) {
        updateTaskMutation.mutate(task);
      }
    }
    setTaskError(null);
  };

  const getErrorDetails = (code: string) => {
    switch (code) {
      case 'INVALID_STATUS_TRANSITION':
        return 'Task status changes must follow a valid workflow. For example, a completed task can only be marked as pending.';
      case 'TASK_NOT_FOUND':
        return 'The task you are trying to update no longer exists. It may have been deleted.';
      case 'DATABASE_ERROR':
        return 'There was an error saving your changes. Please try again later.';
      case 'MESSAGE_PARSE_ERROR':
        return 'There was an error processing your request. Please refresh the page and try again.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  };

  const TaskCard = ({ task, isPending = false }: { task: Task; isPending?: boolean }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      key={task.id}
      className="mb-4 p-4 border rounded-lg space-y-2"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{task.title}</h3>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${task.id}-${task.status}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Badge variant={getDueDateVariant(task.deadline ? task.deadline.toString() : null)}>
              {task.deadline ? format(new Date(task.deadline), 'PP') : 'No deadline'}
            </Badge>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {task.description}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Priority: {task.priority}</span>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${task.id}-${task.status}-button`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleteTask(task)}
              disabled={updateTaskMutation.isPending}
              className="relative"
            >
              {updateTaskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : task.status === 'completed' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    Mark as Pending
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    Complete
                  </motion.div>
                </>
              )}

              <AnimatePresence>
                {task.status === 'completed' && !updateTaskMutation.isPending && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const clientUsers = usersData?.users.filter(user => user.role === "client") || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Task Overview</h2>
          <AnimatePresence mode="wait">
            <motion.div
              key={syncStatus}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {syncStatus === "synced" && (
                <Check className="h-5 w-5 text-green-500" />
              )}
              {syncStatus === "syncing" && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              )}
              {syncStatus === "error" && (
                <CloudOff className="h-5 w-5 text-red-500" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <Button onClick={() => setShowNewTaskDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      <div>
        <SearchAndFilter onFilterChange={setFilters} />
      </div>

      <motion.div
        layout
        className="grid gap-4 grid-cols-1 md:grid-cols-3"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-2xl font-bold">{taskStats?.pending}</div>
              <p className="text-xs text-muted-foreground">
                Active tasks requiring attention
              </p>
            </motion.div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-2xl font-bold">{taskStats?.completed}</div>
              <p className="text-xs text-muted-foreground">
                Successfully finished tasks
              </p>
            </motion.div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-2xl font-bold">{taskStats?.overdue}</div>
              <p className="text-xs text-muted-foreground">
                Tasks past their deadline
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <AnimatePresence>
                    {taskStats?.upcomingDeadlines.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recently Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <AnimatePresence>
                    {taskStats?.recentlyCompleted.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-1">
          <TaskActivityFeed activities={activities} />
        </div>
      </div>

      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Assign a task to a client with a deadline and priority level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTask.title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newTask.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
              />
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={String(newTask.assignedTo)}
                onValueChange={(value: string) => setNewTask({ ...newTask, assignedTo: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientUsers.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.fullName} ({user.companyName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value: "low" | "medium" | "high") =>
                  setNewTask({ ...newTask, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, deadline: e.target.value })}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => createTaskMutation.mutate(newTask)}
              disabled={!newTask.title || !newTask.assignedTo || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <TaskErrorDialog
        error={taskError}
        onClose={() => setTaskError(null)}
        onRetry={handleRetry}
        onFixPermissions={() => {
          toast({
            title: "Permission Request",
            description: "Your request has been sent to the administrator.",
          });
          setTaskError(null);
        }}
      />
    </div>
  );
}

function getDueDateVariant(deadline: string | null): "default" | "secondary" | "destructive" {
  if (!deadline) return "secondary";

  const dueDate = new Date(deadline);
  const now = new Date();

  if (dueDate < now) {
    return "destructive";
  }

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  return dueDate <= threeDaysFromNow ? "default" : "secondary";
}

function SearchAndFilter(props: { onFilterChange: (filters: any) => void }) {
  return <div>SearchAndFilter</div>
}