import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { User, Mail, Calendar, Video } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded"></div>
        <div className="h-[200px] bg-muted rounded-xl"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your personal information.</p>
      </div>

      <Card className="p-8 max-w-2xl bg-card border-border shadow-xl rounded-xl">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-3xl font-bold">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          
          <div className="space-y-4 flex-1">
            <div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <User className="w-4 h-4" />
                  Account ID
                </p>
                <p className="font-mono text-sm">{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" />
                  Member Since
                </p>
                <p className="font-medium">{format(new Date(user.createdAt), "MMMM d, yyyy")}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
