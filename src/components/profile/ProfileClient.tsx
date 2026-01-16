// src/components/profile/ProfileClient.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import ProfileHeader from './ProfileHeader';
import ProfileStats from './ProfileStats';
import ProfileTabs from './ProfileTabs';
import type { ProfileData } from '@/app/api/profile/[identifier]/route';
import type { OpenPosition } from '@/types';

interface ProfileClientProps {
  initialData: ProfileData | null;
  initialError?: string | null;
  identifier: string;
}

// Fetch positions for the profile
const fetchPositions = async (walletAddress: string): Promise<{ activePositions: OpenPosition[]; pastPositions: OpenPosition[] }> => {
  const response = await fetch(`/api/positions?user_id=${walletAddress}`);
  if (!response.ok) {
    throw new Error('Failed to fetch positions');
  }
  const data = await response.json();
  
  // Convert date strings back to Date objects
  const toDate = (p: OpenPosition) => ({ ...p, endsAt: new Date(p.endsAt) });
  return {
    activePositions: data.activePositions.map(toDate),
    pastPositions: data.pastPositions.map(toDate),
  };
};

// Fetch profile data
const fetchProfile = async (identifier: string): Promise<ProfileData> => {
  const response = await fetch(`/api/profile/${encodeURIComponent(identifier)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch profile');
  }
  return result.data;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />
          <div className="flex-1 space-y-3 text-center md:text-left">
            <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-5 w-32 mx-auto md:mx-0" />
            <Skeleton className="h-8 w-56 mx-auto md:mx-0" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="bg-destructive/10 border-destructive/30">
      <CardContent className="py-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function NotFoundState() {
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <span className="text-3xl">👤</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This user doesn&apos;t exist or hasn&apos;t connected their account yet.
        </p>
      </CardContent>
    </Card>
  );
}

export default function ProfileClient({ initialData, initialError, identifier }: ProfileClientProps) {
  const { address: currentUserAddress } = useAccount();

  // Fetch profile data with React Query (using initial data if available)
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ['profile', identifier],
    queryFn: () => fetchProfile(identifier),
    initialData: initialData || undefined,
    enabled: !initialData, // Only fetch if no initial data
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Fetch positions when we have a wallet address
  const walletAddress = profileData?.walletAddress;
  const {
    data: positions,
    isLoading: isLoadingPositions,
  } = useQuery({
    queryKey: ['positions', walletAddress],
    queryFn: () => fetchPositions(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Check if this is the current user's own profile
  const isOwnProfile = !!(
    currentUserAddress &&
    walletAddress &&
    currentUserAddress.toLowerCase() === walletAddress.toLowerCase()
  );

  // Loading state
  if (isLoadingProfile && !profileData) {
    return (
      <div className="container mx-auto py-6 md:py-10 max-w-5xl">
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (initialError || profileError) {
    return (
      <div className="container mx-auto py-6 md:py-10 max-w-5xl">
        <ErrorState message={initialError || (profileError as Error)?.message || 'Failed to load profile'} />
      </div>
    );
  }

  // Not found state
  if (!profileData) {
    return (
      <div className="container mx-auto py-6 md:py-10 max-w-5xl">
        <NotFoundState />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 md:py-10 max-w-5xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          profile={profileData.profile}
          walletAddress={profileData.walletAddress}
          isVerified={profileData.isVerified}
          isOwnProfile={isOwnProfile}
        />

        {/* Stats Bar */}
        <ProfileStats data={profileData} />

        {/* Tabbed Content */}
        <ProfileTabs
          data={profileData}
          positions={positions || null}
          isLoadingPositions={isLoadingPositions}
        />
      </div>
    </div>
  );
}
