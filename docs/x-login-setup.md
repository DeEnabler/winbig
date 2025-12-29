# X (Twitter) Login Setup Guide

This guide walks you through setting up X (Twitter) login for the WinBig app.

## 1. Supabase Dashboard Configuration

### Enable Twitter Provider

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Providers**
3. Find **Twitter** in the list and click to expand
4. Toggle **Enable Sign in with Twitter** to ON
5. You'll need to add your Twitter/X API credentials here

### Add Your Twitter API Credentials

In the Supabase Twitter provider settings, add:

- **Client ID**: Your X API Client ID (OAuth 2.0)
- **Client Secret**: Your X API Client Secret (OAuth 2.0)

## 2. X Developer Portal Configuration

### Configure OAuth 2.0

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Navigate to **Projects & Apps → Select your app**
3. Click **User authentication settings → Edit**
4. Configure:
   - **App permissions**: "Read and write" (needed for posting tweets)
   - **Type of App**: "Web App, Automated App or Bot"
   - **Callback URL**: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - **Website URL**: `https://www.winbig.fun`
5. Save changes

### Your API Credentials

Based on the credentials you provided:

```
API Key: 61xrqULt77DntAuOlIeFkkdL0
API Key Secret: qHRux1PTtFSXTygFFTE12V3KNEw6TEUFk1o1Xe21C1TefW26wn
Bearer Token: AAAAAAAAAAAAAAAAAAAAAKKq2QEAAAAADnbB7vygLXChZtx76Y16AhDZQxk%3DabvkaB8yGwwEdtR1hmil0GvAy0HS9ANygWYi6NBKgJ7l3u5Ag7
Access Token: 1658226213108740097-DgPymujLpC2CqHqIZApnVNHFj2KraN
Access Token Secret: MzFV5ZgrGKjneBl7vHOQ2TnNwqeJvO383OjDH3f60gKTn
```

⚠️ **IMPORTANT**: 
- Add these to Supabase, NOT to your codebase
- Regenerate these credentials immediately after setup (they've been shared)
- Never commit credentials to version control

## 3. Run the Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```sql
-- Copy contents from docs/migration-user-profiles.sql
```

Or run directly in Supabase:
1. Go to **SQL Editor** in your Supabase dashboard
2. Paste the contents of `docs/migration-user-profiles.sql`
3. Click **Run**

## 4. Environment Variables

Ensure these environment variables are set (you likely already have them):

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
```

## 5. Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to the app
3. Click the "Connect X" button in the navbar
4. You should be redirected to X for authentication
5. After authenticating, you'll be redirected back with your X profile connected

## Architecture

The X login system works alongside the existing wallet connection:

```
┌─────────────────────────────────────────────────────────┐
│                     User Identity                        │
├──────────────────────┬──────────────────────────────────┤
│   Wallet Layer       │        Social Layer               │
│   (Transactions)     │        (Sharing/Rewards)          │
├──────────────────────┼──────────────────────────────────┤
│ • Connect Wallet     │ • Connect X                       │
│ • Place Bets         │ • Share Bets                      │
│ • On-chain Actions   │ • Earn Rewards                    │
└──────────────────────┴──────────────────────────────────┘
                        │
                        ▼
              Optional: Link Accounts
              (Unified Profile in user_profiles table)
```

## Files Created

- `src/lib/supabase-auth.ts` - Auth helper functions
- `src/components/wallet/ConnectXButton.tsx` - X login button
- `src/app/api/auth/callback/route.ts` - OAuth callback handler
- `src/contexts/UserContext.tsx` - Combined user state
- `docs/migration-user-profiles.sql` - Database migration

## Files Modified

- `src/app/layout.tsx` - Added UserProvider
- `src/components/layout/Navbar.tsx` - Added ConnectXButton