import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 Server-side environment variable check:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'EXISTS' : 'MISSING');
  console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'EXISTS' : 'MISSING');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'EXISTS' : 'MISSING');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING');
  
  // Also check Vercel environment indicators
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV || 'NOT_SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT_SET');

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      vercel_env: process.env.VERCEL_ENV || 'not_set',
      node_env: process.env.NODE_ENV || 'not_set',
    },
    server_side_vars: {
      supabase_url: process.env.SUPABASE_URL ? 'exists' : 'missing',
      supabase_key: process.env.SUPABASE_KEY ? 'exists' : 'missing',
    },
    client_side_vars: {
      next_public_supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing',
      next_public_supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'exists' : 'missing',
    },
    // Show first few characters for verification (but not full values for security)
    partial_values: {
      supabase_url_start: process.env.SUPABASE_URL?.substring(0, 20) || 'missing',
      supabase_key_start: process.env.SUPABASE_KEY?.substring(0, 10) || 'missing',
      next_public_url_start: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) || 'missing',
      next_public_key_start: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) || 'missing',
    }
  });
} 