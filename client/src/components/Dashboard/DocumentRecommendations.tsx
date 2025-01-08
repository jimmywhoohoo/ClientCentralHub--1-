import type { Document } from "@db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DocumentRecommendationsProps {
  onSelect?: (document: Document) => void;
}

export function DocumentRecommendations({ onSelect }: DocumentRecommendationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents/recommendations"],
  });

  const interactionMutation = useMutation({
    mutationFn: async ({ documentId, type }: { documentId: number; type: string }) => {
      const response = await fetch(`/api/documents/${documentId}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to record interaction");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/recommendations"] });
    },
  });

  const handleInteraction = async (document: Document, type: string) => {
    try {
      await interactionMutation.mutateAsync({ documentId: document.id, type });
      if (type === "view" && onSelect) {
        onSelect(document);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to interact with document",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground animate-pulse" />
            <h3 className="font-semibold">Loading recommendations...</h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Recommended for you</h3>
      </div>
      {recommendations.map((doc) => (
        <Card key={doc.id} className="hover:bg-accent/5 transition-colors">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{doc.name}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.category} • {doc.industry}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleInteraction(doc, "view")}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleInteraction(doc, "download")}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
