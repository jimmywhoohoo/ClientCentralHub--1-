import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

export function GoogleDriveSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    clientEmail: "",
    privateKey: "",
    folderId: "",
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    select: (data) => {
      const settings = {
        clientEmail: data.find((s: any) => s.key === "GOOGLE_DRIVE_CLIENT_EMAIL")?.value || "",
        privateKey: data.find((s: any) => s.key === "GOOGLE_DRIVE_PRIVATE_KEY")?.value || "",
        folderId: data.find((s: any) => s.key === "GOOGLE_DRIVE_FOLDER_ID")?.value || "",
      };
      return settings;
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const settingsToUpdate = [
        {
          key: "GOOGLE_DRIVE_CLIENT_EMAIL",
          value: newSettings.clientEmail,
          description: "Google Drive service account client email",
        },
        {
          key: "GOOGLE_DRIVE_PRIVATE_KEY",
          value: newSettings.privateKey,
          description: "Google Drive service account private key",
        },
        {
          key: "GOOGLE_DRIVE_FOLDER_ID",
          value: newSettings.folderId,
          description: "Google Drive folder ID for uploads (optional)",
        },
      ];

      // Update each setting
      await Promise.all(
        settingsToUpdate.map((setting) =>
          fetch(`/api/admin/settings/${setting.key}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(setting),
            credentials: "include",
          }).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to update ${setting.key}`);
            }
          })
        )
      );
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Google Drive settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(settings);
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Service Account Email</Label>
            <Input
              id="clientEmail"
              value={settings.clientEmail}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  clientEmail: e.target.value,
                }))
              }
              placeholder="service-account@project.iam.gserviceaccount.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <Input
              id="privateKey"
              type="password"
              value={settings.privateKey}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  privateKey: e.target.value,
                }))
              }
              placeholder="Enter your service account private key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folderId">Folder ID (Optional)</Label>
            <Input
              id="folderId"
              value={settings.folderId}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  folderId: e.target.value,
                }))
              }
              placeholder="Google Drive folder ID for uploads"
            />
          </div>

          <Button
            type="submit"
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}