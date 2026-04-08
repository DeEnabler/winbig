export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4 prose prose-invert">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: April 2026</p>

      <h2>1. Information We Collect</h2>
      <p>WinBig collects the following information:</p>
      <ul>
        <li>
          <strong>Wallet address</strong> — your public blockchain address, used as your account
          identifier.
        </li>
        <li>
          <strong>X (Twitter) profile data</strong> — if you choose to link your account via
          OAuth (username, display name, avatar).
        </li>
        <li>
          <strong>Transaction data</strong> — bet amounts, outcomes, and on-chain transaction
          hashes.
        </li>
        <li>
          <strong>Campaign analytics</strong> — anonymized tracking parameters (sub-IDs, UTM
          tags) and hashed IP addresses for campaign performance measurement. We never store
          raw IP addresses.
        </li>
        <li>
          <strong>Usage data</strong> — page views and interaction events collected via Vercel
          Analytics (privacy-focused, no cookies, GDPR-compliant).
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To process your bets and display your positions</li>
        <li>To facilitate the affiliate referral program</li>
        <li>To improve the Platform and user experience</li>
        <li>To detect and prevent fraud or abuse</li>
        <li>To measure advertising campaign performance</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>
        We do not sell your personal data. We may share anonymized, aggregated analytics with
        advertising partners (e.g., conversion postbacks to PropellerAds that include only a
        click ID and conversion amount, with no personal information). Blockchain transactions
        are inherently public.
      </p>

      <h2>4. Data Storage</h2>
      <p>
        Data is stored in Supabase (PostgreSQL) with row-level security. Cache data is stored
        in Upstash Redis. Both services use encryption at rest and in transit.
      </p>

      <h2>5. Cookies &amp; Local Storage</h2>
      <p>
        We use browser localStorage to persist your session preferences, referral attribution,
        and campaign tracking data. We do not use third-party tracking cookies. Vercel
        Analytics is cookie-free.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You may request deletion of your account data by contacting us. Note that on-chain
        transaction history cannot be deleted as it is part of the public blockchain record.
      </p>

      <h2>7. Age Restriction</h2>
      <p>
        WinBig is intended for users aged 18 and above. We do not knowingly collect data from
        minors.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at
        the top reflects the most recent revision.
      </p>

      <h2>9. Contact</h2>
      <p>
        For privacy-related inquiries, reach out through our Telegram community or the email
        listed on our website.
      </p>
    </div>
  );
}
