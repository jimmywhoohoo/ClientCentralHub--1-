import { DashboardLayout } from "@/components/layout/DashboardLayout";
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

        {/* Add loading states and more sections later */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Documents Section - Placeholder */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Documents</h2>
              {isLoadingDocuments ? (
                <p>Loading documents...</p>
              ) : (
                <div className="space-y-4">
                  {documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks Section - Placeholder */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Tasks</h2>
              {isLoadingTaskStats ? (
                <p>Loading tasks...</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Task management section coming soon...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <section>
            <TeamLeaderboard />
          </section>
          <section>
            <TaskList />
          </section>
          <section>
            <DocumentAnalytics />
          </section>
          <section>
            <DocumentRecommendations />
          </section>
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
    </DashboardLayout>
  );
}