import { Sidebar } from "../components/Dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThemeCustomizer } from "../components/Dashboard/ThemeCustomizer";
import { NotificationPreferencesCard } from "../components/Dashboard/NotificationPreferences";
import { Input } from "@/components/ui/input";
import { useUser } from "../hooks/use-user";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been updated successfully.",
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0 ml-0 md:ml-64">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>

          <ThemeCustomizer />

          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                  />
                </div>

                <Button type="submit">
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          <NotificationPreferencesCard />
        </div>
      </main>
    </div>
  );
}