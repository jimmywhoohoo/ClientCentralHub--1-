import { useQuery } from "@tanstack/react-query";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfToday } from "date-fns";
import type { Task } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type HeatmapValue = {
  date: string;
  count: number;
  tasks: Task[];
};

export function DeadlineHeatmap() {
  const today = startOfToday();
  const startDate = subDays(today, 365); // Show last 365 days

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Transform tasks into heatmap data
  const tasksByDate: Record<string, Task[]> = {};
  tasks?.forEach((task) => {
    if (task.deadline) {
      const date = format(new Date(task.deadline), "yyyy-MM-dd");
      if (!tasksByDate[date]) {
        tasksByDate[date] = [];
      }
      tasksByDate[date].push(task);
    }
  });

  const values: HeatmapValue[] = Object.entries(tasksByDate).map(([date, tasks]) => ({
    date,
    count: tasks.length,
    tasks,
  }));

  const getTooltipDataAttrs = (value: HeatmapValue | null) => {
    if (!value || !value.count) {
      return { 'data-tooltip': 'No tasks' };
    }
    const tasks = value.tasks.map(t => t.title).join(", ");
    return {
      'data-tooltip': `${value.date}: ${value.count} tasks (${tasks})`,
    };
  };

  const classForValue = (value: HeatmapValue | null) => {
    if (!value || !value.count) {
      return 'color-empty';
    }
    if (value.count > 3) return 'color-scale-4';
    if (value.count > 2) return 'color-scale-3';
    if (value.count > 1) return 'color-scale-2';
    return 'color-scale-1';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <style>{`
          .react-calendar-heatmap text {
            font-size: 10px;
            fill: var(--muted-foreground);
          }
          .react-calendar-heatmap .color-scale-1 { fill: var(--primary) }
          .react-calendar-heatmap .color-scale-2 { fill: var(--primary) }
          .react-calendar-heatmap .color-scale-3 { fill: var(--primary) }
          .react-calendar-heatmap .color-scale-4 { fill: var(--primary) }
          .react-calendar-heatmap .color-empty { fill: var(--muted) }
        `}</style>
        <div className="w-full overflow-x-auto">
          <CalendarHeatmap
            startDate={startDate}
            endDate={today}
            values={values}
            classForValue={classForValue}
            tooltipDataAttrs={getTooltipDataAttrs}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Task Density:</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-muted rounded" />
              <span className="text-xs">None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-primary/30 rounded" />
              <span className="text-xs">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-primary/60 rounded" />
              <span className="text-xs">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-primary rounded" />
              <span className="text-xs">High</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
