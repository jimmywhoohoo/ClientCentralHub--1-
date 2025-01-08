import { Sidebar } from "../components/Dashboard/Sidebar";
import { DocumentList } from "../components/Dashboard/DocumentList";
import { Questionnaire } from "../components/Dashboard/Questionnaire";
import { DocumentAnalytics } from "../components/Dashboard/DocumentAnalytics";
import { TeamLeaderboard } from "../components/Dashboard/TeamLeaderboard";
import { useQuery } from "@tanstack/react-query";
import type { Document } from "@db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, Users, TrendingUp } from "lucide-react";
import { DocumentRecommendations } from "../components/Dashboard/DocumentRecommendations";
import { TaskList } from "../components/Dashboard/TaskList";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuestionnaireType {
  id: number;
  title: string;
  status: string;
  dueDate: string;
}

interface TaskStats {
  pending: number;
  completed: number;
  overdue: number;
}

export default function DashboardPage() {
  const isMobile = useIsMobile();

  const { data: documents, isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: questionnaires, isLoading: isLoadingQuestionnaires } = useQuery<QuestionnaireType[]>({
    queryKey: ["/api/questionnaires"],
  });

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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0 ml-0 md:ml-64">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="touch-manipulation">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
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

          {/* Team Leaderboard Section */}
          <section className="touch-manipulation">
            <TeamLeaderboard />
          </section>

          {/* Tasks Section */}
          <section className="touch-manipulation">
            <TaskList />
          </section>

          {/* Analytics Dashboard */}
          <section className="touch-manipulation">
            <DocumentAnalytics />
          </section>

          {/* Add Recommendations Section */}
          <section className="touch-manipulation">
            <DocumentRecommendations />
          </section>

          {/* Documents and Questionnaires */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <section>
              <h2 className="text-lg font-semibold mb-4">Documents</h2>
              <DocumentList 
                documents={documents || []} 
                isLoading={isLoadingDocuments}
              />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Questionnaires</h2>
              <Questionnaire 
                questionnaires={questionnaires || []} 
                isLoading={isLoadingQuestionnaires}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}