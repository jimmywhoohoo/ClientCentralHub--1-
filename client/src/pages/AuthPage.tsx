import { useState } from "react";
import { useUser } from "../hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Shield } from "lucide-react";

type FormData = {
  username: string;
  password: string;
  email: string;
  fullName: string;
  companyName: string;
  address: string;
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    email: "",
    fullName: "",
    companyName: "",
    address: "",
  });
  const { login, register, user } = useUser();
  const { toast } = useToast();

  // Redirect if already authenticated
  if (user) {
    setLocation("/");
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login({ 
          username: formData.username, 
          password: formData.password 
        });
      } else {
        await register(formData);
        toast({
          title: "Success",
          description: "Registration successful! You can now log in.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? "Login" : "Register"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full">
              {isLogin ? "Login" : "Register"}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="link"
              className="w-full"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({
                  username: "",
                  password: "",
                  email: "",
                  fullName: "",
                  companyName: "",
                  address: "",
                });
              }}
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setLocation("/admin/login")}
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}