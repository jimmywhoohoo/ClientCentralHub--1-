import type { Questionnaire as QuestionnaireType } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

interface QuestionnaireProps {
  questionnaires: QuestionnaireType[];
}

export function Questionnaire({ questionnaires }: QuestionnaireProps) {
  return (
    <div className="space-y-4">
      {questionnaires.map((questionnaire) => (
        <Card key={questionnaire.id}>
          <CardHeader>
            <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {JSON.parse(questionnaire.questions as string).length} Questions
                </span>
              </div>
              <Button>Start Questionnaire</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
