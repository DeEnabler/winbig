
'use server';
/**
 * @fileOverview Manages the one-time generation and storage of Polymarket API credentials.
 */
import * as functions from 'firebase-functions';
import { generateTestnetWalletAndKeys } from './generate-wallet-and-keys'; // Assuming Amoy for now
import { type ApiCredentials, type WalletInfo } from './types';

interface StoredPolymarketConfig {
  api_key?: string;
  api_secret?: string;
  api_passphrase?: string;
  wallet_address?: string;
}

export class CredentialManager {
  /**
   * Generates Polymarket credentials and attempts to store them in Firebase function configuration.
   * Note: functions.config().set() is not a standard runtime function.
   * This method is intended to guide manual configuration or a custom deployment script.
   * In a typical production scenario, credentials should be set using 'firebase functions:config:set key=value'
   * or stored securely in Google Secret Manager and accessed via bound environment variables.
   */
  static async initializePolymarketCredentials(): Promise<{ success: boolean; credentials?: ApiCredentials; wallet?: WalletInfo; error?: string; message?: string }> {
    try {
      console.log('Attempting to generate Testnet (Amoy) wallet and Polymarket API keys...');
      const result = await generateTestnetWalletAndKeys(); // Defaults to Amoy

      if (result.success && result.credentials && result.wallet) {
        const newConfig: StoredPolymarketConfig = {
          polymarket: {
            api_key: result.credentials.key,
            api_secret: result.credentials.secret,
            api_passphrase: result.credentials.passphrase,
            wallet_address: result.wallet.address,
          },
        };

        // IMPORTANT: functions.config().set() is not a standard way to set config at runtime.
        // This log is to show what WOULD be set. You need to set this manually
        // using `firebase functions:config:set polymarket.api_key="..." polymarket.api_secret="..." ...`
        // or by integrating with Google Secret Manager.
        console.log('SUCCESS: Credentials generated. Manually set the following Firebase Functions config:');
        console.log(`firebase functions:config:set polymarket.api_key="${result.credentials.key}" polymarket.api_secret="${result.credentials.secret}" polymarket.api_passphrase="${result.credentials.passphrase}" polymarket.wallet_address="${result.wallet.address}"`);
        
        // The following line using functions.config().set() is illustrative of the user's request
        // but will not persist configuration in a live Firebase environment from a runtime function.
        // It might work in some emulated environments or specific setups but isn't standard.
        // await functions.config().set(newConfig); // This line is problematic for actual persistence.

        return {
          success: true,
          credentials: result.credentials,
          wallet: result.wallet,
          message: 'Credentials generated. Please set them manually in Firebase config or Secret Manager.',
        };
      } else {
        console.error('Credential generation failed:', result.error);
        return { success: false, error: result.error || 'Credential generation failed without specific error.' };
      }
    } catch (error) {
      console.error('Error in initializePolymarketCredentials:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error during credential initialization.' };
    }
  }

  static getPolymarketCredentials(): StoredPolymarketConfig {
    return functions.config().polymarket as StoredPolymarketConfig || {};
  }
}

// Example of how this might be called (e.g. from a protected HTTPS callable function for admin setup)
// export const setupCredentials = functions.https.onCall(async (data, context) => {
//   // Add authentication/authorization checks here to ensure only an admin can call this
//   if (!context.auth || !context.auth.token.admin) { // Example: check for admin custom claim
//     throw new functions.https.HttpsError('permission-denied', 'Must be an administrative user to perform this operation.');
//   }
//   return await CredentialManager.initializePolymarketCredentials();
// });

