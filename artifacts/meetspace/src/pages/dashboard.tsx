import { Link, useLocation } from "wouter";
import { useListMeetings, getListMeetingsQueryKey, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Calendar,
  Clock,
  Plus,
  Users,
} from "lucide-react";
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
  totalDuration:
    meetings?.reduce((sum, m) => sum + (m.duration || 0), 0) || 0,

  upcomingCount:
    meetings?.filter(m => m.status === "scheduled").length || 0,

  hostedCount:
    meetings?.filter(m => m.hostId === user?.id).length || 0,

  activeCount:
    meetings?.filter(m => m.status === "active").length || 0,

  totalParticipants:
    meetings?.reduce(
      (sum, m) => sum + (m.participants?.length || 0),
      0
    ) || 0,

  averageDuration:
    meetings && meetings.length
      ? Math.floor(
          meetings.reduce((sum, m) => sum + (m.duration || 0), 0) /
            meetings.length /
            60
        )
      : 0,
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
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}
        </p>
      </div>

      <Button
        onClick={() => setLocation("/meetings/new")}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        New Meeting
      </Button>
    </div>

    {/* Stats */}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card className="p-6">
    <h3>Total Meetings</h3>
    <p className="text-3xl font-bold">{stats.totalMeetings}</p>
  </Card>

  <Card className="p-6">
    <h3>Upcoming</h3>
    <p className="text-3xl font-bold">{stats.upcomingCount}</p>
  </Card>

  <Card className="p-6">
    <h3>Hours</h3>
    <p className="text-3xl font-bold">
      {Math.floor(stats.totalDuration / 3600)}
    </p>
  </Card>

  <Card className="p-6">
    <h3>Hosted</h3>
    <p className="text-3xl font-bold">{stats.hostedCount}</p>
  </Card>
</div>
    {/* Meetings */}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      <div>

        <h2 className="text-2xl font-bold mb-4">
          Upcoming Meetings
        </h2>

        {isLoading ? (
          <p>Loading...</p>
        ) : upcomingMeetings.length === 0 ? (
          <Card className="p-8 text-center">
            No upcoming meetings scheduled.
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-bold">
                    {meeting.title}
                  </h3>

                  <p className="text-sm text-muted-foreground">

                    {meeting.scheduledAt
                      ? format(
                          new Date(meeting.scheduledAt),
                          "MMM d, yyyy h:mm a"
                        )
                      : "Not scheduled"}

                  </p>
                </div>

                <Button
                  onClick={() =>
                    setLocation(`/room/${meeting.roomCode}`)
                  }
                >
                  Join
                </Button>
              </Card>
            ))}
          </div>
        )}

      </div>

      <div>

        <Input
          placeholder="Search meetings..."
          className="mb-4"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <h2 className="text-2xl font-bold mb-4">
          Recent Meetings
        </h2>

        {isLoading ? (
          <p>Loading...</p>
        ) : recentMeetings.length === 0 ? (
          <Card className="p-8 text-center">
            No recent meetings.
          </Card>
        ) : (
          <div className="space-y-4">

            {recentMeetings.map((meeting) => (

              <Card
                key={meeting.id}
                className="p-4"
              >

                <h3 className="font-bold">
                  {meeting.title}
                </h3>

                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">

                  <span>
                    {format(
                      new Date(meeting.createdAt),
                      "MMM d, yyyy"
                    )}
                  </span>

                  <span>
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
