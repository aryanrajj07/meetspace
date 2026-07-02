import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const register = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({ data: { name, email, password } }, {
      onSuccess: (res) => {
        setToken(res.token);
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Registration failed",
          description: "Please check your information and try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 mb-4">
            <Video className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create account</h1>
          <p className="text-muted-foreground">Get started with MeetSpace</p>
        </div>

        <div className="bg-card border border-border p-6 sm:p-8 rounded-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe" 
                required 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com" 
                required 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="bg-background"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={register.isPending}>
              {register.isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
