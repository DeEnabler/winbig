# Supabase Environment Variables

## Required Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here
```

## Variable Descriptions

- **Project URL** → Use for `SUPABASE_URL`
- **anon public** key → Use for `SUPABASE_KEY`

## Security Notes

- ✅ **SUPABASE_URL** - Safe to expose to client-side
- ✅ **SUPABASE_KEY** - Safe to expose to client-side (has limited permissions)

## Database Setup

1. **Run the SQL Schema**: Copy and run the SQL from `docs/supabase-schema.sql` in your Supabase SQL Editor
2. **Verify the table**: Check that the `bets` table was created successfully
3. **Test the connection**: The app will automatically test the connection when you place your first bet

## Row Level Security (RLS)

The schema includes RLS policies that:
- Allow users to view and insert their own bets
- Allow the service role to manage all bets (for backend processing)
- Protect sensitive data from unauthorized access

## Testing the Setup

Once you've added the environment variables and run the schema:

1. Start your development server: `npm run dev`
2. Navigate to a match page and try placing a bet
3. Check the browser console for connection logs
4. Verify the bet appears in your Supabase dashboard under the `bets` table

## Troubleshooting

### "Missing Supabase credentials" Error
- Verify your `.env.local` file has the correct variable names
- Restart your development server after adding environment variables
- Check that there are no typos in the environment variable names

### Connection Errors
- Verify your Supabase project URL is correct
- Check that your anon key is valid and copied correctly
- Ensure your Supabase project is not paused

### RLS Permission Errors
- Make sure you ran the complete SQL schema including the RLS policies
- Verify that the policies were created successfully in your Supabase dashboard
- Check that you're using the correct user ID format

## Next Steps

After setting up Supabase:
1. Test placing bets in the application
2. Monitor the `bets` table in your Supabase dashboard
3. Set up real-time subscriptions for bet updates (optional)
4. Implement the backend hedger for automatic bet processing 