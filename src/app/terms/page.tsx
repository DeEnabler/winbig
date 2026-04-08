export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4 prose prose-invert">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: April 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using WinBig (&ldquo;the Platform&rdquo;), you agree to be bound by these
        Terms of Service. If you do not agree, do not use the Platform.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years of age (or the legal age of majority in your jurisdiction)
        to use the Platform. By using WinBig, you represent and warrant that you meet this
        requirement. Prediction market participation may be restricted or prohibited in certain
        jurisdictions. You are solely responsible for compliance with applicable local laws.
      </p>

      <h2>3. Nature of the Service</h2>
      <p>
        WinBig provides an interface for placing prediction market bets. All bets settle on
        the BNB Smart Chain using USDT. WinBig acts as an interface layer and does not
        custody user funds beyond the time required to process transactions.
      </p>

      <h2>4. No Financial Advice</h2>
      <p>
        Nothing on the Platform constitutes financial, investment, or trading advice.
        Prediction markets involve substantial risk of loss. Past performance does not
        guarantee future results. You should only wager amounts you can afford to lose.
      </p>

      <h2>5. Platform Fee</h2>
      <p>
        WinBig applies a platform markup on displayed odds. This fee is transparently built
        into the prices shown before you confirm any bet. By placing a bet, you accept the
        displayed odds and the embedded fee.
      </p>

      <h2>6. Affiliate Program</h2>
      <p>
        WinBig operates a two-tier affiliate referral system. Affiliate earnings are derived
        from platform fees on referred users&rsquo; bets. WinBig reserves the right to modify
        affiliate commission rates with reasonable notice.
      </p>

      <h2>7. Prohibited Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Platform for money laundering or any illegal activity</li>
        <li>Manipulate markets through coordinated trading or wash trading</li>
        <li>Use bots, scripts, or automated tools to gain unfair advantage</li>
        <li>Create multiple accounts to circumvent limits</li>
        <li>Attempt to exploit bugs or vulnerabilities</li>
      </ul>

      <h2>8. Limitation of Liability</h2>
      <p>
        The Platform is provided &ldquo;as is&rdquo; without warranties of any kind. WinBig
        shall not be liable for any direct, indirect, incidental, or consequential damages
        arising from your use of the Platform, including but not limited to loss of funds,
        transaction failures, smart contract errors, or blockchain network issues.
      </p>

      <h2>9. Modification of Terms</h2>
      <p>
        WinBig reserves the right to modify these terms at any time. Continued use after
        changes constitutes acceptance of the revised terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        For questions about these Terms, contact us via our Telegram community or at the
        email listed on our website.
      </p>
    </div>
  );
}
