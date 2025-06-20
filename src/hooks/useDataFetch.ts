// src/hooks/useDataFetch.ts
'use client';

// This hook is no longer used for the initial page load on the homepage,
// as data is now fetched on the server. However, it's kept here as it might
// be useful for other client-side data fetching needs or for pagination/client-side updates.
// The logic is sound for a client-side Suspense fetch hook.

import { useState } from 'react';

interface FetchResult<T> {
  data: T | null;
  error: Error | null;
}

// This is a simplified cache. In a real app, you might use SWR, React Query, or context.
const cache = new Map<string, any>();

export default function useDataFetch<T>(relativePath: string): FetchResult<T> {
  const [data, setData] = useState<T | null>(cache.get(relativePath) || null);
  const [error, setError] = useState<Error | null>(null);

  if (error) { // If an error was already set (e.g., from a previous failed attempt or URL construction)
    return { data: null, error };
  }

  if (cache.has(relativePath) && data === null) {
    // If cache has it, and data is null, it means we've set it from cache
    // and if it was truly null in cache, this is fine.
    // Or if data was already set by cache.get(relativePath) above.
  } else if (data === null && !error) {
    // Data not in memory state, not in cache (or cache miss), and no error yet.
    // This is where Suspense kicks in.
    throw new Promise<void>((resolve, rejectThisPromise) => {
      let absoluteUrl: string;
      try {
        // Construct absolute URL.
        // NEXT_PUBLIC_APP_URL should be set in your .env file.
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) {
          // This is a critical configuration error.
          throw new Error(
            'NEXT_PUBLIC_APP_URL is not defined. Cannot make API calls.'
          );
        }
        // new URL() constructor requires a base if the first argument is relative.
        absoluteUrl = new URL(relativePath, appUrl).toString();
      } catch (e) {
        console.error("Error constructing absolute URL in useDataFetch:", e, "Relative path:", relativePath);
        const constructionError = e instanceof Error ? e : new Error("Failed to construct absolute URL for fetch");
        setError(constructionError); // Set error state
        resolve(); // Resolve the promise to allow Suspense to show error or component to re-render with error
        return; // Stop further execution of the promise callback
      }

      fetch(absoluteUrl)
        .then(response => {
          if (!response.ok) {
            // Attempt to get more details from the response body for non-JSON errors
            return response.text().then(text => {
              let errorMsg = `HTTP error! status: ${response.status} for URL: ${absoluteUrl}. Response: ${text.substring(0, 100)}...`;
              if (response.headers.get("Content-Type")?.includes("text/html")) {
                 errorMsg = `API returned HTML, not JSON. Status: ${response.status}. Check API endpoint or Vercel rewrites. Path: ${absoluteUrl}`;
              }
              throw new Error(errorMsg);
            });
          }
          const contentType = response.headers.get("Content-Type");
          if (!contentType || !contentType.includes("application/json")) {
            return response.text().then(text => {
              console.warn(`Expected JSON, got ${contentType} from ${absoluteUrl}. Body: ${text.substring(0,200)}...`);
              throw new Error(
                `Expected application/json, but received ${contentType} from API. Path: ${absoluteUrl}`
              );
            });
          }
          return response.json();
        })
        .then(fetchedData => {
          if (fetchedData && fetchedData.success === false) {
            // Handle backend's structured error (e.g., { success: false, message: "..." })
            const apiError = new Error(fetchedData.message || fetchedData.error || 'API request failed with success:false');
            console.error(`API Error (success:false) in useDataFetch for ${absoluteUrl}:`, apiError.message);
            setError(apiError);
          } else {
            cache.set(relativePath, fetchedData); // Cache based on the original relativePath
            setData(fetchedData);
          }
        })
        .catch(fetchOrParseError => {
          console.error(`Fetch/Parse Error in useDataFetch for ${absoluteUrl}:`, fetchOrParseError);
          setError(fetchOrParseError);
        })
        .finally(() => {
          // Important: resolve the promise thrown to Suspense
          // This tells Suspense that the data fetching attempt (success or fail) has completed.
          resolve();
        });
    });
  }

  return { data, error };
}
