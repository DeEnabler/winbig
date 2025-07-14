import { NextRequest, NextResponse } from 'next/server';
import { getMarketOdds } from '@/lib/marketService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conditionId = searchParams.get('conditionId');
    
    if (!conditionId) {
      return NextResponse.json(
        { error: 'conditionId parameter is required' },
        { status: 400 }
      );
    }
    
    // 🎯 **CORRECT USAGE: Get normalized odds from Redis**
    const marketOdds = await getMarketOdds(conditionId);
    
    if (!marketOdds) {
      return NextResponse.json(
        { error: `No market data found for condition ID: ${conditionId}` },
        { status: 404 }
      );
    }
    
    // 📊 **EXAMPLE RESPONSE: Shows correct vs incorrect usage**
    const response = {
      success: true,
      marketId: conditionId,
      
      // ✅ CORRECT: Use these for displaying market sentiment
      displayOdds: {
        yes: `${(marketOdds.odds.yes * 100).toFixed(1)}%`,
        no: `${(marketOdds.odds.no * 100).toFixed(1)}%`,
        probability: marketOdds.odds,
        calculationMethod: marketOdds.odds.calculationMethod,
        sumsTo100: (marketOdds.odds.yes + marketOdds.odds.no).toFixed(3)
      },
      
      // ✅ CORRECT: Use these for calculating user costs
      executionPrices: {
        buyYes: `$${marketOdds.execution.yesBuyPrice.toFixed(2)}`,
        buyNo: `$${marketOdds.execution.noBuyPrice.toFixed(2)}`,
        sellYes: `$${marketOdds.execution.yesSellPrice.toFixed(2)}`,
        sellNo: `$${marketOdds.execution.noSellPrice.toFixed(2)}`,
        description: "What users actually pay/receive for trades"
      },
      
      // 📈 Market efficiency metrics
      marketHealth: {
        efficiency: `${(marketOdds.efficiency.marketEfficiency * 100).toFixed(1)}%`,
        yesMidpoint: `$${marketOdds.efficiency.yesMidpoint.toFixed(3)}`,
        noMidpoint: `$${marketOdds.efficiency.noMidpoint.toFixed(3)}`,
        totalMidpoints: `$${marketOdds.efficiency.totalMidpoints.toFixed(3)}`,
        description: "Higher efficiency = tighter spreads"
      },
      
      // ⚠️ EDUCATIONAL: Shows why raw prices are problematic
      rawPricesWarning: {
        yesExecution: marketOdds.raw.yesExecutionPercent.toFixed(1) + '%',
        noExecution: marketOdds.raw.noExecutionPercent.toFixed(1) + '%',
        totalRaw: marketOdds.raw.totalRaw.toFixed(1) + '%',
        warning: marketOdds.raw.warning,
        explanation: "These don't sum to 100% due to spreads and fees"
      },
      
      // 🎯 **INTEGRATION GUIDE**
      integrationGuide: {
        forDisplayOdds: "Use marketOdds.odds.yes and marketOdds.odds.no",
        forTradingCosts: "Use marketOdds.execution.yesBuyPrice and marketOdds.execution.noBuyPrice",
        forMarketHealth: "Use marketOdds.efficiency.marketEfficiency",
        neverDo: "Never add execution prices directly for percentage calculations"
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error fetching market odds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 