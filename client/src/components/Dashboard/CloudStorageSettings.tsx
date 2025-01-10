import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SiGoogledrive, SiDropbox, SiMicrosoftOnedrive, SiMega } from "react-icons/si";
import { HardDrive, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StorageSettings } from "@db/schema";

type StorageService = {
  id: "local" | "googleDrive" | "dropbox" | "oneDrive" | "mega";
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isEnabled: boolean;
  type: 'cloud' | 'local';
  description: string;
};

export function CloudStorageSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<StorageSettings>({
    queryKey: ['/api/storage/settings'],
    retry: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load storage settings",
        variant: "destructive",
      });
    }
  });

  const services: StorageService[] = [
    {
      id: "local",
      name: "Local Storage",
      icon: <HardDrive className="w-6 h-6" />,
      isConnected: true,
      isEnabled: settings?.localEnabled ?? true,
      type: 'local',
      description: "Store files on the local filesystem",
    },
    {
      id: "googleDrive",
      name: "Google Drive",
      icon: <SiGoogledrive className="w-6 h-6" />,
      isConnected: settings?.googleDrive ?? false,
      isEnabled: settings?.googleDrive ?? false,
      type: 'cloud',
      description: "Connect to Google Drive for cloud storage",
    },
    {
      id: "dropbox",
      name: "Dropbox",
      icon: <SiDropbox className="w-6 h-6" />,
      isConnected: settings?.dropbox ?? false,
      isEnabled: settings?.dropbox ?? false,
      type: 'cloud',
      description: "Connect to Dropbox for cloud storage",
    },
    {
      id: "oneDrive",
      name: "OneDrive",
      icon: <SiMicrosoftOnedrive className="w-6 h-6" />,
      isConnected: settings?.oneDrive ?? false,
      isEnabled: settings?.oneDrive ?? false,
      type: 'cloud',
      description: "Connect to OneDrive for cloud storage",
    },
    {
      id: "mega",
      name: "MEGA",
      icon: <SiMega className="w-6 h-6" />,
      isConnected: settings?.mega ?? false,
      isEnabled: settings?.mega ?? false,
      type: 'cloud',
      description: "Connect to MEGA for cloud storage",
    },
  ];

  // Update storage settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ serviceId, enabled }: { serviceId: StorageService['id']; enabled: boolean }) => {
      const response = await fetch('/api/storage/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, enabled }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/settings'] });
      toast({
        title: "Settings Updated",
        description: "Storage settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Connect cloud service mutation
  const connectServiceMutation = useMutation({
    mutationFn: async (serviceId: StorageService['id']) => {
      setIsConnecting(serviceId);
      try {
        const response = await fetch(`/api/storage/${serviceId}/connect`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return response.json();
      } finally {
        setIsConnecting(null);
      }
    },
    onSuccess: (_, serviceId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/settings'] });
      toast({
        title: "Connected Successfully",
        description: `${services.find(s => s.id === serviceId)?.name} has been connected.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to service",
        variant: "destructive",
      });
    },
  });

  const handleToggleService = (serviceId: StorageService['id'], enabled: boolean) => {
    updateSettingsMutation.mutate({ serviceId, enabled });
  };

  const handleConnectService = (serviceId: StorageService['id']) => {
    connectServiceMutation.mutate(serviceId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Integration</CardTitle>
          <CardDescription>Loading storage settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Integration</CardTitle>
        <CardDescription>
          Configure local and cloud storage options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between space-x-4 rounded-lg border p-4"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-secondary rounded-lg">
                  {service.icon}
                </div>
                <div>
                  <h4 className="font-medium">{service.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                  {service.type === 'cloud' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.isConnected ? "Connected" : "Not connected"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {(service.type === 'local' || service.isConnected) ? (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`${service.id}-toggle`}
                      checked={service.isEnabled}
                      onCheckedChange={(checked) =>
                        handleToggleService(service.id, checked)
                      }
                      disabled={updateSettingsMutation.isPending}
                    />
                    <Label htmlFor={`${service.id}-toggle`}>
                      {service.isEnabled ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleConnectService(service.id)}
                    disabled={!!isConnecting}
                  >
                    {isConnecting === service.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}