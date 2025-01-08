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
  users: any[]; //Type is missing in original, assuming any[] for now.
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

export function TaskDashboard() {
  const { user } = useUser();
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [filters, setFilters] = useState<any>({ //Type is missing in original, assuming any for now.
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

  // Setup WebSocket connection
  useEffect(() => {
    if (!user) return; // Only connect if user is authenticated

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      // Send authentication message
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
      } else if (data.type === 'task_update') {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
        setSyncStatus("synced");
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
          {syncStatus === "synced" && (
            <Check className="h-5 w-5 text-green-500" />
          )}
          {syncStatus === "syncing" && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          )}
          {syncStatus === "error" && (
            <CloudOff className="h-5 w-5 text-red-500" />
          )}
        </div>
        <Button onClick={() => setShowNewTaskDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      <div>
        {/*SearchAndFilter component is missing, assuming this is correct*/}
        <SearchAndFilter onFilterChange={setFilters} />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.pending}</div>
            <p className="text-xs text-muted-foreground">
              Active tasks requiring attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.completed}</div>
            <p className="text-xs text-muted-foreground">
              Successfully finished tasks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Tasks past their deadline
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {taskStats?.upcomingDeadlines.map((task) => (
                <div
                  key={task.id}
                  className="mb-4 p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{task.title}</h3>
                    <Badge variant={getDueDateVariant(task.deadline ? task.deadline.toString() : null)}>
                      {task.deadline ? format(new Date(task.deadline), 'PP') : 'No deadline'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Priority: {task.priority}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCompleteTask(task)}
                      disabled={updateTaskMutation.isPending}
                    >
                      {updateTaskMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        task.status === 'completed' ? 'Mark as Pending' : 'Complete'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {taskStats?.recentlyCompleted.map((task) => (
                <div
                  key={task.id}
                  className="mb-4 p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{task.title}</h3>
                    <Badge variant="secondary">
                      Completed {task.completedAt ? format(new Date(task.completedAt), 'PP') : ''}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Priority: {task.priority}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCompleteTask(task)}
                      disabled={updateTaskMutation.isPending}
                    >
                      {updateTaskMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Mark as Pending'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
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
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
              />
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={String(newTask.assignedTo)}
                onValueChange={(value) => setNewTask({ ...newTask, assignedTo: Number(value) })}
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
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
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
          // Here you could implement a permission request flow
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