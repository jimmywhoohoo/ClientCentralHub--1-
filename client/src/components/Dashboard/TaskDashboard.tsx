import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Task, User } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle2, AlertCircle, Plus, Loader2, CloudOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchAndFilter, type FilterOptions } from "./SearchAndFilter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

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
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SyncStatus = "synced" | "syncing" | "error";

export function TaskDashboard() {
  const { user } = useUser();
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
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

      if (data.type === 'CONNECTED') {
        console.log('WebSocket Connected');
        setSyncStatus("synced");
      } else if (data.type === 'TASK_UPDATE') {
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
        setSyncStatus("synced");
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

      <SearchAndFilter onFilterChange={setFilters} />

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