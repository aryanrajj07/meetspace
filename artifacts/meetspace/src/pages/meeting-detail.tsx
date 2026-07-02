import { useRoute, useLocation } from "wouter";
import { useGetMeeting } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Clock, Users, FileText, Settings, Link as LinkIcon, Download } from "lucide-react";
import { format } from "date-fns";

export default function MeetingDetail() {
  const [, params] = useRoute("/meetings/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();

  const { data: meeting, isLoading } = useGetMeeting(id || "", { 
    query: { enabled: !!id, queryKey: ['getMeeting', id] } 
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded-xl"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Meeting not found.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              meeting.status === 'active' ? 'bg-green-500/20 text-green-500' :
              meeting.status === 'ended' ? 'bg-muted text-muted-foreground' :
              'bg-blue-500/20 text-blue-500'
            }`}>
              {meeting.status.toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
        </div>
        {meeting.status !== 'ended' && (
          <Button onClick={() => setLocation(`/room/${meeting.roomCode}`)} size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Video className="w-5 h-5" />
            Join Meeting
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold mb-4">Meeting Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-5 h-5" />
                <span>{meeting.scheduledAt ? format(new Date(meeting.scheduledAt), "EEEE, MMMM d, yyyy") : 'No date scheduled'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>
                  {meeting.scheduledAt ? format(new Date(meeting.scheduledAt), "h:mm a") : 'No time scheduled'} 
                  {meeting.duration ? ` (${Math.floor(meeting.duration / 60)}m)` : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Users className="w-5 h-5" />
                <span>Hosted by {meeting.hostName || 'Unknown'}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-border/50">
                <p className="text-sm font-medium mb-2">Invite Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted p-2 rounded-md text-sm font-mono truncate flex items-center">
                    {window.location.origin}/room/{meeting.roomCode}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/room/${meeting.roomCode}`);
                  }}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {meeting.summary && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                AI Summary
              </h2>
              <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground">
                {meeting.summary}
              </div>
            </Card>
          )}

          {meeting.recordingUrl && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4">Recording</h2>
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                <video src={meeting.recordingUrl} controls className="w-full h-full" />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download MP4
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold mb-4">Participants ({meeting.participants?.length || 0})</h2>
            <div className="space-y-3">
              {meeting.participants?.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {format(new Date(p.joinedAt), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              {(!meeting.participants || meeting.participants.length === 0) && (
                <p className="text-sm text-muted-foreground">No participants yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
