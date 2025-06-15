
// src/app/earn/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Share2, Coins, Users, MessageCircleQuestion, Flame, TrendingUp, Clock, Rocket, ShieldCheck } from 'lucide-react';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton'; // Using the more styled version
import { motion } from 'framer-motion';
import React, { useState } from 'react';

export default function EarnPage() {
  const [simulatedFriends, setSimulatedFriends] = useState(5);
  const dailyBetPerFriend = 3; // SOL
  const directReferralRate = 0.08; // 8% of fees, assume fee is 5% of bet
  const subReferralRate = 0.02; // 2% of fees from friends of friends

  const dailyFeePerFriend = dailyBetPerFriend * 0.05;
  const directDailyEarnings = simulatedFriends * dailyFeePerFriend * directReferralRate;

  // Simplified simulation for sub-referrals
  const simulatedSubFriends = Math.floor(simulatedFriends * 0.5 * 10); // Assume half friends invite 10 more
  const subDailyEarnings = simulatedSubFriends * dailyFeePerFriend * subReferralRate;
  const totalDailyEarnings = directDailyEarnings + subDailyEarnings;

  const howItWorksSteps = [
    {
      icon: <Share2 className="w-10 h-10 text-primary mb-3" />,
      title: 'Share Your Link',
      description: 'Invite your friends to bet on predictions. Simple as that.',
    },
    {
      icon: <Coins className="w-10 h-10 text-primary mb-3" />,
      title: 'Earn From Every Bet',
      description: 'You get a cut of the platform fees whenever they play.',
    },
    {
      icon: <Users className="w-10 h-10 text-primary mb-3" />,
      title: 'Earn From Their Friends Too',
      description: 'Yep – your earnings grow when their network bets. It stacks!',
    },
  ];

  const whyDifferentFeatures = [
    {
      icon: <MessageCircleQuestion className="w-8 h-8 text-accent mb-2" />,
      title: 'No Selling Required',
      description: 'You’re not pushing a product. Just share fun predictions and the thrill of the bet.',
    },
    {
      icon: <Flame className="w-8 h-8 text-accent mb-2" />,
      title: 'Built For Virality',
      description: 'Designed to spread like wildfire across X, Telegram, and DMs. Effortless sharing.',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-accent mb-2" />,
      title: 'Earnings Compound',
      description: 'Profit from activity, not just clicks. The more bets, the more you earn. Exponentially.',
    },
    {
      icon: <Clock className="w-8 h-8 text-accent mb-2" />,
      title: 'You\'re Still Early',
      description: 'The network is just igniting. Secure your spot now, reap rewards for the long haul.',
    },
  ];

  return (
    <div className="container mx-auto py-6 md:py-10 text-foreground">
      {/* 1. Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center py-12 md:py-16 rounded-xl bg-gradient-to-br from-primary/10 via-background to-background shadow-lg mb-8 md:mb-10"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-4 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Bet Smarter. <span className="block md:inline">Earn Passively.</span> Own the Network.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
          Get paid every time your network bets on WinBig. No code. No capital. Just your unique link. This is how you make money in 2025.
        </p>
        <div className="flex justify-center">
          {/* ConnectWalletButton already styled with lg size & rounded-xl */}
          <ConnectWalletButton />
        </div>
         <p className="text-xs text-muted-foreground mt-3">Connect your wallet to start earning.</p>
      </motion.section>

      {/* 2. How It Works (3 Steps) */}
      <section className="mb-8 md:mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8">
          Unlock Your Earnings in <span className="text-primary">3 Simple Steps</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {howItWorksSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="text-center p-5 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow"
            >
              {step.icon}
              <h3 className="text-xl md:text-2xl font-semibold mb-1.5">{step.title}</h3>
              <p className="text-muted-foreground text-sm md:text-base">{step.description}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-5 max-w-xl mx-auto">
          You get the biggest rewards from people you bring in directly. Their friends mean a smaller cut, but it stacks up incredibly fast. Think network effect, on autopilot.
        </p>
      </section>

      {/* 3. Why It’s Different */}
      <section className="mb-8 md:mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8">
          This Isn't Just Affiliate. <span className="block md:inline">This is <span className="text-accent">Leverage.</span></span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {whyDifferentFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card className="h-full bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="items-center text-center">
                  {feature.icon}
                  <CardTitle className="text-lg md:text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  <p>{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. Simulated Earnings Block */}
      <section className="mb-8 md:mb-10 p-5 md:p-6 bg-muted/50 rounded-xl shadow-lg">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          What Could <span className="text-primary">You</span> Earn?
        </h2>
        <p className="text-center text-muted-foreground mb-5 md:mb-6 max-w-lg mx-auto">
          This isn't a guarantee, it's a glimpse. Your network, your hustle, your potential.
        </p>
        <div className="max-w-2xl mx-auto bg-card p-5 rounded-lg shadow-md">
          <div className="mb-5 text-center">
            <p className="text-lg">
              If <span className="font-bold text-primary">{simulatedFriends} friends</span> each bet {dailyBetPerFriend} SOL/day...
            </p>
            <p className="text-2xl md:text-3xl font-bold text-green-500 mt-1">
              You could earn ~{directDailyEarnings.toFixed(2)} SOL/day
            </p>
            <p className="text-sm text-muted-foreground">(Directly from your invites)</p>
          </div>

          <div className="mb-5">
            <label htmlFor="friendsSlider" className="block text-sm font-medium text-center mb-1.5">Adjust Your Direct Invites:</label>
            <Slider
              id="friendsSlider"
              min={1}
              max={50}
              step={1}
              defaultValue={[simulatedFriends]}
              onValueChange={(value) => setSimulatedFriends(value[0])}
              className="[&>span:first-child]:h-3 [&>span:first-child>span]:bg-primary [&>span:last-child]:h-6 [&>span:last-child]:w-6"
            />
             <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1 Friend</span>
                <span>50 Friends</span>
            </div>
          </div>

          <div className="text-center mt-3 border-t border-border pt-3">
             <p className="text-lg">
              And if their network grows (e.g., {simulatedSubFriends} sub-referrals)...
            </p>
            <p className="text-xl md:text-2xl font-bold text-green-400 mt-1">
              + an extra ~{subDailyEarnings.toFixed(2)} SOL/day
            </p>
             <p className="text-sm text-muted-foreground">(From their friends' activity)</p>
          </div>
           <p className="text-center text-3xl md:text-4xl font-extrabold text-primary mt-5">
             Total Potential: ~{totalDailyEarnings.toFixed(2)} SOL/day
            </p>
        </div>
        <p className="text-center text-sm italic text-muted-foreground mt-5 max-w-md mx-auto">
          📊 Some top partners are already earning passively without placing a single bet themselves. They just shared.
        </p>
      </section>

      {/* 5. Join the Movement CTA Section */}
      <section className="text-center py-10 md:py-12 bg-gradient-to-tr from-accent/10 to-background rounded-xl shadow-lg">
        <blockquote className="text-2xl md:text-3xl font-semibold italic text-foreground max-w-2xl mx-auto mb-5">
          “We don’t pay influencers. <span className="block">We pay <span className="text-accent underline decoration-wavy">believers.</span></span>”
        </blockquote>
        <h2 className="text-3xl md:text-4xl font-bold mb-5">
          Become an <span className="text-primary">Early Partner</span>
        </h2>
        <p className="text-muted-foreground mb-5 max-w-xl mx-auto">
          Your link is your key. The earlier you start, the bigger your network grows. The time is now.
        </p>
        <div className="flex justify-center">
            {/* ConnectWalletButton already styled with lg size & rounded-xl */}
            <ConnectWalletButton />
        </div>
        <p className="text-xs text-muted-foreground mt-3">Connect to get your unique shareable link.</p>
      </section>

      {/* 6. Optional Footer */}
      <footer className="text-center mt-8 md:mt-10 py-5 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-1">
          <ShieldCheck className="w-3 h-3 inline mr-1" /> Revenue is generated from a small platform fee on each bet placed.
        </p>
        <p className="text-xs text-muted-foreground">
          Referral tiers are designed to heavily reward those closest to the direct invite. Transparency is key.
        </p>
      </footer>
    </div>
  );
}
