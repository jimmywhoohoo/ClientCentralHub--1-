import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Check, Reply } from "lucide-react";
import type { DocumentComment } from "@db/schema";
import { useUser } from "@/hooks/use-user";
import { format } from "date-fns";

interface CommentSidebarProps {
  documentId: number;
  comments: DocumentComment[];
  onCreateComment: (data: {
    content: string;
    selectionRange: { start: number; end: number; text: string };
    mentions?: number[];
    parentId?: number;
  }) => void;
}

export function CommentSidebar({ documentId, comments, onCreateComment }: CommentSidebarProps) {
  const { user } = useUser();
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  const handleSubmitReply = (parentId: number) => {
    if (!newComment.trim()) return;

    onCreateComment({
      content: newComment,
      selectionRange: {
        start: 0,
        end: 0,
        text: "",
      },
      parentId,
    });

    setNewComment("");
    setReplyTo(null);
  };

  const resolveComment = async (commentId: number) => {
    try {
      await fetch(`/api/documents/${documentId}/comments/${commentId}/resolve`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  // Group comments by thread
  const commentThreads = comments.reduce((acc, comment) => {
    if (!comment.parentId) {
      if (!acc[comment.id]) {
        acc[comment.id] = {
          parent: comment,
          replies: [],
        };
      } else {
        acc[comment.id].parent = comment;
      }
    } else {
      if (!acc[comment.parentId]) {
        acc[comment.parentId] = {
          replies: [comment],
        };
      } else {
        acc[comment.parentId].replies.push(comment);
      }
    }
    return acc;
  }, {} as Record<number, { parent: DocumentComment; replies: DocumentComment[] }>);

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h2 className="font-semibold">Comments</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.values(commentThreads).map(({ parent, replies }) => (
            <div key={parent.id} className="space-y-2">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {parent.author?.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{parent.author?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(parent.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Selected text: "{parent.selectionRange.text}"
                    </p>
                    <p className="text-sm">{parent.content}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(replyTo === parent.id ? null : parent.id)}
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                    {!parent.resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveComment(parent.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>

                  {replyTo === parent.id && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        placeholder="Write a reply..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyTo(null);
                            setNewComment("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(parent.id)}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div className="ml-11 space-y-2">
                  {replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {reply.author?.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{reply.author?.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(reply.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <p className="text-sm mt-1">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
