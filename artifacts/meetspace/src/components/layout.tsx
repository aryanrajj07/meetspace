import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Video, FolderClock, User, LogOut } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/recordings", label: "Recordings", icon: FolderClock },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-500" />
            MeetSpace
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
