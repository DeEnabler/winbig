# 🤖 Execution Bot Migration Guide
## Critical Economic Flow Update

**Date:** Jan 9, 2026
**Priority:** CRITICAL (Immediate Action Required)

### 🚨 The Problem
We have introduced a **3% Platform Fee** to ensure profitability.
*   **Old Flow:** User bets $100 $\rightarrow$ Bot executes $100 on Polymarket. (Platform Margin = $0 - Gas)
*   **New Flow:** User bets $100 $\rightarrow$ `net_to_market` is $97. Bot **must** execute only $97.

If the bot continues to use the `amount` column (Gross Wager), **the platform will lose 3% on every trade** (paying the fee out of pocket).

### 🛠️ Required Code Changes (`app.py`)

You need to update how the trade amount is extracted in the `handle_bet_event` function.

#### 1. Locate the Extraction Logic
Look for where `amount` is retrieved from the Supabase record (approx line 568).

**Current Code:**
```python
amount = record.get('amount', 0)
```

#### 2. Replace with Net Amount Logic
Change it to prioritize `net_to_market`.

**New Code:**
```python
# CRITICAL: Use net_to_market to ensure platform fees are retained
# Fallback to amount ONLY if net_to_market is missing (legacy support), 
# but log a warning as this implies 0% fee.
gross_amount = record.get('amount', 0)
net_amount = record.get('net_to_market')

if net_amount is not None and net_amount > 0:
    amount = net_amount
    print(f"💰 Using Net Amount for Execution: ${amount} (Gross: ${gross_amount})")
else:
    amount = gross_amount
    print(f"⚠️ WARNING: No net_to_market found. Executing full gross amount: ${amount}")
```

### ✅ Compatibility Checklist

The web platform has been updated to support the bot's feedback loop. The `bets` table includes all columns the bot currently writes to:

| Bot Column Expectation | Status | Type | Notes |
| :--- | :--- | :--- | :--- |
| `status` | ✅ Ready | text | 'executed' / 'failed' |
| `execution_price` | ✅ Ready | numeric | Avg price per share |
| `shares_received` | ✅ Ready | numeric | Total shares |
| `execution_timestamp` | ✅ Ready | timestamptz | ISO String |
| `tx_hash` | ✅ Ready | text | Transaction ID |
| `order_id` | ✅ Ready | text | Polymarket Order ID |
| `gas_fee_pol` | ✅ Ready | numeric | Gas cost in POL |
| `gas_fee_usd` | ✅ Ready | numeric | Gas cost in USD |
| `error_message` | ✅ Ready | text | For failed trades |

### 🧪 Verification
After applying this patch:
1.  Place a **$10** bet on the frontend.
2.  Verify in Supabase that `gross_amount` is **10** and `net_to_market` is **9.7** (approx).
3.  Check the bot logs. It should say: `💰 Using Net Amount for Execution: $9.7`.
4.  Verify on Polymarket that the order size was **$9.70**.
