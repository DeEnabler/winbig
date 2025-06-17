// src/components/homepage/SocialTeaserSection.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Flame, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const teasers = [
  {
    icon: <Crown className="w-8 h-8 text-yellow-500" />,
    title: "Top 10 Bettors This Week",
    description: "See who's dominating the leaderboards!",
    link: "/leaderboard", // Assuming a future leaderboard page
    color: "bg-yellow-500/10 dark:bg-yellow-500/20",
  },
  {
    icon: <Flame className="w-8 h-8 text-orange-500" />,
    title: "Most Flexed Bets",
    description: "Which predictions are going viral on X?",
    link: "/#feed-flexed", // Placeholder link
    color: "bg-orange-500/10 dark:bg-orange-500/20",
  },
  {
    icon: <Swords className="w-8 h-8 text-red-500" />,
    title: "Epic Rivalries",
    description: "Witness head-to-head challenges heating up.",
    link: "/#feed-rivalries", // Placeholder link
    color: "bg-red-500/10 dark:bg-red-500/20",
  },
   {
    icon: <Users className="w-8 h-8 text-blue-500" />,
    title: "Community Picks",
    description: "What is the hive-mind betting on today?",
    link: "/#feed-community", // Placeholder link
    color: "bg-blue-500/10 dark:bg-blue-500/20",
  },
];

export default function SocialTeaserSection() {
  return (
    <section className="py-8 md:py-12">
      <h2 className="text-3xl font-bold tracking-tight text-center mb-8">
        Feel the <span className="text-primary">Social Pulse</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {teasers.map((teaser, index) => (
          <motion.div
            key={teaser.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Link href={teaser.link} passHref legacyBehavior>
              <a className="block h-full">
                <Card className={`h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl ${teaser.color}`}>
                  <CardHeader className="items-center text-center pb-2">
                    {teaser.icon}
                    <CardTitle className="text-lg mt-2">{teaser.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-sm text-muted-foreground">
                    <p>{teaser.description}</p>
                  </CardContent>
                </Card>
              </a>
            </Link>
          </motion.div>
        ))}
      </div>
       <p className="text-center text-xs text-muted-foreground mt-6">
        These are just teasers! Bet, share, and climb the ranks to see your name in lights.
      </p>
    </section>
  );
}
