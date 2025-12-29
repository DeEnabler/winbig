// src/app/api/auth/callback/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(
      new URL('/?auth_error=no_code', request.url)
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.redirect(
      new URL('/?auth_error=config_error', request.url)
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(exchangeError.message)}`, request.url)
      );
    }

    if (!data.user) {
      console.error('No user returned from code exchange');
      return NextResponse.redirect(
        new URL('/?auth_error=no_user', request.url)
      );
    }

    const user = data.user;
    const xUserData = user.user_metadata;
    const xUserId = xUserData?.provider_id || xUserData?.sub || user.id;
    const xUsername = xUserData?.user_name || xUserData?.preferred_username || '';
    const xAvatar = xUserData?.avatar_url || xUserData?.picture || null;
    const xName = xUserData?.full_name || xUserData?.name || null;

    console.log('X user authenticated:', { xUserId, xUsername, xName });

    // Try to upsert user profile
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          x_user_id: xUserId,
          x_username: xUsername,
          x_avatar: xAvatar,
          x_name: xName,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'x_user_id',
        }
      );

    if (upsertError) {
      // Log but don't fail - the profile might be created on the client side
      console.error('Error upserting user profile:', upsertError);
    }

    // Successful authentication - redirect to home with success indicator
    const response = NextResponse.redirect(new URL('/?auth_success=true', request.url));

    // Set cookies for the session
    // Note: Supabase handles session cookies automatically when using the browser client
    // This server-side callback just needs to redirect back to the app

    return response;
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
    return NextResponse.redirect(
      new URL('/?auth_error=unexpected_error', request.url)
    );
  }
}