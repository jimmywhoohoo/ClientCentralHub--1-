import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Award,
  CheckCircle2,
  FileText,
  MessageSquare,
  Star,
  Timer,
  Upload,
  Users,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import type { Achievement, UserAchievement } from "@db/schema";

type AchievementWithProgress = Achievement & {
  userAchievement?: UserAchievement;
  progress?: number;
};

const ACHIEVEMENT_ICONS = {
  tasks: Timer,
  documents: FileText,
  collaboration: Users,
  communication: MessageSquare,
  uploads: Upload,
  general: Star,
} as const;

export function AchievementBadges() {
  const { data: achievements, isLoading } = useQuery<AchievementWithProgress[]>({
    queryKey: ["/api/achievements"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockedAchievements = achievements?.filter(
    (a) => a.userAchievement
  ) || [];
  const inProgressAchievements = achievements?.filter(
    (a) => !a.userAchievement && a.progress && a.progress > 0
  ) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-6">
            {unlockedAchievements.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Unlocked</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {unlockedAchievements.map((achievement) => {
                    const Icon = ACHIEVEMENT_ICONS[achievement.category as keyof typeof ACHIEVEMENT_ICONS] || Star;
                    return (
                      <TooltipProvider key={achievement.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center p-4 bg-accent rounded-lg cursor-help">
                              <div className="relative">
                                <Icon className="h-8 w-8 text-primary mb-2" />
                                <CheckCircle2 className="h-4 w-4 text-green-500 absolute -top-1 -right-1" />
                              </div>
                              <span className="text-sm font-medium text-center">
                                {achievement.name}
                              </span>
                              <span className="text-xs text-muted-foreground mt-1">
                                {achievement.userAchievement &&
                                  format(new Date(achievement.userAchievement.unlockedAt), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{achievement.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}

            {inProgressAchievements.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">In Progress</h3>
                <div className="space-y-4">
                  {inProgressAchievements.map((achievement) => {
                    const Icon = ACHIEVEMENT_ICONS[achievement.category as keyof typeof ACHIEVEMENT_ICONS] || Star;
                    return (
                      <div key={achievement.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {achievement.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress value={achievement.progress} className="flex-1" />
                          <span className="text-sm text-muted-foreground">
                            {achievement.progress}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {unlockedAchievements.length === 0 && inProgressAchievements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No achievements yet. Keep working to unlock badges!
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
