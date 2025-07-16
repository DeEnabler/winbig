// Debug API endpoint to check environment variables and Supabase connection
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  console.log('🔍 Debug endpoint called');
  
  try {
    // Check environment variables
    const envCheck = {
      SUPABASE_URL_exists: !!process.env.SUPABASE_URL,
      SUPABASE_KEY_exists: !!process.env.SUPABASE_KEY,
      SUPABASE_URL_value: process.env.SUPABASE_URL || 'MISSING',
      SUPABASE_KEY_length: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0,
    };
    
    console.log('📊 Environment variables:', envCheck);
    
    // Test Supabase connection
    let connectionTest = { success: false, error: 'Not tested' };
    if (envCheck.SUPABASE_URL_exists && envCheck.SUPABASE_KEY_exists) {
      try {
        const { data, error, count } = await supabase
          .from('bets')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          connectionTest = { success: false, error: error.message };
        } else {
          connectionTest = { success: true, error: 'No error - connection successful' };
        }
      } catch (err) {
        connectionTest = { 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
      }
    }
    
    console.log('🌐 Connection test:', connectionTest);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabaseConnection: connectionTest,
      message: 'Debug info gathered successfully'
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 