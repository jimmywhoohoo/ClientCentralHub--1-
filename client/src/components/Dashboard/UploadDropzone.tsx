import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadDropzoneProps {
  onUploadComplete?: (document: any) => void;
}

export function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<{ name: string; preview: string } | null>(null);
  const { toast } = useToast();

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
        });
      };
      reader.readAsDataURL(file);
    } else {
      setPreview({
        name: file.name,
        preview: '',
      });
    }

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

      // TODO: Implement actual file upload logic here with FormData
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/documents/upload', {
      //   method: 'POST',
      //   body: formData,
      // });

      // Cleanup and success notification
      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          setPreview(null);
          toast({
            title: "Success",
            description: "File uploaded successfully",
          });
          if (onUploadComplete) {
            onUploadComplete({
              id: Math.random(),
              name: file.name,
              createdAt: new Date(),
              // Add other document properties as needed
            });
          }
        }, 500);
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      setUploading(false);
      setUploadProgress(0);
      setPreview(null);
    }
  }, [toast, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: uploading,
  });

  const clearPreview = () => {
    if (!uploading) {
      setPreview(null);
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
            {preview?.preview && (
              <div className="mt-4">
                <img
                  src={preview.preview}
                  alt="Preview"
                  className="max-h-48 rounded object-contain mx-auto"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
