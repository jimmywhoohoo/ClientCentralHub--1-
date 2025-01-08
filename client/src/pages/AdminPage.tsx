import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "../components/Dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "../hooks/use-user";
import { useLocation } from "wouter";
import type { User, Document, File } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, Loader2, AlertCircle, Shield, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type PaginatedResponse = {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type PaginatedFileResponse = {
  files: (File & { uploader: User })[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export default function AdminPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fileListPage, setFileListPage] = useState(1);

  const { data, isLoading: loadingUsers } = useQuery<PaginatedResponse>({
    queryKey: ["/api/admin/users", page],
    enabled: user?.role === "admin",
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, active }: { id: number; role: string; active: boolean }) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, active }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const filteredUsers = data?.users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    enabled: user?.role === "admin",
  });

  const recentDocuments = documents?.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const { data: fileData, isLoading: loadingFiles } = useQuery<PaginatedFileResponse>({
    queryKey: ["/api/admin/files", fileListPage],
    enabled: user?.role === "admin",
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0 ml-0 md:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead className="hidden md:table-cell">Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers?.map((user) => (
                          <TableRow key={user.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.fullName}</TableCell>
                            <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted"
                              }`}>
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {user.active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {data && data.pagination.pages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {[...Array(data.pagination.pages)].map((_, i) => (
                        <Button
                          key={i}
                          variant={page === i + 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFiles ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileData?.files.map((file) => (
                          <TableRow key={file.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {file.thumbnailPath ? (
                                  <AspectRatio ratio={1} className="w-10 h-10 rounded-md overflow-hidden">
                                    <img
                                      src={`/api/files/thumbnail/${file.id}`}
                                      alt={file.fileName}
                                      className="object-cover w-full h-full"
                                    />
                                  </AspectRatio>
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                    <Image className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span>{file.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{file.fileType}</TableCell>
                            <TableCell>
                              {formatFileSize(file.fileSize)}
                            </TableCell>
                            <TableCell>{file.uploader.username}</TableCell>
                            <TableCell>
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                file.isArchived ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                              }`}>
                                {file.isArchived ? "Archived" : "Active"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {fileData && fileData.pagination.pages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {[...Array(fileData.pagination.pages)].map((_, i) => (
                        <Button
                          key={i}
                          variant={fileListPage === i + 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFileListPage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">Created</TableHead>
                        <TableHead className="hidden md:table-cell">Views</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDocuments?.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>{doc.type}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {doc.accessCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Modify user role and status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={selectedUser?.role}
                onValueChange={(value) => {
                  if (selectedUser) {
                    updateUserMutation.mutate({
                      id: selectedUser.id,
                      role: value,
                      active: selectedUser.active,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={selectedUser?.active ? "active" : "inactive"}
                onValueChange={(value) => {
                  if (selectedUser) {
                    updateUserMutation.mutate({
                      id: selectedUser.id,
                      role: selectedUser.role,
                      active: value === "active",
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}