import type { Document } from "@db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DocumentEditor } from "./DocumentEditor";
import { UploadDropzone } from "./UploadDropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentListProps {
  documents: Document[];
}

export function DocumentList({ documents: initialDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { toast } = useToast();

  const handleDocumentSave = () => {
    toast({
      title: "Success",
      description: "Document saved successfully",
    });
  };

  const handleUploadComplete = (newDocument: Document) => {
    setDocuments((prev) => [newDocument, ...prev]);
  };

  return (
    <>
      <div className="space-y-4">
        <UploadDropzone onUploadComplete={handleUploadComplete} />

        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <DocumentEditor
              document={selectedDocument}
              onSave={handleDocumentSave}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}