import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, Medal, Star, Award, Crown, Target, 
  Zap, ThumbsUp, BookOpen, Users 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-user";

interface Achievement {
  type: string;
  title: string;
  description: string;
  icon: JSX.Element;
}

interface TeamMember {
  id: number;
  username: string;
  fullName: string;
  role: string;
  achievements: Achievement[];
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

const achievementIcons = {
  speedster: <Zap className="h-4 w-4 text-yellow-400" />,
  teamPlayer: <Users className="h-4 w-4 text-blue-400" />,
  expert: <BookOpen className="h-4 w-4 text-purple-400" />,
  consistent: <Target className="h-4 w-4 text-green-400" />,
  leader: <Crown className="h-4 w-4 text-amber-400" />,
  helpful: <ThumbsUp className="h-4 w-4 text-pink-400" />,
};

export function TeamLeaderboard() {
  const { user } = useUser();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (!user) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

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

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Outstanding";
    if (score >= 70) return "Great";
    if (score >= 50) return "Good";
    return "Needs Improvement";
  };

  return (
    <TooltipProvider>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Team Performance Leaderboard
            <Badge variant={isConnected ? "default" : "destructive"} className="animate-pulse">
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
                  transition={{ 
                    duration: 0.3,
                    type: "spring",
                    stiffness: 100 
                  }}
                  className={`mb-4 p-4 border rounded-lg hover:shadow-md transition-shadow ${
                    member.id === user?.id ? 'bg-muted/50 border-primary/50' : ''
                  }`}
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {getRankIcon(index)}
                      </motion.div>
                      <div>
                        <h3 className="font-medium">{member.fullName}</h3>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className={`text-2xl font-bold ${getScoreColor(member.metrics.totalScore)}`}>
                          {member.metrics.totalScore}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getScoreLabel(member.metrics.totalScore)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <Tooltip>
                      <TooltipTrigger className="flex justify-between">
                        <span className="text-muted-foreground">Tasks:</span>
                        <span>{member.metrics.tasksCompleted}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Completed Tasks</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger className="flex justify-between">
                        <span className="text-muted-foreground">On-time:</span>
                        <span>{member.metrics.onTimeCompletion}%</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>On-time Completion Rate</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger className="flex justify-between">
                        <span className="text-muted-foreground">Comments:</span>
                        <span>{member.metrics.documentComments}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Document Comments</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger className="flex justify-between">
                        <span className="text-muted-foreground">Collab:</span>
                        <span>{member.metrics.collaborationScore}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Collaboration Score</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {member.achievements && (
                    <div className="flex gap-1 flex-wrap">
                      {member.achievements.map((achievement, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1 bg-muted rounded-full"
                            >
                              {achievementIcons[achievement.type as keyof typeof achievementIcons]}
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{achievement.title}</p>
                            <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}