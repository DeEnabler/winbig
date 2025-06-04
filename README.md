md
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

2.  **Local Environment Variables:**
    Create a `.env` file in the root of your project. This file is for **local development only** and will **not** be used by Vercel for deployments.
    Add the following variables:
    ```env
    NEXT_PUBLIC_APP_URL=http://localhost:9002
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wallet_connect_project_id_here
    ```
    Replace `your_wallet_connect_project_id_here` with your actual WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).
    
    **Note on `NEXT_PUBLIC_APP_URL` (for local `.env` file)**:
    *   Setting `NEXT_PUBLIC_APP_URL=http://localhost:9002` locally allows your application code (which refers to `process.env.NEXT_PUBLIC_APP_URL`) to correctly generate absolute URLs for features like Open Graph (OG) image previews and WalletConnect dApp metadata *while you are developing on your local machine*. Your code can consistently use this variable to refer to the app's root URL. This makes testing these features locally straightforward.

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

3.  **Configure Vercel Project Settings (Crucial):**
    *   Vercel should automatically detect that this is a Next.js project and configure the build settings appropriately.
    *   **Environment Variables (in Vercel Project Settings -> Environment Variables):**
        *   Vercel uses its own environment variable settings. It does **not** use your local `.env` file.
        *   Add the following variables for the **Production** environment (and Preview/Development environments within Vercel as needed):
            *   **Name:** `NEXT_PUBLIC_APP_URL`
            *   **Value (for Vercel):** The full canonical URL of your Vercel deployment.
                *   If you have a **custom domain** (e.g., `https://www.winbig.fun`), set this to your custom domain: `NEXT_PUBLIC_APP_URL=https://www.winbig.fun`.
                *   Otherwise, use the Vercel-provided URL (e.g., `https://your-project-name.vercel.app`).
                *   This variable is **critical** for your deployed app to generate correct absolute URLs for OG images, SEO metadata, and WalletConnect dApp metadata when running on Vercel, ensuring they point to your **custom domain** if you have one.
            *   **Name:** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
            *   **Value:** Your WalletConnect Project ID.

4.  **Deploy:**
    *   Click the "Deploy" button. Vercel will build and deploy your application.
    *   Monitor the build logs for any errors.

5.  **Assign Domain (Optional but Recommended):**
    *   After deployment, Vercel will provide a default `.vercel.app` domain. You can assign a custom domain in the project settings under "Domains". If you do, ensure your `NEXT_PUBLIC_APP_URL` environment variable (for Production in Vercel settings) reflects your custom domain as described above.

Your application should now be live! The application code consistently uses `process.env.NEXT_PUBLIC_APP_URL` to refer to its base URL. Locally, this will be `http://localhost:9002` (from your `.env` file). On Vercel, it will be the URL you configured in Vercel's environment variable settings (ideally your custom domain).

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

