import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2 } from "lucide-react";
import type { NotificationPreferences } from "@db/schema";

export function NotificationPreferencesCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notification-preferences'],
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updatedPreferences: Partial<NotificationPreferences>) => {
      const response = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPreferences),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
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

  const togglePreference = (
    key: keyof NotificationPreferences,
    currentValue: boolean
  ) => {
    if (updatePreferencesMutation.isPending) return;

    updatePreferencesMutation.mutate({
      [key]: !currentValue,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 animate-pulse"
              >
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-5 w-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) return null;

  const preferenceItems = [
    {
      key: 'emailNotifications' as const,
      label: 'Email Notifications',
      description: 'Receive notifications via email',
    },
    {
      key: 'taskAssignments' as const,
      label: 'Task Assignments',
      description: 'Get notified when you are assigned a task',
    },
    {
      key: 'taskUpdates' as const,
      label: 'Task Updates',
      description: 'Get notified about updates to your tasks',
    },
    {
      key: 'documentSharing' as const,
      label: 'Document Sharing',
      description: 'Get notified when documents are shared with you',
    },
    {
      key: 'documentComments' as const,
      label: 'Document Comments',
      description: 'Get notified about comments on your documents',
    },
    {
      key: 'achievementUnlocks' as const,
      label: 'Achievement Unlocks',
      description: 'Get notified when you unlock achievements',
    },
    {
      key: 'dailyDigest' as const,
      label: 'Daily Digest',
      description: 'Receive a daily summary of activities',
    },
    {
      key: 'weeklyDigest' as const,
      label: 'Weekly Digest',
      description: 'Receive a weekly summary of activities',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {preferenceItems.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex flex-row items-center justify-between space-y-0"
            >
              <div className="space-y-0.5">
                <Label className="text-base">{label}</Label>
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
              <Switch
                checked={preferences[key]}
                onCheckedChange={() => togglePreference(key, preferences[key])}
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
          ))}
        </div>

        {updatePreferencesMutation.isPending && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
