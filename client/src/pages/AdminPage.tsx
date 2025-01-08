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
import type { User, File } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, Loader2, Shield, Image, Files, Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FileWithUploader = File & {
  uploader: User;
};

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
  files: FileWithUploader[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type UserFiles = {
  files: File[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

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

export default function AdminPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserFiles, setSelectedUserFiles] = useState<User | null>(null);
  const [userFilesPage, setUserFilesPage] = useState(1);
  const [fileListPage, setFileListPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<FileWithUploader | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<{
    field: "uploadedAt" | "fileName" | "fileSize";
    order: "asc" | "desc";
  }>({ field: "uploadedAt", order: "desc" });
  const [fileToDelete, setFileToDelete] = useState<FileWithUploader | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading: loadingUsers } = useQuery<PaginatedResponse>({
    queryKey: ["/api/admin/users", page],
    enabled: user?.role === "admin",
  });

  const { data: userFiles, isLoading: loadingUserFiles } = useQuery<UserFiles>({
    queryKey: ["/api/admin/users", selectedUserFiles?.id, "files", userFilesPage],
    enabled: !!selectedUserFiles && user?.role === "admin",
  });

  const { data: fileData, isLoading: loadingFiles } = useQuery<PaginatedFileResponse>({
    queryKey: ["/api/admin/files", fileListPage],
    enabled: user?.role === "admin",
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, active, username, companyName }: {
      id: number;
      role: string;
      active: boolean;
      username?: string;
      companyName?: string;
    }) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, active, username, companyName }),
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

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: "DELETE",
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
        description: "File deleted successfully",
      });
      setFileToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  // Redirect if not admin
  if (user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  // Safe filtering with null checks
  const filteredUsers = (data?.users || []).filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fileTypes = Array.from(
    new Set((fileData?.files || []).map((file) => file.fileType))
  );

  // Filter and sort files
  const filteredFiles = (fileData?.files || [])
    .filter((file) => {
      const matchesSearch = file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.uploader.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.uploader.companyName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = fileTypeFilter === "all" || file.fileType === fileTypeFilter;

      const matchesDate = (!dateRange.from || new Date(file.uploadedAt) >= dateRange.from) &&
        (!dateRange.to || new Date(file.uploadedAt) <= dateRange.to);

      return matchesSearch && matchesType && matchesDate;
    })
    .sort((a, b) => {
      const order = sortBy.order === "asc" ? 1 : -1;
      switch (sortBy.field) {
        case "uploadedAt":
          return (new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()) * order;
        case "fileName":
          return a.fileName.localeCompare(b.fileName) * order;
        case "fileSize":
          return (a.fileSize - b.fileSize) * order;
        default:
          return 0;
      }
    });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0 ml-0 md:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            {selectedUserFiles && (
              <BreadcrumbItem>
                <BreadcrumbLink>
                  {selectedUserFiles.username}'s Files
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
          </Breadcrumb>

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
                          <TableHead>Company</TableHead>
                          <TableHead className="hidden md:table-cell">Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <Button
                                variant="link"
                                className="p-0 h-auto font-medium"
                                onClick={() => setSelectedUserFiles(user)}
                              >
                                {user.username}
                              </Button>
                            </TableCell>
                            <TableCell>{user.fullName}</TableCell>
                            <TableCell>{user.companyName}</TableCell>
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
              <div className="flex items-center justify-between">
                <CardTitle>All Uploaded Files</CardTitle>
                <div className="flex items-center gap-2">
                  {/* File Type Filter */}
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {fileTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date Range Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          "Pick a date range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="range"
                        selected={{
                          from: dateRange.from || undefined,
                          to: dateRange.to || undefined,
                        }}
                        onSelect={(range) =>
                          setDateRange({
                            from: range?.from || null,
                            to: range?.to || null
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Sort Options */}
                  <Select
                    value={`${sortBy.field}-${sortBy.order}`}
                    onValueChange={(value) => {
                      const [field, order] = value.split("-") as [
                        "uploadedAt" | "fileName" | "fileSize",
                        "asc" | "desc"
                      ];
                      setSortBy({ field, order });
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uploadedAt-desc">Latest First</SelectItem>
                      <SelectItem value="uploadedAt-asc">Oldest First</SelectItem>
                      <SelectItem value="fileName-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="fileName-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="fileSize-desc">Size (Largest)</SelectItem>
                      <SelectItem value="fileSize-asc">Size (Smallest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                          <TableHead>Company</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFiles.map((file) => (
                          <TableRow key={file.id} className="hover:bg-muted/50" onClick={() => setSelectedFile(file)}>
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
                            <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                            <TableCell>{file.uploader.username}</TableCell>
                            <TableCell>{file.uploader.companyName}</TableCell>
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
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFileToDelete(file);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </div>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Modify user details and permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={selectedUser?.username}
                onChange={(e) => {
                  if (selectedUser) {
                    setSelectedUser({
                      ...selectedUser,
                      username: e.target.value
                    });
                  }
                }}
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={selectedUser?.companyName}
                onChange={(e) => {
                  if (selectedUser) {
                    setSelectedUser({
                      ...selectedUser,
                      companyName: e.target.value
                    });
                  }
                }}
                placeholder="Enter company name"
              />
            </div>

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
                      username: selectedUser.username,
                      companyName: selectedUser.companyName
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
                      username: selectedUser.username,
                      companyName: selectedUser.companyName
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

            <Button
              className="w-full"
              onClick={() => {
                if (selectedUser) {
                  updateUserMutation.mutate({
                    id: selectedUser.id,
                    role: selectedUser.role,
                    active: selectedUser.active,
                    username: selectedUser.username,
                    companyName: selectedUser.companyName
                  });
                }
              }}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Files Dialog */}
      <Dialog open={!!selectedUserFiles} onOpenChange={() => {
        setSelectedUserFiles(null);
        setUserFilesPage(1);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Files className="h-5 w-5" />
              Files uploaded by {selectedUserFiles?.fullName}
            </DialogTitle>
            <DialogDescription>
              Company: {selectedUserFiles?.companyName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px]">
            {loadingUserFiles ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !userFiles?.files?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No files uploaded yet
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userFiles.files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
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
                            {file.fileName}
                          </div>
                        </TableCell>
                        <TableCell>{file.fileType}</TableCell>
                        <TableCell>{formatFileSize(file.fileSize)}</TableCell>
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
            )}

            {userFiles?.pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {[...Array(userFiles.pagination.pages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={userFilesPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUserFilesPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Files className="h-5 w-5" />
              File Preview: {selectedFile?.fileName}
            </DialogTitle>
            <DialogDescription>
              Uploaded by {selectedFile?.uploader.username} from {selectedFile?.uploader.companyName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Preview */}
            <div className="rounded-lg border bg-card p-4">
              {selectedFile?.thumbnailPath ? (
                <AspectRatio ratio={16 / 9}>
                  <img
                    src={`/api/files/thumbnail/${selectedFile.id}`}
                    alt={selectedFile.fileName}
                    className="rounded-md object-contain w-full h-full"
                  />
                </AspectRatio>
              ) : (
                <div className="flex items-center justify-center h-48 bg-muted rounded-md">
                  <Image className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* File Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm">File Details</h4>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Type</dt>
                    <dd>{selectedFile?.fileType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Size</dt>
                    <dd>{formatFileSize(selectedFile?.fileSize || 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Upload Date</dt>
                    <dd>{selectedFile?.uploadedAt && format(new Date(selectedFile.uploadedAt), "PPP")}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="font-medium text-sm">Uploader Information</h4>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Username</dt>
                    <dd>{selectedFile?.uploader.username}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Company</dt>
                    <dd>{selectedFile?.uploader.companyName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant={selectedFile?.isArchived ? "secondary" : "default"}>
                        {selectedFile?.isArchived ? "Archived" : "Active"}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (fileToDelete) {
                  deleteFileMutation.mutate(fileToDelete.id);
                }
              }}
            >
              {deleteFileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}