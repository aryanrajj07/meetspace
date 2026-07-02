import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

// Auth Context
import { AuthProvider, useAuth } from "@/hooks/use-auth";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import NewMeeting from "@/pages/meetings-new";
import MeetingDetail from "@/pages/meeting-detail";
import Room from "@/pages/room";
import Recordings from "@/pages/recordings";
import Profile from "@/pages/profile";

// Layout
import { AppLayout } from "@/components/layout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

// Room needs its own layout (fullscreen, no sidebar)
function RoomRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/room/:roomCode" component={() => <RoomRoute component={Room} />} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/meetings/new" component={() => <ProtectedRoute component={NewMeeting} />} />
      <Route path="/meetings/:id" component={() => <ProtectedRoute component={MeetingDetail} />} />
      <Route path="/recordings" component={() => <ProtectedRoute component={Recordings} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
