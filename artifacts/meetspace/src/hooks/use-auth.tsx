import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("meetspace_token");
  });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("meetspace_token", newToken);
    } else {
      localStorage.removeItem("meetspace_token");
    }
    setTokenState(newToken);
  };

  const logout = () => {
    setToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ token, setToken, isAuthenticated: !!token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}  