import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { useToast } from './use-toast';

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email: string;
  fullName: string;
  companyName: string;
};

type AuthResponse = {
  ok: boolean;
  message: string;
  user?: User;
};

async function handleAuthRequest(
  url: string, 
  method: string,
  body?: LoginCredentials | RegisterData
): Promise<AuthResponse> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data;
  } catch (error) {
    throw error instanceof Error ? error : new Error('An error occurred');
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
          throw new Error(await response.text());
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const result = await handleAuthRequest('/api/register', 'POST', data);
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/user'], data.user);
      toast({
        title: "Success",
        description: data.message,
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
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
  };
}