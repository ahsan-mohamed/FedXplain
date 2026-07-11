// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { authService } from "@/services/authService";
import type { UserLoginPayload, UserRegisterPayload, Role } from "@/types/api";

interface DecodedToken {
  sub: string; // email
  role: Role;
  exp: number;
}

interface AuthState {
  email: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: UserLoginPayload) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (payload: UserRegisterPayload) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function decodeCurrentToken(): { email: string; role: Role } | null {
  const token = localStorage.getItem("fedxplain_access_token");
  if (!token) return null;
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) return null;
    return { email: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const decoded = decodeCurrentToken();
    if (decoded) {
      setEmail(decoded.email);
      setRole(decoded.role);
    }
    setIsLoading(false);
  }, []);

  async function login(payload: UserLoginPayload) {
    await authService.login(payload);
    const decoded = decodeCurrentToken();
    if (decoded) {
      setEmail(decoded.email);
      setRole(decoded.role);
    }
  }

  async function loginDemo() {
    await authService.loginDemo();
    const decoded = decodeCurrentToken();
    if (decoded) {
      setEmail(decoded.email);
      setRole(decoded.role);
    }
  }

  async function register(payload: UserRegisterPayload) {
    await authService.register(payload);
  }

  function logout() {
    authService.logout();
    setEmail(null);
    setRole(null);
  }

  function hasRole(...roles: Role[]) {
    return role !== null && roles.includes(role);
  }

  return (
    <AuthContext.Provider
      value={{ email, role, isAuthenticated: !!email, isLoading, login, loginDemo, register, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
