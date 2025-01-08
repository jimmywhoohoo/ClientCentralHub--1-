import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to our logging service
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Send error to backend
    fetch('/api/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
    }).catch(console.error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                We apologize for the inconvenience. The error has been logged and we'll look into it.
              </p>
              <div className="space-y-4">
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs font-mono break-all">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
