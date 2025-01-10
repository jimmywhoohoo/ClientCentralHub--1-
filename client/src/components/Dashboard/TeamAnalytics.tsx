import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/use-websocket";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Loader2 } from "lucide-react";

export function TeamAnalytics() {
  const { teamPerformance, isConnected } = useWebSocket();

  if (!isConnected) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Team Analytics</CardTitle>
          <CardDescription>Connecting to real-time updates...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!teamPerformance) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Team Analytics</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const performanceData = teamPerformance.map((member: any) => ({
    name: member.username,
    Tasks: member.metrics.tasksCompleted,
    'On-Time Rate': member.metrics.onTimeCompletion,
    'Collaboration': member.metrics.collaborationScore,
    'Total Score': member.metrics.totalScore
  }));

  return (
    <>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Team Performance Overview</CardTitle>
          <CardDescription>Real-time performance metrics for all team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Tasks" fill="#8884d8" />
                <Bar dataKey="On-Time Rate" fill="#82ca9d" />
                <Bar dataKey="Collaboration" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Team Performance Trends</CardTitle>
          <CardDescription>Overall performance score trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Total Score" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
