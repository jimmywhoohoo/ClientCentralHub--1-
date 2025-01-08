import { Sidebar } from "../components/Dashboard/Sidebar";
import { DocumentList } from "../components/Dashboard/DocumentList";
import { Questionnaire } from "../components/Dashboard/Questionnaire";
import { DocumentAnalytics } from "../components/Dashboard/DocumentAnalytics";
import { useQuery } from "@tanstack/react-query";
import type { Document, Questionnaire as QuestionnaireType } from "@db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, Users, TrendingUp } from "lucide-react";
import { DocumentRecommendations } from "../components/Dashboard/DocumentRecommendations";

export default function DashboardPage() {
  const { data: documents, isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: questionnaires, isLoading: isLoadingQuestionnaires } = useQuery<QuestionnaireType[]>({
    queryKey: ["/api/questionnaires"],
  });

  const stats = [
    {
      title: "Pending Tasks",
      value: "12",
      change: "+2 from yesterday",
      icon: <Clock className="h-4 w-4" />
    },
    {
      title: "Upcoming Deadlines",
      value: "5",
      change: "Next: Tax Filing (2d)",
      icon: <FileText className="h-4 w-4" />
    },
    {
      title: "Completed Tasks",
      value: "28",
      change: "+8 this week",
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      title: "Active Clients",
      value: "45",
      change: "+3 this month",
      icon: <Users className="h-4 w-4" />
    }
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Analytics Dashboard */}
          <section>
            <DocumentAnalytics />
          </section>

          {/* Add Recommendations Section */}
          <section>
            <DocumentRecommendations />
          </section>

          {/* Documents and Questionnaires */}
          <div className="grid md:grid-cols-2 gap-8">
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