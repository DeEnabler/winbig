# ViralBet - A Next.js Prediction Betting App

This is a Next.js starter app for ViralBet, built in Firebase Studio.

## Getting Started

To get started locally, take a look at `src/app/page.tsx`.

1.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root of your project and add the following variables:
    ```env
    NEXT_PUBLIC_APP_URL=http://localhost:9002
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wallet_connect_project_id_here
    ```
    Replace `your_wallet_connect_project_id_here` with your actual WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).
    
    **Note on `NEXT_PUBLIC_APP_URL`**:
    *   For local development, use your local server URL (e.g., `http://localhost:9002`).
    *   For Vercel deployment, this should be the **canonical, full URL of your application**. If you have a custom domain, use that (e.g., `https://www.yourviralbetapp.com`). If you are using the Vercel-provided domain, use that (e.g., `https://your-project-name.vercel.app`). This variable is crucial for generating absolute URLs for OG images, SEO metadata, and WalletConnect dApp metadata.

3.  Run the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
    Open [http://localhost:9002](http://localhost:9002) (or your configured port) with your browser to see the result.

## Deploying to Vercel

This project is optimized for deployment on [Vercel](https://vercel.com), the creators of Next.js.

1.  **Push to GitHub:**
    Ensure your code is pushed to a GitHub repository.

2.  **Import to Vercel:**
    *   Go to [vercel.com](https://vercel.com) and sign up or log in with your GitHub account.
    *   Click "Add New..." -> "Project".
    *   Import your ViralBet GitHub repository.

3.  **Configure Project Settings (Crucial):**
    *   Vercel should automatically detect that this is a Next.js project and configure the build settings appropriately.
    *   **Environment Variables:**
        *   In your Vercel project settings, navigate to "Settings" -> "Environment Variables".
        *   Add the following variables for the **Production** environment (and Preview/Development as needed):
            *   **Name:** `NEXT_PUBLIC_APP_URL`
            *   **Value:** The full canonical URL of your Vercel deployment. If you have a custom domain (e.g., `https://www.yourviralbetapp.com`), use that. Otherwise, use the Vercel-provided URL (e.g., `https://your-project-name.vercel.app`).
            *   **Name:** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
            *   **Value:** Your WalletConnect Project ID.

4.  **Deploy:**
    *   Click the "Deploy" button. Vercel will build and deploy your application.
    *   Monitor the build logs for any errors.

5.  **Assign Domain (Optional):**
    *   After deployment, Vercel will provide a default `.vercel.app` domain. You can assign a custom domain in the project settings under "Domains". If you do, ensure your `NEXT_PUBLIC_APP_URL` environment variable (for Production) reflects your custom domain.

Your application should now be live!

## Key Technologies

*   Next.js (App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI Components
*   Framer Motion (for animations)
*   Genkit (for AI features)
*   Vercel OG (for dynamic Open Graph image generation)
*   Wagmi & Web3Modal (for WalletConnect integration)
```