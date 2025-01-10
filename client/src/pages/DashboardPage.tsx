import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DocumentList } from "../components/Documents/DocumentList";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, Users, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskStats {
  pending: number;
  completed: number;
  overdue: number;
}

export default function DashboardPage() {
  const isMobile = useIsMobile();

  const { data: taskStats, isLoading: isLoadingTaskStats } = useQuery<TaskStats>({
    queryKey: ["/api/tasks/stats"],
  });

  const stats = [
    {
      title: "Pending Tasks",
      value: taskStats?.pending ?? 0,
      change: `${taskStats?.overdue ?? 0} overdue`,
      icon: <Clock className="h-4 w-4" />
    },
    {
      title: "Completed Tasks",
      value: taskStats?.completed ?? 0,
      change: "Updated in real-time",
      icon: <FileText className="h-4 w-4" />
    },
    {
      title: "Task Progress",
      value: taskStats ? Math.round((taskStats.completed / (taskStats.completed + taskStats.pending)) * 100) + '%' : '0%',
      change: "Completion rate",
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      title: "Active Tasks",
      value: (taskStats?.pending ?? 0) + (taskStats?.completed ?? 0),
      change: "Total assigned",
      icon: <Users className="h-4 w-4" />
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="text-muted-foreground">
                    {stat.icon}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Document Management Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Document Management</h2>
          <DocumentList />
        </section>
      </div>
    </DashboardLayout>
  );
}