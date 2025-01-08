import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { useToast } from './use-toast';
import { useLocation } from 'wouter';

type LoginCredentials = {
  username: string;
  password: string;
};

type AuthResponse = {
  ok: boolean;
  message: string;
  user?: User;
};

async function handleAuthRequest(
  url: string, 
  method: string,
  body?: LoginCredentials
): Promise<AuthResponse> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { 
      ok: false, 
      message: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          const data = await response.json();
          throw new Error(data.message || response.statusText);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
    retry: false,
    staleTime: Infinity
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const result = await handleAuthRequest('/api/login', 'POST', credentials);
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/user'], data.user);
      toast({
        title: "Success",
        description: data.message,
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const result = await handleAuthRequest('/api/logout', 'POST');
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/user'], null);
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      setLocation('/auth');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
  };
}