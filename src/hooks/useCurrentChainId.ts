import { useCallback } from 'react';
import { useWalletClient } from 'wagmi';

export function useCurrentChainId() {
  const { data: walletClient } = useWalletClient();

  const getCurrentChainId = useCallback(async () => {
    if (!walletClient) return null;
    return await walletClient.getChainId();
  }, [walletClient]);

  return getCurrentChainId;
} 