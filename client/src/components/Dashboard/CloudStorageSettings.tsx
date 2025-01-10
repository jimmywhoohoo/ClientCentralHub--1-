import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SiGoogledrive, SiDropbox, SiMicrosoftOnedrive, SiMega } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

type CloudService = {
  id: string;
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isEnabled: boolean;
};

export function CloudStorageSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Fetch current cloud storage settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/cloud-storage'],
    retry: false,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to load cloud storage settings",
        variant: "destructive",
      });
    }
  });

  const [services, setServices] = useState<CloudService[]>([
    {
      id: "googleDrive",
      name: "Google Drive",
      icon: <SiGoogledrive className="w-6 h-6" />,
      isConnected: settings?.googleDrive || false,
      isEnabled: settings?.googleDrive || false,
    },
    {
      id: "dropbox",
      name: "Dropbox",
      icon: <SiDropbox className="w-6 h-6" />,
      isConnected: settings?.dropbox || false,
      isEnabled: settings?.dropbox || false,
    },
    {
      id: "oneDrive",
      name: "OneDrive",
      icon: <SiMicrosoftOnedrive className="w-6 h-6" />,
      isConnected: settings?.oneDrive || false,
      isEnabled: settings?.oneDrive || false,
    },
    {
      id: "mega",
      name: "MEGA",
      icon: <SiMega className="w-6 h-6" />,
      isConnected: settings?.mega || false,
      isEnabled: settings?.mega || false,
    },
  ]);

  // Update cloud storage settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ serviceId, enabled }: { serviceId: string; enabled: boolean }) => {
      const response = await fetch('/api/admin/settings/cloud-storage', {
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
    onSuccess: (_, variables) => {
      setServices(prev =>
        prev.map(service =>
          service.id === variables.serviceId
            ? { ...service, isEnabled: variables.enabled }
            : service
        )
      );
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/cloud-storage'] });
      toast({
        title: "Settings Updated",
        description: "Cloud storage settings have been saved successfully.",
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
    mutationFn: async (serviceId: string) => {
      setIsConnecting(serviceId);
      try {
        const response = await fetch(`/api/admin/settings/cloud-storage/${serviceId}/connect`, {
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
      setServices(prev =>
        prev.map(service =>
          service.id === serviceId
            ? { ...service, isConnected: true, isEnabled: true }
            : service
        )
      );
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/cloud-storage'] });
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

  const handleToggleService = (serviceId: string, enabled: boolean) => {
    updateSettingsMutation.mutate({ serviceId, enabled });
  };

  const handleConnectService = (serviceId: string) => {
    connectServiceMutation.mutate(serviceId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cloud Storage Integration</CardTitle>
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
        <CardTitle>Cloud Storage Integration</CardTitle>
        <CardDescription>
          Connect and manage your cloud storage services
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
                    {service.isConnected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {service.isConnected ? (
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