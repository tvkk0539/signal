import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { email: string; role: string; id: string } | null;
  isAuthenticated: boolean;
  login: (token: string, user: { email: string; role: string; id: string }) => void;
  logout: () => void;
}

// Check local storage for existing session on boot
const savedToken = localStorage.getItem('swarm_auth_token');
let initialUser = null;
let initialAuth = false;

if (savedToken) {
  try {
    // Basic decode of JWT payload (not verification, verification happens on server)
    const payload = JSON.parse(atob(savedToken.split('.')[1]));
    // Check if token is expired
    if (payload.exp * 1000 > Date.now()) {
      initialUser = { email: payload.email, role: payload.role, id: payload.id };
      initialAuth = true;
    } else {
      localStorage.removeItem('swarm_auth_token');
    }
  } catch (e) {
    localStorage.removeItem('swarm_auth_token');
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: initialAuth ? savedToken : null,
  user: initialUser,
  isAuthenticated: initialAuth,
  login: (token, user) => {
    localStorage.setItem('swarm_auth_token', token);
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('swarm_auth_token');
    set({ token: null, user: null, isAuthenticated: false });
  }
}));