import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SiGoogledrive, SiDropbox, SiOnedrive, SiMega } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";

type CloudService = {
  id: string;
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isEnabled: boolean;
};

export function CloudStorageSettings() {
  const { toast } = useToast();
  const [services, setServices] = useState<CloudService[]>([
    {
      id: "google-drive",
      name: "Google Drive",
      icon: <SiGoogledrive className="w-6 h-6" />,
      isConnected: false,
      isEnabled: false,
    },
    {
      id: "dropbox",
      name: "Dropbox",
      icon: <SiDropbox className="w-6 h-6" />,
      isConnected: false,
      isEnabled: false,
    },
    {
      id: "onedrive",
      name: "OneDrive",
      icon: <SiOnedrive className="w-6 h-6" />,
      isConnected: false,
      isEnabled: false,
    },
    {
      id: "mega",
      name: "MEGA",
      icon: <SiMega className="w-6 h-6" />,
      isConnected: false,
      isEnabled: false,
    },
  ]);

  // Fetch current cloud storage settings
  const { data: cloudSettings } = useQuery({
    queryKey: ['/api/admin/settings/cloud-storage'],
  });

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
      toast({
        title: "Settings Updated",
        description: "Cloud storage settings have been saved successfully.",
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

  // Connect cloud service mutation
  const connectServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const response = await fetch(`/api/admin/settings/cloud-storage/${serviceId}/connect`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (_, serviceId) => {
      setServices(prev =>
        prev.map(service =>
          service.id === serviceId
            ? { ...service, isConnected: true }
            : service
        )
      );
      toast({
        title: "Connected Successfully",
        description: "Cloud storage service has been connected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
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
                    />
                    <Label htmlFor={`${service.id}-toggle`}>
                      {service.isEnabled ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleConnectService(service.id)}
                  >
                    Connect
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