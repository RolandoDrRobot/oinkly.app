import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = storage.getUser();
    const loggedIn = storage.isLoggedIn();
    
    if (storedUser && loggedIn) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (email: string, name: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name,
    };
    storage.setUser(newUser);
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    storage.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
