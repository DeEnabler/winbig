md
# WinBig - A Next.js Prediction Betting App

This is a Next.js starter app for WinBig, built in Firebase Studio.

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
    NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id_here 
    ```
    Replace `your_reown_project_id_here` with your actual Reown Project ID.
    
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
    *   Import your WinBig GitHub repository.

3.  **Configure Vercel Project Settings (Crucial):**
    *   Vercel should automatically detect that this is a Next.js project and configure the build settings appropriately.
    *   **Environment Variables (in Vercel Project Settings -> Environment Variables):**
        *   Vercel uses its own environment variable settings. It does **not** use your local `.env` file.
        *   Add the following variables for the **Production** environment (and Preview/Development environments within Vercel as needed):
            *   **Name:** `NEXT_PUBLIC_APP_URL`
            *   **Value (for Vercel):** The full canonical URL of your Vercel deployment.
                *   If you have a **custom domain** (e.g., `https://www.winbig.fun`), set this to your custom domain: `NEXT_PUBLIC_APP_URL=https://www.winbig.fun`.
                *   Otherwise, use the Vercel-provided URL (e.g., `https://your-project-name.vercel.app`).
                *   This variable is **critical** for your deployed app to generate correct absolute URLs for OG images, SEO metadata, and Reown AppKit/WalletConnect dApp metadata when running on Vercel, ensuring they point to your **custom domain** if you have one.
            *   **Name:** `NEXT_PUBLIC_REOWN_PROJECT_ID`
            *   **Value:** Your Reown Project ID.

4.  **Deploy:**
    *   Click the "Deploy" button. Vercel will build and deploy your application.
    *   Monitor the build logs for any errors.

5.  **Assign Domain (e.g., `winbig.fun`):**
    *   After deployment, Vercel will provide a default `.vercel.app` domain. To use your custom domain like `winbig.fun`:
        *   Go to your Vercel project settings, then to the "Domains" section.
        *   Add `winbig.fun` and `www.winbig.fun`.
        *   Vercel will provide instructions for configuring your DNS records. Typically, this involves:
            *   **For the apex domain (`winbig.fun`):** An **A record** pointing to Vercel's IP address: `76.76.21.21`.
            *   **For the `www` subdomain (`www.winbig.fun`):** A **CNAME record** pointing to `cname.vercel-dns.com.` (note the trailing dot for some DNS providers).
        *   Ensure your `NEXT_PUBLIC_APP_URL` environment variable in Vercel is updated to `https://www.winbig.fun` (or your primary domain).

6.  **Troubleshooting Custom Domain `winbig.fun` (DNS Issues):**
    If you encounter errors like "This site can’t be reached" or "DNS_PROBE_POSSIBLE" for `winbig.fun`:

    *   **Verify Domain on Vercel:**
        *   In your Vercel project settings, under "Domains", ensure `winbig.fun` and `www.winbig.fun` are listed and show as "Verified" or "Valid Configuration".
        *   If verification is pending, Vercel might require you to add a specific **TXT record** to your DNS provider to prove ownership. Follow the instructions provided by Vercel carefully.

    *   **Check DNS Records with Your DNS Provider:**
        *   Log in to your DNS provider (e.g., GoDaddy, Namecheap, Cloudflare).
        *   **For `winbig.fun` (apex domain):**
            *   Type: `A`
            *   Name/Host: `@` (or `winbig.fun` if your provider requires the full domain for apex)
            *   Value/Points to: `76.76.21.21`
            *   TTL: Default or 1 hour (3600 seconds)
        *   **For `www.winbig.fun` (subdomain):**
            *   Type: `CNAME`
            *   Name/Host: `www`
            *   Value/Target: `cname.vercel-dns.com.` (ensure a trailing dot if your provider requires it for FQDNs in CNAME values)
            *   TTL: Default or 1 hour
        *   Remove any conflicting A, AAAA, or CNAME records for `winbig.fun` and `www.winbig.fun` that don't point to Vercel.

    *   **Wait for DNS Propagation:**
        *   DNS changes can take time to propagate globally, sometimes up to 48 hours, though often much faster.
        *   You can use online tools like `WhatsMyDNS.net` to check the propagation status of your A and CNAME records from different locations.

    *   **Clear Local DNS Cache:**
        *   Your computer or network might be caching old DNS information.
        *   **Windows:** Open Command Prompt as Administrator and run `ipconfig /flushdns`.
        *   **macOS:** Open Terminal and run `sudo killall -HUP mDNSResponder`.
        *   **Linux:** (If using systemd-resolved) `sudo systemd-resolve --flush-caches`.
        *   Try accessing the site from a different network (e.g., mobile data) or a different device.

    *   **Check Vercel Dashboard for Errors:**
        *   The "Domains" section in Vercel might show specific error messages or guidance if there's a problem it has detected (e.g., domain ownership conflicts, SSL certificate issues).

    *   **Contact Support:**
        *   If issues persist after 48 hours and you've double-checked all configurations, consider contacting Vercel support or your DNS provider for assistance.

Your application should now be live and accessible via your custom domain!

## Key Technologies

*   Next.js (App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI Components
*   Framer Motion (for animations)
*   Genkit (for AI features)
*   Vercel OG (for dynamic Open Graph image generation)
*   Reown AppKit (for WalletConnect/Web3 integration via Wagmi)

```