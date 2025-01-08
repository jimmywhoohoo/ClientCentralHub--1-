import { Switch, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import { useUser } from "./hooks/use-user";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Protected route wrapper component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return <Component />;
}

function App() {
  const { user, isLoading, error } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route>404 Not Found</Route>
    </Switch>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  );
}