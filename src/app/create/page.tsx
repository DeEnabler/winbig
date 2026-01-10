// src/app/create/page.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Zap, 
  Shield, 
  TrendingUp, 
  Bell, 
  CheckCircle2,
  Clock,
  Users,
  Bot
} from 'lucide-react';
import { GrokLogo, PolymarketLogo, BnbChainLogo, UsdtLogo } from '@/components/common/BrandLogos';
import { useToast } from '@/hooks/use-toast';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Resolution',
    description: 'Grok AI automatically resolves markets using real-time data and verified sources.',
    highlight: true,
  },
  {
    icon: Shield,
    title: 'Trustless Verification',
    description: 'Transparent resolution criteria with on-chain proof of outcomes.',
  },
  {
    icon: TrendingUp,
    title: 'Instant Liquidity',
    description: 'Access deep liquidity pools powered by Polymarket infrastructure.',
  },
  {
    icon: Users,
    title: 'Earn as a Creator',
    description: 'Market creators earn a share of trading fees from their markets.',
  },
];

export default function CreateMarketPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();

  const handleNotifyMe = async (e: React.FormEvent) => {
        e.preventDefault();
    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email to get notified.',
      });
            return;
        }

    // Simulate submission
    setIsSubmitted(true);
        toast({
      title: "You're on the list!",
      description: "We'll notify you when market creation launches.",
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800) 
            }}
            animate={{ 
              y: [0, -100, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ 
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Main Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          {/* Coming Soon Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mb-6"
          >
            <Badge 
              variant="outline" 
              className="px-4 py-2 text-sm font-medium border-primary/50 bg-primary/10 text-primary"
            >
              <Clock className="w-4 h-4 mr-2" />
              Coming Soon
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            Create Your Own
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Prediction Markets
            </span>
          </h1>

          {/* Subtitle with Grok highlight */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Launch custom prediction markets on any topic — sports, crypto, politics, or anything else.
          </p>

          {/* Grok AI Verification Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shadow-xl mb-10"
          >
            <GrokLogo className="h-8 w-8" />
            <div className="text-left">
              <p className="text-sm font-medium opacity-80">Resolution Powered by</p>
              <p className="text-lg font-bold">Grok AI</p>
            </div>
            <div className="ml-2 px-2 py-1 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] text-xs font-semibold">
              xAI
            </div>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <Card className={`h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${feature.highlight ? 'border-primary/50 bg-primary/5' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${feature.highlight ? 'bg-primary/20' : 'bg-muted'}`}>
                      <feature.icon className={`w-6 h-6 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Notification Signup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-md mx-auto mb-16"
        >
          <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/30">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Bell className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
              <h3 className="text-xl font-bold">Get Early Access</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to create markets when we launch
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-green-600 dark:text-green-400">You're on the list!</p>
                  <p className="text-sm text-muted-foreground mt-1">We'll email you when it's ready.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleNotifyMe} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-center"
                  />
                  <Button type="submit" size="lg" className="w-full h-12 font-semibold gap-2">
                    <Sparkles className="w-5 h-5" />
                    Notify Me
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tech Stack / Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">Powered by industry-leading technology</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <GrokLogo className="h-5 w-5" />
              <span className="text-sm font-medium">Grok AI</span>
                                    </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <PolymarketLogo className="h-5 w-5" />
              <span className="text-sm font-medium">Polymarket</span>
                                </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <UsdtLogo className="h-5 w-5" />
              <span className="text-sm font-medium">USDT</span>
                                </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <BnbChainLogo className="h-5 w-5" />
              <span className="text-sm font-medium">BNB Chain</span>
                                    </div>
                                </div>
        </motion.div>
                    </div>
        </div>
    );
}
