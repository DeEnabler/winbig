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

2.  Run the development server:
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

3.  **Configure Project Settings:**
    *   Vercel should automatically detect that this is a Next.js project and configure the build settings appropriately.
    *   **Environment Variables (Crucial):**
        *   In your Vercel project settings, navigate to "Settings" -> "Environment Variables".
        *   Add the following variable:
            *   **Name:** `NEXT_PUBLIC_APP_URL`
            *   **Value:** The full URL of your Vercel deployment (e.g., `https://your-project-name.vercel.app`). You will get this URL after the first deployment, or you can use a custom domain if you set one up. This URL is used for generating absolute links, especially for Open Graph image previews.

4.  **Deploy:**
    *   Click the "Deploy" button. Vercel will build and deploy your application.
    *   Monitor the build logs for any errors.

5.  **Assign Domain (Optional):**
    *   After deployment, Vercel will provide a default `.vercel.app` domain. You can assign a custom domain in the project settings under "Domains".

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
