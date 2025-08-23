'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, TrendingUp, DollarSign, Zap, Target, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EarningDetails() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm relative overflow-hidden bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20 backdrop-blur-sm">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative flex flex-col space-y-4">
        {/* Header button */}
        <button 
          className="w-full p-4 text-left hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  Earn from Successful Markets
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-500 rounded-full">
                    NEW
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create popular markets and earn ongoing rewards from activity
                </p>
              </div>
            </div>
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        {/* Expandable content */}
        <div 
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-4 space-y-4">
            {/* Benefits grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <DollarSign className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Creator Bonus</p>
                  <p className="text-xs text-muted-foreground">
                    Earn bonus rewards when your markets get high trading volume
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <Zap className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Activity Rewards</p>
                  <p className="text-xs text-muted-foreground">
                    Get rewarded when others engage with your market
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <Target className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Accurate Resolution</p>
                  <p className="text-xs text-muted-foreground">
                    Earn reputation and bonus for well-crafted questions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <Users className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Community Building</p>
                  <p className="text-xs text-muted-foreground">
                    Popular markets increase your creator reputation
                  </p>
                </div>
              </div>
            </div>

            {/* Highlighted section */}
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-green-500" />
                <p className="text-sm font-medium text-green-500">
                  Turn Your Insights into Passive Income
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create markets around events you&apos;re passionate about. High-quality, 
                engaging markets generate ongoing activity and rewards. Focus on clear, 
                resolvable questions that attract genuine interest from the community.
              </p>
            </div>

            {/* Pro tip */}
            <p className="text-xs text-muted-foreground text-center">
              💡 <strong>Pro tip:</strong> Clear questions + Interesting topics + Fair resolution = Higher earnings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
