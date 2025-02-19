import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, X, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface UploadDropzoneProps {
  onUploadComplete?: (document: any) => void;
}

export function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<{ name: string; preview: string; file: File; uploadedAt?: Date } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 100);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();

      // Cleanup and success notification
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setPreview(null);
        setShowConfirmDialog(false);
        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
        if (onUploadComplete) {
          onUploadComplete(data);
        }
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      setUploading(false);
      setUploadProgress(0);
      setPreview(null);
      setShowConfirmDialog(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create preview for the file
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview({
          name: file.name,
          preview: reader.result as string,
          file,
          uploadedAt: new Date()
        });
        setShowConfirmDialog(true);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview({
        name: file.name,
        preview: '',
        file,
        uploadedAt: new Date()
      });
      setShowConfirmDialog(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: uploading,
  });

  const clearPreview = () => {
    if (!uploading) {
      setPreview(null);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed ${
          isDragActive ? "border-primary" : "border-border"
        } hover:border-primary transition-colors cursor-pointer`}
      >
        <CardContent className="p-6">
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-muted-foreground">Drop the file here</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drag and drop a file here, or click to select
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {(uploading || preview) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{preview?.name}</p>
                {uploading && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
              {!uploading && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearPreview();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm File Upload</DialogTitle>
            <DialogDescription>
              Please review your file before confirming the upload
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{preview?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Size: {preview?.file && (preview.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {preview?.uploadedAt && (
                  <p className="text-sm text-muted-foreground">
                    Upload time: {preview.uploadedAt.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {preview?.preview && (
              <AspectRatio ratio={16 / 9} className="bg-muted rounded-md overflow-hidden">
                <img
                  src={preview.preview}
                  alt="Preview"
                  className="object-contain w-full h-full"
                />
              </AspectRatio>
            )}
          </div>

          <DialogFooter className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                clearPreview();
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (preview?.file) {
                  handleUpload(preview.file);
                }
              }}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}