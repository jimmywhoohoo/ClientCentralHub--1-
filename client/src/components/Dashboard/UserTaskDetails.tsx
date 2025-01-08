import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, Clock, AlertCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@db/schema";

interface TaskStats {
  pending: number;
  completed: number;
  overdue: number;
}

interface Task {
  id: number;
  title: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  deadline: string | null;
  completedAt: string | null;
}

interface UserTaskDetailsProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserTaskDetails({ user, open, onOpenChange }: UserTaskDetailsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: taskStats, isLoading: loadingStats } = useQuery<TaskStats>({
    queryKey: [`/api/admin/users/${user?.id}/tasks/stats`],
    enabled: !!user && open,
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: [`/api/admin/users/${user?.id}/tasks`],
    enabled: !!user && open,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      try {
        // Delete all activities for this task
        await fetch(`/api/admin/tasks/${taskId}/activities`, {
          method: "DELETE",
          credentials: "include",
        });

        // Now delete the task
        const response = await fetch(`/api/admin/tasks/${taskId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to delete task: ${errorText}`);
        }

        return response.json();
      } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${user?.id}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${user?.id}/tasks/stats`] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Delete task error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Task Details: {user.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Completed Tasks</p>
                      <p className="text-2xl font-bold">{taskStats?.completed ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Pending Tasks</p>
                      <p className="text-2xl font-bold">{taskStats?.pending ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Overdue Tasks</p>
                      <p className="text-2xl font-bold">{taskStats?.overdue ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {loadingTasks ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !tasks?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "in_progress"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.priority === "high"
                              ? "destructive"
                              : task.priority === "medium"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString()
                          : "No deadline"}
                      </TableCell>
                      <TableCell>
                        {task.completedAt
                          ? new Date(task.completedAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={deleteTaskMutation.isPending}
                        >
                          {deleteTaskMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}