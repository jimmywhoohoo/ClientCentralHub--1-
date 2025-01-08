import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, NewUser } from "@db/schema";
import { useToast } from './use-toast';

type RequestResult = {
  ok: true;
  message: string;
  user: User;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: Partial<NewUser>
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      return { ok: false, message };
    }

    return response.json();
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, error, isLoading } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
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
    },
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: (userData: Partial<NewUser>) => 
      handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.setQueryData(['/api/user'], data.user);
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: Partial<NewUser>) =>
      handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.setQueryData(['/api/user'], data.user);
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.setQueryData(['/api/user'], null);
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
}