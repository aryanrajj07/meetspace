// Assuming these are missing from generated API, we will just show a UI skeleton for recordings
import { FolderClock, Play, Clock, Calendar, Download, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Recordings() {
  // TODO: Use useListRecordings when available
  const isLoading = false;
  const recordings: any[] = [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recordings</h1>
        <p className="text-muted-foreground mt-2">Access your past meeting recordings.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted rounded-xl"></div>
          ))}
        </div>
      ) : recordings.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FolderClock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No recordings found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            You haven't recorded any meetings yet. Start a meeting and hit the record button to see it here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <Card key={recording.id} className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors group">
              <div className="aspect-video bg-muted/30 relative flex items-center justify-center group-hover:bg-muted/50 transition-colors">
                <Play className="w-12 h-12 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-4">
                <h3 className="font-bold truncate mb-2">{recording.meetingTitle}</h3>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(recording.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(recording.duration / 60)}m {recording.duration % 60}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
