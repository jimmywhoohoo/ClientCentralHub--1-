import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Users } from "lucide-react";
import type { Document } from "@db/schema";

interface DocumentEditorProps {
  document: Document;
  onSave?: () => void;
}

interface CursorPosition {
  userId: number;
  username: string;
  position: { line: number; ch: number };
}

export function DocumentEditor({ document, onSave }: DocumentEditorProps) {
  const { user } = useUser();
  const [content, setContent] = useState(document.content);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Use the same protocol (ws/wss) as the current page (http/https)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      // Send authentication data
      socket.send(JSON.stringify({
        type: 'auth',
        documentId: document.id,
        userId: user?.id,
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'update') {
        setContent(data.content);
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
  }, [document.id, user?.id]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Send content update to server
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'update',
        documentId: document.id,
        content: newContent,
        userId: user?.id,
      }));
    }
  };

  const handleCursorMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const position = {
      line: textarea.value.substr(0, textarea.selectionStart).split('\n').length,
      ch: textarea.selectionStart - textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) - 1,
    };

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'cursor',
        documentId: document.id,
        userId: user?.id,
        position,
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      onSave?.();
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="min-h-[600px] flex flex-col">
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
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 relative">
        <textarea
          className="w-full h-full min-h-[500px] p-4 bg-background resize-none focus:outline-none"
          value={content}
          onChange={handleContentChange}
          onMouseMove={handleCursorMove}
          onKeyUp={(e) => handleCursorMove(e as any)}
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
  );
}