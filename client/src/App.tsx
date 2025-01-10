import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import DashboardPage from "@/pages/DashboardPage";
import AuthPage from "@/pages/AuthPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminPage from "@/pages/AdminPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If user is not logged in, show auth pages
  if (!user) {
    return (
      <Switch>
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  // User is logged in - handle protected routes
  return (
    <Switch>
      <Route path="/admin">
        {user.role === 'admin' ? <AdminPage /> : <NotFound />}
      </Route>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/">
        {user.role === 'admin' ? <AdminPage /> : <DashboardPage />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Wrap the app with error boundary and toaster
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  );
}