import { Sidebar } from "../components/Dashboard/Sidebar";
import { DocumentList } from "../components/Dashboard/DocumentList";
import { Questionnaire } from "../components/Dashboard/Questionnaire";
import { useQuery } from "@tanstack/react-query";
import type { Document, Questionnaire as QuestionnaireType } from "@db/schema";

export default function DashboardPage() {
  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: questionnaires } = useQuery<QuestionnaireType[]>({
    queryKey: ["/api/questionnaires"],
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Documents</h2>
              <DocumentList documents={documents || []} />
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Questionnaires</h2>
              <Questionnaire questionnaires={questionnaires || []} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
