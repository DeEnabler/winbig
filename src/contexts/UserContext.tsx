// src/contexts/UserContext.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAccount } from 'wagmi';
import type { User, Session } from '@supabase/supabase-js';
import {
  signInWithX as authSignInWithX,
  signOut as authSignOut,
  getSession,
  getCurrentUser,
  getOrCreateUserProfile,
  linkWalletToProfile,
  getProfileByWallet,
  onAuthStateChange,
  type XUserProfile,
} from '@/lib/supabase-auth';
import { toast } from 'sonner';

interface UserContextType {
  // Wallet state (from wagmi)
  walletAddress: string | null;
  isWalletConnected: boolean;

  // X (Twitter) state
  xUser: User | null;
  xSession: Session | null;
  xProfile: XUserProfile | null;
  isXConnected: boolean;
  isXLoading: boolean;

  // Combined state
  isLinked: boolean; // Whether wallet and X are linked

  // Actions
  signInWithX: () => Promise<void>;
  signOutX: () => Promise<void>;
  linkWallet: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // Wallet state from wagmi
  const { address, isConnected: isWalletConnected } = useAccount();

  // X (Twitter) state
  const [xUser, setXUser] = useState<User | null>(null);
  const [xSession, setXSession] = useState<Session | null>(null);
  const [xProfile, setXProfile] = useState<XUserProfile | null>(null);
  const [isXLoading, setIsXLoading] = useState(true);

  // Derived state
  const walletAddress = address || null;
  const isXConnected = !!xUser && !!xSession;
  const isLinked = !!(xProfile?.wallet_address && xProfile.wallet_address === walletAddress);

  // Fetch user profile
  const fetchProfile = useCallback(async (user: User) => {
    try {
      const { profile, error } = await getOrCreateUserProfile(user);
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      setXProfile(profile);
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsXLoading(true);
      try {
        const { session } = await getSession();
        if (session) {
          setXSession(session);
          const { user } = await getCurrentUser();
          if (user) {
            setXUser(user);
            await fetchProfile(user);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsXLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { unsubscribe } = onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setXSession(session);

      if (event === 'SIGNED_IN' && session?.user) {
        setXUser(session.user);
        await fetchProfile(session.user);
        toast.success('Connected to X successfully!');
      } else if (event === 'SIGNED_OUT') {
        setXUser(null);
        setXProfile(null);
        toast.info('Disconnected from X');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchProfile]);

  // Check if wallet is linked when wallet changes
  useEffect(() => {
    const checkWalletLink = async () => {
      if (walletAddress && !xProfile) {
        // Check if this wallet has a linked profile
        const { profile } = await getProfileByWallet(walletAddress);
        if (profile) {
          // If we find a profile but user isn't logged in with X,
          // we don't set it - they need to log in with X to access it
          console.log('Found profile linked to wallet:', profile.x_username);
        }
      }
    };

    checkWalletLink();
  }, [walletAddress, xProfile]);

  // Sign in with X
  const signInWithX = useCallback(async () => {
    setIsXLoading(true);
    try {
      const { error } = await authSignInWithX();
      if (error) {
        toast.error(`Failed to connect X: ${error.message}`);
      }
      // Don't setIsXLoading(false) here - the redirect will handle it
    } catch (err) {
      console.error('Error signing in with X:', err);
      toast.error('Failed to connect X');
      setIsXLoading(false);
    }
  }, []);

  // Sign out from X
  const signOutX = useCallback(async () => {
    try {
      const { error } = await authSignOut();
      if (error) {
        toast.error(`Failed to disconnect X: ${error.message}`);
        return;
      }
      setXUser(null);
      setXSession(null);
      setXProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
      toast.error('Failed to disconnect X');
    }
  }, []);

  // Link wallet to X profile
  const linkWallet = useCallback(async () => {
    if (!xProfile || !walletAddress) {
      toast.error('Please connect both X and your wallet first');
      return;
    }

    if (xProfile.wallet_address && xProfile.wallet_address !== walletAddress) {
      toast.error('This X account is already linked to a different wallet');
      return;
    }

    try {
      const { profile, error } = await linkWalletToProfile(xProfile.id, walletAddress);
      if (error) {
        toast.error(`Failed to link wallet: ${error.message}`);
        return;
      }
      setXProfile(profile);
      toast.success('Wallet linked to X account!');
    } catch (err) {
      console.error('Error linking wallet:', err);
      toast.error('Failed to link wallet');
    }
  }, [xProfile, walletAddress]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (xUser) {
      await fetchProfile(xUser);
    }
  }, [xUser, fetchProfile]);

  const value: UserContextType = {
    walletAddress,
    isWalletConnected,
    xUser,
    xSession,
    xProfile,
    isXConnected,
    isXLoading,
    isLinked,
    signInWithX,
    signOutX,
    linkWallet,
    refreshProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
