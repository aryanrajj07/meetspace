import { Link, useLocation } from "wouter";
import { useListMeetings, getListMeetingsQueryKey, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Clock, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: meetings, isLoading } = useListMeetings({ query: { queryKey: getListMeetingsQueryKey() } });
  
  // TODO: Use useGetMeetingStats when available
  const stats = {
    totalMeetings: meetings?.length || 0,
    totalDuration: 0,
    upcomingCount: meetings?.filter(m => m.status === 'scheduled').length || 0,
    hostedCount: meetings?.filter(m => m.hostId === user?.id).length || 0,
  }; 

  const [search, setSearch] = useState("");

  const upcomingMeetings = meetings?.filter(m => m.status === 'scheduled') || [];
  const recentMeetings =
  meetings?.filter((m) => {
    const statusMatch = m.status === "ended" || m.status === "active";
    const searchMatch = m.title
      .toLowerCase()
      .includes(search.toLowerCase());

    return statusMatch && searchMatch;
  }) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back, {user?.name}</p>
        </div>
        <Button onClick={() => setLocation("/meetings/new")} size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-5 h-5" />
          New Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Meetings</p>
              <p className="text-2xl font-bold">{stats.totalMeetings}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold">{stats.upcomingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hours in Meetings</p>
              <p className="text-2xl font-bold">{Math.floor(stats.totalDuration / 3600)}h</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hosted</p>
              <p className="text-2xl font-bold">{stats.hostedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Upcoming Meetings</h2>
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          ) : upcomingMeetings.length === 0 ? (
            <Card className="p-8 text-center border-dashed text-muted-foreground">
              No upcoming meetings scheduled.
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingMeetings.map(meeting => (
                <Card key={meeting.id} className="p-4 bg-card border-border flex items-center justify-between hover:border-primary/50 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg"><Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link></h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {meeting.scheduledAt ? format(new Date(meeting.scheduledAt), "MMM d, yyyy h:mm a") : 'Not scheduled'}
                    </p>
                  </div>
                  <Button onClick={() => setLocation(`/room/${meeting.roomCode}`)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Join
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="mb-4">
              <Input
              placeholder="Search meetings..."
             value={search}
              onChange={(e) => setSearch(e.target.value)}
              />
          </div>
          <h2 className="text-xl font-bold">Recent Meetings</h2>
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          ) : recentMeetings.length === 0 ? (
            <Card className="p-8 text-center border-dashed text-muted-foreground">
              No recent meetings.
            </Card>
          ) : (
            <div className="space-y-4">
              {recentMeetings.map(meeting => (
                <Card key={meeting.id} className="p-4 bg-card border-border flex flex-col justify-center hover:border-primary/50 transition-colors">
                  <h3 className="font-bold text-lg"><Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link></h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(meeting.createdAt), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {meeting.participants?.length || 0} participants
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
