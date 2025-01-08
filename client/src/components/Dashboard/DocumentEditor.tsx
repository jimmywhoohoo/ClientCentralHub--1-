import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Users, History, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import type { Document, DocumentVersion, DocumentComment } from "@db/schema";
import { ChatSidebar } from "./ChatSidebar";
import { CommentSidebar } from "./CommentSidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface DocumentEditorProps {
  document: Document;
  onSave?: () => void;
  isLoading?: boolean;
}

interface CursorPosition {
  userId: number;
  username: string;
  position: { line: number; ch: number };
}

export function DocumentEditor({ document, onSave, isLoading }: DocumentEditorProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [defaultLayout, setDefaultLayout] = useState([70, 30]);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    range: { from: number; to: number };
  } | null>(null);

  // Fetch comments for the document
  const { data: comments = [] } = useQuery<DocumentComment[]>({
    queryKey: ['/api/documents', document.id, 'comments'],
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: {
      content: string;
      selectionRange: { start: number; end: number; text: string };
      mentions?: number[];
    }) => {
      const response = await fetch(`/api/documents/${document.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create comment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/documents', document.id, 'comments'] 
      });
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: ({ query }) => {
            return collaborators
              .filter(name => name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5);
          },
          render: () => {
            // Implement mention suggestion rendering
            return {
              onStart: () => { /* ... */ },
              onUpdate: () => { /* ... */ },
              onKeyDown: () => { /* ... */ },
              onExit: () => { /* ... */ },
            };
          },
        },
      }),
    ],
    content: document.content,
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);
      if (text) {
        setSelectedText({ text, range: { from, to } });
      } else {
        setSelectedText(null);
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'update',
          documentId: document.id,
          content,
          userId: user?.id,
        }));
      }
    },
  });

  useEffect(() => {
    // Fetch version history
    setIsLoadingVersions(true);
    fetch(`/api/documents/${document.id}/versions`, {
      credentials: 'include'
    }).then(res => res.json())
      .then(data => setVersions(data))
      .catch(console.error)
      .finally(() => setIsLoadingVersions(false));

    // WebSocket setup
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'auth',
        documentId: document.id,
        userId: user?.id,
        username: user?.username,
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'update' && editor) {
        const currentPos = editor.state.selection.$head.pos;
        editor.commands.setContent(data.content);
        editor.commands.setTextSelection(currentPos);
      } else if (data.type === 'cursor') {
        setCursors(prev => {
          const filtered = prev.filter(c => c.userId !== data.userId);
          return [...filtered, {
            userId: data.userId,
            username: data.username,
            position: data.position,
          }];
        });
      } else if (data.type === 'collaborators') {
        setCollaborators(data.users);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [document.id, user?.id, user?.username, editor]);

  const handleSave = async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editor.getHTML(),
          commitMessage,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to save document version');
      }

      const newVersion = await response.json();
      setVersions(prev => [...prev, newVersion]);
      setCommitMessage("");
      onSave?.();
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedText) return;

    await createCommentMutation.mutate({
      content: '',
      selectionRange: {
        start: selectedText.range.from,
        end: selectedText.range.to,
        text: selectedText.text,
      },
    });

    setSelectedText(null);
  };

  if (isLoading) {
    return (
      <Card className="min-h-[600px] flex flex-col">
        <CardHeader className="flex-none">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 relative">
          <Skeleton className="w-full h-[500px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[600px] rounded-lg border"
      >
        <ResizablePanel defaultSize={defaultLayout[0]} minSize={30}>
          <Card className="rounded-none border-0 h-full flex flex-col">
            <CardHeader className="flex-none">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{document.name}</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {collaborators.length} active
                    </span>
                  </div>
                  {selectedText && (
                    <Button
                      variant="outline"
                      onClick={handleAddComment}
                      disabled={createCommentMutation.isPending}
                    >
                      Add Comment
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setIsHistoryOpen(true)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 relative p-0">
              <EditorContent 
                editor={editor} 
                className="w-full h-full min-h-[500px] p-4 bg-background focus:outline-none prose prose-sm max-w-none"
              />
              {cursors.map((cursor) => (
                <div
                  key={cursor.userId}
                  className="absolute pointer-events-none"
                  style={{
                    top: `${cursor.position.line * 1.5}em`,
                    left: `${cursor.position.ch * 0.6}em`,
                  }}
                >
                  <div className="w-0.5 h-5 bg-blue-500 animate-pulse" />
                  <div className="px-2 py-1 text-xs bg-blue-500 text-white rounded mt-1">
                    {cursor.username}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={defaultLayout[1]} minSize={20}>
          <div className="h-full flex flex-col">
            <ChatSidebar
              documentId={document.id}
              collaborators={collaborators}
            />
            <CommentSidebar
              documentId={document.id}
              comments={comments}
              onCreateComment={createCommentMutation.mutate}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {isLoadingVersions ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {versions.map((version) => (
                  <Card key={version.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">Version {version.versionNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(version.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (editor) {
                            editor.commands.setContent(version.content);
                            setIsHistoryOpen(false);
                          }
                        }}
                      >
                        Restore
                      </Button>
                    </div>
                    {version.commitMessage && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {version.commitMessage}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}