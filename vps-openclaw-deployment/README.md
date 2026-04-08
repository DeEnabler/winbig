# WinBig OpenClaw — Autonomous Campaign Manager

Self-hosted autonomous agent stack that manages the **WinBig Legend Bets** Telegram group and optimizes PropellerAds campaigns with zero manual oversight.

## Architecture

```
┌─────────────────────────────────────────────┐
│                Hostinger VPS                │
│                                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Nginx  │──│ OpenClaw │──│   Redis   │  │
│  │  :80    │  │  :3100   │  │  :6379    │  │
│  └─────────┘  └──────────┘  └───────────┘  │
│                     │                       │
│              master-agent-prompt.md          │
│              (5 autonomous roles)           │
└─────────────────────────────────────────────┘
         │                    │
    Telegram API        WinBig API
    (post wins,        (proof, stats,
     manage group)     campaign events)
```

## Agent Roles

| Role | Schedule | What it does |
|------|----------|-------------|
| **Telegram Poster** | Every 2h | Posts real winning bets to the group |
| **Creative Generator** | Daily 06:00 UTC | Generates 3 new PropellerAds ad variants |
| **Funnel Analyst** | Every 6h | Analyzes campaign_events, calculates CPA |
| **Optimizer** | Daily 12:00 UTC | Pauses bad sub-IDs, scales good ones |
| **Daily Reporter** | Daily 22:00 UTC | Posts daily summary, pins it |

## Quick Start

```bash
# 1. Clone and enter directory
cd vps-openclaw-deployment

# 2. Run setup (installs Docker if needed, creates .env)
chmod +x setup.sh
sudo ./setup.sh

# 3. Edit .env with your credentials
nano .env

# 4. Start the stack
docker compose up -d

# 5. Check logs
docker compose logs -f openclaw
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | For the LLM agent |
| `TELEGRAM_BOT_TOKEN` | Yes | From BotFather |
| `TELEGRAM_GROUP_ID` | Yes | Numeric group ID |
| `SUPABASE_URL` | Yes | For reading campaign events |
| `SUPABASE_KEY` | Yes | Service role key |
| `PROPELLER_ACCOUNT_ID` | Optional | For auto-optimization |
| `PROPELLER_API_KEY` | Optional | For programmatic campaign management |

## Setup Guides

- [Telegram Bot Setup](./telegram-bot-setup.md) — Step-by-step BotFather instructions
- [Anti-Spam Rules](./anti-spam-rules.md) — Posting cadence, compliance, rate limits
- [Master Agent Prompt](./master-agent-prompt.md) — Full autonomous team specification

## Operations

```bash
# View real-time logs
docker compose logs -f

# Restart after config change
docker compose restart openclaw

# Stop everything
docker compose down

# Update OpenClaw image
docker compose pull openclaw && docker compose up -d openclaw
```

## Data

- Agent state: stored in the `openclaw-data` Docker volume
- Redis cache: `winbig:funnel:latest_analysis`, session data
- Daily reports: `/app/data/daily-reports/YYYY-MM-DD.json` inside the container
