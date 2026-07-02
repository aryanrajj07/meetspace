import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateMeeting } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Video, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewMeeting() {
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let combinedDateTime = undefined;
    if (scheduledAt && scheduledTime) {
      combinedDateTime = new Date(`${scheduledAt}T${scheduledTime}`).toISOString();
    }

    createMeeting.mutate(
      { data: { title, scheduledAt: combinedDateTime } },
      {
        onSuccess: (meeting) => {
          if (combinedDateTime) {
            setLocation(`/meetings/${meeting.id}`);
            toast({
              title: "Meeting scheduled",
              description: "Your meeting has been scheduled successfully.",
            });
          } else {
            setLocation(`/room/${meeting.roomCode}`);
          }
        },
        onError: () => {
          toast({
            title: "Failed to create meeting",
            description: "An error occurred. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Meeting</h1>
        <p className="text-muted-foreground mt-2">Start right away or schedule for later.</p>
      </div>

      <Card className="p-8 bg-card border-border rounded-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">Meeting Title</Label>
            <Input 
              id="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Sync, Project Kickoff" 
              required
              className="text-lg py-6 bg-background"
            />
          </div>

          <div className="pt-4 border-t border-border/50">
            <h3 className="text-lg font-semibold mb-4">Schedule (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Date
                </Label>
                <Input 
                  id="date" 
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Time
                </Label>
                <Input 
                  id="time" 
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/")}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 gap-2" disabled={createMeeting.isPending}>
              <Video className="w-4 h-4" />
              {scheduledAt ? "Schedule Meeting" : "Start Meeting Now"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
