'use client';

import { useEffect } from 'react';

export default function ClientEnvTest() {
  useEffect(() => {
    console.log('🔍 Client-side environment variable check:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'EXISTS' : 'MISSING');
    console.log('NEXT_PUBLIC_SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'EXISTS' : 'MISSING');
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('NEXT_PUBLIC_SUPABASE_URL starts with:', process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20));
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_KEY) {
      console.log('NEXT_PUBLIC_SUPABASE_KEY starts with:', process.env.NEXT_PUBLIC_SUPABASE_KEY.substring(0, 10));
    }
  }, []);

  return (
    <div className="p-4 border rounded bg-gray-50 text-sm">
      <h3 className="font-bold mb-2">Client-Side Environment Variables</h3>
      <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ EXISTS' : '❌ MISSING'}</p>
      <p>NEXT_PUBLIC_SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_KEY ? '✅ EXISTS' : '❌ MISSING'}</p>
      <p className="text-xs text-gray-600 mt-2">Check browser console for detailed logs</p>
    </div>
  );
} 