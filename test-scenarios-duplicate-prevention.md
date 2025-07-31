# Critical Test Scenarios for Duplicate Bet Prevention

## Test Environment Setup
- Use staging environment with the migration applied
- Test with real wallet connection (MetaMask/WalletConnect)
- Use small amounts on testnet (BSC Testnet)

## Scenario 1: Rapid Amount Changes During Transaction
1. Connect wallet to staging app
2. Select a bet choice (YES/NO)
3. Start changing bet amount rapidly (click +/- buttons, drag slider, type in input)
4. While still changing amounts, click "Place Bet"
5. **Continue rapidly changing amounts** while transaction is pending
6. Wait for confirmation

**Expected Result:** Only 1 bet record created with the amount that was captured at transaction send

## Scenario 2: Multiple Click Prevention
1. Select bet choice and amount
2. Rapidly click "Place Bet" button multiple times (5-10 clicks)
3. Confirm transaction in wallet
4. Wait for blockchain confirmation

**Expected Result:** Only 1 transaction sent, only 1 bet record created

## Scenario 3: UI State During Processing
1. Start bet placement process
2. Verify all inputs are disabled during:
   - Transaction signing
   - Blockchain confirmation
   - API call processing
3. Verify inputs re-enable after completion/error

**Expected Result:** No ability to change bet parameters during processing

## Scenario 4: Error Recovery
1. Start bet placement
2. Reject transaction in wallet
3. Verify UI unlocks and can place bet again
4. Try with network error simulation

**Expected Result:** Clean error recovery, no stuck states

## Scenario 5: Database Duplicate Prevention
1. Place a successful bet, note the tx_hash
2. Manually try to insert another bet with same tx_hash via API
3. Use tool like Postman or curl:
```bash
curl -X POST https://your-staging-url/api/bets \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "0xTEST",
    "market_id": "test_market", 
    "outcome": "YES",
    "amount": 10,
    "odds_shown_to_user": 0.5,
    "tx_hash": "SAME_HASH_FROM_STEP_1"
  }'
```

**Expected Result:** API returns existing bet, no duplicate created

## Scenario 6: Production Data Check
After deployment to production:
1. Query for any duplicate tx_hash values:
```sql
SELECT tx_hash, COUNT(*) 
FROM bets 
WHERE tx_hash IS NOT NULL 
GROUP BY tx_hash 
HAVING COUNT(*) > 1;
```

**Expected Result:** Zero results (no duplicates)

## Browser DevTools Monitoring
Open browser console and watch for:
- `📸 Bet snapshot captured:` logs
- `🔍 Checking for existing bet with tx_hash:` logs  
- `🔄 Bet with this tx_hash already exists` logs (if testing duplicates)
- No React warning about dependency changes in useEffect

## Performance Check
- Verify betting flow feels responsive
- No noticeable delays from duplicate checking
- UI lock/unlock happens smoothly