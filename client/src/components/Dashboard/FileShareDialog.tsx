import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users } from "lucide-react";
import type { User, FileWithUploader } from "@db/schema";
import { format, addDays } from "date-fns";

interface FileShareDialogProps {
  file: FileWithUploader | null;
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileShareDialog({ file, users, open, onOpenChange }: FileShareDialogProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [expiryDays, setExpiryDays] = useState<string>("never");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shareFileMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;

      const response = await fetch(`/api/admin/files/${file.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUsers.map(Number),
          expiresAt: expiryDays !== "never" ? addDays(new Date(), parseInt(expiryDays)) : null,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      toast({
        title: "Success",
        description: "File shared successfully",
      });
      onOpenChange(false);
      setSelectedUsers([]);
      setExpiryDays("never");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share File
          </DialogTitle>
          <DialogDescription>
            Share "{file.fileName}" with other users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Users</Label>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {users
                  .filter(user => user.role !== "admin")
                  .map(user => (
                    <label
                      key={user.id}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4"
                        checked={selectedUsers.includes(String(user.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, String(user.id)]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== String(user.id)));
                          }
                        }}
                      />
                      <span>
                        {user.fullName} ({user.companyName})
                      </span>
                    </label>
                  ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label>Access Duration</Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">No Expiration</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={selectedUsers.length === 0 || shareFileMutation.isPending}
            onClick={() => shareFileMutation.mutate()}
          >
            {shareFileMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              'Share File'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}