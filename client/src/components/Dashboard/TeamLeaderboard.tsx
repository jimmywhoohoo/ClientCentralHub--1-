import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";

interface TeamMember {
  id: number;
  username: string;
  fullName: string;
  role: string;
  metrics: {
    tasksCompleted: number;
    onTimeCompletion: number;
    documentComments: number;
    collaborationScore: number;
    totalScore: number;
  };
}

interface TeamPerformanceUpdate {
  type: 'team_performance';
  members: TeamMember[];
}

export function TeamLeaderboard() {
  const { user } = useUser();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Get the current host (without any path)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      websocket.send(JSON.stringify({
        userId: user.id,
        username: user.username
      }));

      // Subscribe to team performance updates after authentication
      setTimeout(() => {
        websocket.send(JSON.stringify({
          type: 'subscribe_team_performance'
        }));
      }, 100);

      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'team_performance') {
          setTeamMembers(data.members.sort((a: TeamMember, b: TeamMember) => 
            b.metrics.totalScore - a.metrics.totalScore
          ));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    setWs(websocket);

    // Cleanup function
    return () => {
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        websocket.close();
      }
    };
  }, [user]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-700" />;
      default:
        return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Team Performance Leaderboard
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Live" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <AnimatePresence>
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`mb-4 p-4 border rounded-lg ${member.id === user?.id ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getRankIcon(index)}
                    <div>
                      <h3 className="font-medium">{member.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(member.metrics.totalScore)}`}>
                    {member.metrics.totalScore}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks Completed:</span>
                    <span>{member.metrics.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">On-time Rate:</span>
                    <span>{member.metrics.onTimeCompletion}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comments:</span>
                    <span>{member.metrics.documentComments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collaboration:</span>
                    <span>{member.metrics.collaborationScore}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}