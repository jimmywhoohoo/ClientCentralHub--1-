import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { Document } from "@db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DocumentEditorProps {
  document: Document;
  onSave?: () => void;
  isLoading?: boolean;
}

export function DocumentEditor({ document, onSave, isLoading }: DocumentEditorProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: document.content,
  });

  const saveDocumentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/documents', document.id] 
      });
      onSave?.();
    },
  });

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      await saveDocumentMutation.mutateAsync(editor.getHTML());
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="min-h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 relative">
          <div className="w-full h-[500px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-[600px] flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{document.name}</CardTitle>
          <div className="flex items-center gap-2">
            {/* Formatting toolbar */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              data-active={editor?.isActive('bold')}
              className="data-[active=true]:bg-accent"
            >
              Bold
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              data-active={editor?.isActive('italic')}
              className="data-[active=true]:bg-accent"
            >
              Italic
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              data-active={editor?.isActive('heading', { level: 2 })}
              className="data-[active=true]:bg-accent"
            >
              Heading
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 relative p-0">
        <EditorContent 
          editor={editor} 
          className="w-full h-full min-h-[500px] p-4 bg-background focus:outline-none prose prose-sm max-w-none"
        />
      </CardContent>
    </Card>
  );
}