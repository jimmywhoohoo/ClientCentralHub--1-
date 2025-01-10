import { useEffect, useRef, useState } from 'react';
import { useUser } from './use-user';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export function useWebSocket() {
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Send authentication message
      ws.send(JSON.stringify({
        userId: user.id,
        username: user.username
      }));

      // Subscribe to team performance updates
      ws.send(JSON.stringify({
        type: 'subscribe_team_performance'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'team_performance':
            setTeamPerformance(message.members);
            break;
          case 'connected':
            console.log('WebSocket connection established:', message.message);
            break;
          case 'error':
            console.error('WebSocket error:', message.message);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (user) {
          wsRef.current = null;
        }
      }, 5000);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user]);

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    teamPerformance,
    sendMessage
  };
}
