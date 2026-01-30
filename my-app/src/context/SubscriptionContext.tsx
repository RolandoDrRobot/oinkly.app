import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { storage } from '../utils/storage';
import type { Subscription } from '../types';

interface SubscriptionContextType {
  subscription: Subscription | null;
  isPremium: boolean;
  isLoading: boolean;
  activatePremium: (interval?: 'monthly' | 'yearly') => Promise<void>;
  cancelSubscription: () => void;
  loadSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscription = useCallback(() => {
    if (!user?.id) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }
    const sub = storage.getSubscription(user.id);
    setSubscription(sub);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const isPremium =
    subscription?.plan === 'premium' &&
    (subscription?.status === 'active' || subscription?.status === 'trialing');

  const activatePremium = useCallback(
    async (interval: 'monthly' | 'yearly' = 'monthly') => {
      if (!user?.id) return;
      const endsAt = new Date();
      if (interval === 'yearly') endsAt.setFullYear(endsAt.getFullYear() + 1);
      else endsAt.setMonth(endsAt.getMonth() + 1);
      const data: Subscription = {
        plan: 'premium',
        status: 'active',
        endsAt: endsAt.toISOString(),
        interval,
      };
      storage.setSubscription(user.id, data);
      setSubscription(data);
    },
    [user?.id]
  );

  const cancelSubscription = useCallback(() => {
    if (!user?.id) return;
    const data: Subscription = { plan: 'free' };
    storage.setSubscription(user.id, data);
    setSubscription(data);
  }, [user?.id]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isPremium,
        isLoading,
        activatePremium,
        cancelSubscription,
        loadSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
