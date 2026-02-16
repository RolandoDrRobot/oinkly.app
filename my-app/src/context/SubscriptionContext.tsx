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
  const [subscriptionState, setSubscriptionState] = useState<Subscription | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  // Don't consider "loaded" until we've read subscription for this user — blocks first render until we're sure
  const isLoading = user?.id ? loadedForUserId !== user.id : false;
  const subscription = subscriptionState;

  const loadSubscription = useCallback(() => {
    if (!user?.id) {
      setSubscriptionState(null);
      setLoadedForUserId(null);
      return;
    }
    const sub = storage.getSubscription(user.id);
    setSubscriptionState(sub);
    setLoadedForUserId(user.id);
  }, [user?.id]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // All logged-in users have active subscription (no paywall)
  const isPremium = !!user?.id;

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
      setSubscriptionState(data);
    },
    [user?.id]
  );

  const cancelSubscription = useCallback(() => {
    if (!user?.id) return;
    const data: Subscription = { plan: 'free' };
    storage.setSubscription(user.id, data);
    setSubscriptionState(data);
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
