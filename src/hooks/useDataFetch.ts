// src/hooks/useDataFetch.ts
'use client';

import { useState } from 'react';

interface FetchResult<T> {
  data: T | null;
  error: Error | null;
}

// This is a simplified cache. In a real app, you might use SWR, React Query, or context.
const cache = new Map<string, any>();

export default function useDataFetch<T>(url: string): FetchResult<T> {
  const [data, setData] = useState<T | null>(cache.get(url) || null);
  const [error, setError] = useState<Error | null>(null);

  if (cache.has(url) && data === null) {
    // If cache has it, and data is null, it means we've set it from cache
    // and if it was truly null in cache, this is fine.
    // Or if data was already set by cache.get(url) above.
  } else if (data === null && !error) {
    // Data not in memory state, not in cache (or cache miss), and no error yet.
    // This is where Suspense kicks in.
    throw new Promise<void>((resolve, reject) => {
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(fetchedData => {
          if (fetchedData.success === false) { // Handle backend's structured error
            console.error(`API Error in useDataFetch for ${url}:`, fetchedData.message || fetchedData.error);
            const apiError = new Error(fetchedData.message || fetchedData.error || 'API returned success:false');
            setError(apiError);
            // Do not cache errors in this simple version, let it retry on next render attempt
            // Or cache with an error marker if you want to avoid re-throwing promise
          } else {
            cache.set(url, fetchedData);
            setData(fetchedData);
          }
        })
        .catch(fetchError => {
          console.error(`Network/Fetch Error in useDataFetch for ${url}:`, fetchError);
          setError(fetchError);
        })
        .finally(() => {
          // Important: resolve the promise thrown to Suspense
          // This tells Suspense that the data fetching attempt (success or fail) has completed.
          // If successful, setData will trigger a re-render and Suspense will try again.
          // If failed, setError will trigger a re-render, and the error can be thrown to ErrorBoundary.
          resolve();
        });
    });
  }

  return { data, error };
}
