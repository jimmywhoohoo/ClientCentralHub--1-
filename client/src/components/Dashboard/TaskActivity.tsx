import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";

interface TaskActivity {
  id: number;
  action: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
  };
}

interface TaskActivityFeedProps {
  taskId?: number;
  activities: TaskActivity[];
}

export function TaskActivityFeed({ taskId, activities }: TaskActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Activity Feed</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <AnimatePresence mode="popLayout">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="mb-4 relative pl-4 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-primary before:rounded-full"
              >
                <p className="text-sm">{activity.action}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{activity.user.username}</span>
                  <span>•</span>
                  <span>{format(new Date(activity.createdAt), 'PP p')}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
