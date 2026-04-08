# Telegram Bot Setup for WinBig Legend Bets

## Step 1: Create the Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. **Name:** `WinBig Legend Bets Bot`
4. **Username:** `WinBigLegendBot` (must be unique, add numbers if taken)
5. Copy the **bot token** — you'll need it for `.env` as `TELEGRAM_BOT_TOKEN`

## Step 2: Create the Group

1. Create a new Telegram **group** (not channel): "WinBig Legend Bets"
2. Set it as a **public group** with the link `t.me/WinBigLegendBets`
3. Add the bot to the group
4. **Promote the bot to admin** with permissions:
   - Post messages
   - Pin messages
   - Delete messages
   - Manage group (optional, for anti-spam)

## Step 3: Get the Group ID

1. Add `@userinfobot` to the group temporarily
2. It will show the group's numeric ID (starts with `-100`)
3. Copy that as `TELEGRAM_GROUP_ID` in `.env`
4. Remove `@userinfobot` from the group

## Step 4: Configure the Bot

Set the bot description and about text via BotFather:

```
/setdescription
WinBig Legend Bets — Exclusive prediction market wins, signals, and community. 18+

/setabouttext
Your VIP gateway to WinBig prediction markets. Real wins. Real data. Join the Legends. 🔥

/setuserpic
(Upload the WinBig logo)
```

## Step 5: Group Settings

- **Slow mode:** Off (the bot manages posting cadence)
- **Permissions:** Allow members to send messages, media, links
- **Anti-spam:** Enable Telegram's built-in anti-spam for groups >200 members
- **Pinned message:** The bot will automatically pin daily reports

## Step 6: Verify

1. Ensure `.env` has:
   - `TELEGRAM_BOT_TOKEN=<your token>`
   - `TELEGRAM_GROUP_ID=<your group id>`
   - `TELEGRAM_GROUP_URL=https://t.me/WinBigLegendBets`
2. Restart the stack: `docker compose restart openclaw`
3. The bot should post its first message within the next scheduled window
