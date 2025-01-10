import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DocumentEditor } from "@/components/Dashboard/DocumentEditor";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@db/schema";

function DocumentPage() {
  const [, params] = useRoute("/documents/:id");
  const { toast } = useToast();

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ['/api/documents', params?.id],
    enabled: !!params?.id,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (!params?.id) {
    return <div>Invalid document ID</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <DocumentEditor 
        document={document!} 
        isLoading={isLoading} 
        onSave={() => {
          toast({
            title: "Success",
            description: "Document saved successfully",
          });
        }}
      />
    </div>
  );
}

// Make sure to export the component as default
export default DocumentPage;