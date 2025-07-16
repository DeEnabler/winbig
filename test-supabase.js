#!/usr/bin/env node

// Test script to verify Supabase connection and bet insertion
// Run with: node test-supabase.js

const { createClient } = require('@supabase/supabase-js');

// Try loading from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

console.log('🧪 Starting Supabase connection test...');
console.log('📅 Test timestamp:', new Date().toISOString());
console.log('');

// Check environment variables
console.log('🔍 Environment Variables Check:');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_KEY exists:', !!process.env.SUPABASE_KEY);
console.log('SUPABASE_URL value:', process.env.SUPABASE_URL || 'MISSING');
console.log('SUPABASE_KEY length:', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length + ' characters' : 'MISSING');
console.log('');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('Please set SUPABASE_URL and SUPABASE_KEY in your .env.local file');
  process.exit(1);
}

// Create Supabase client
console.log('🔧 Creating Supabase client...');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
console.log('✅ Supabase client created');
console.log('');

// Test connection by checking if we can query the bets table
async function testConnection() {
  console.log('🌐 Testing Supabase connection...');
  try {
    const { data, error, count } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log('📊 Current bets table count:', count);
    return true;
  } catch (err) {
    console.error('❌ Unexpected error during connection test:', err);
    return false;
  }
}

// Test inserting a bet record
async function testBetInsertion() {
  console.log('🎯 Testing bet insertion...');
  
  const testBet = {
    user_id: 'test-user-' + Date.now(),
    market_id: 'test-market-' + Date.now(),
    outcome: 'YES',
    amount: 10.50,
    odds_shown_to_user: 0.65,
    execution_price: null
  };

  console.log('📝 Test bet record:', testBet);

  try {
    const { data, error } = await supabase
      .from('bets')
      .insert([testBet])
      .select()
      .single();

    if (error) {
      console.error('❌ Bet insertion failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return false;
    }

    console.log('✅ Bet inserted successfully!');
    console.log('📋 Inserted record:', data);
    
    // Clean up - delete the test record
    console.log('🧹 Cleaning up test record...');
    const { error: deleteError } = await supabase
      .from('bets')
      .delete()
      .eq('id', data.id);
    
    if (deleteError) {
      console.warn('⚠️ Could not clean up test record:', deleteError);
    } else {
      console.log('✅ Test record cleaned up');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error during bet insertion:', err);
    return false;
  }
}

// Test to see what columns actually exist in the bets table
async function testTableStructure() {
  console.log('🔍 Testing bets table structure...');
  try {
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Could not query table structure:', error);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('📋 Existing record structure:', Object.keys(data[0]));
    } else {
      console.log('📋 Table exists but is empty');
      
      // Try inserting a minimal record to see what's required
      console.log('🧪 Testing minimal record insertion...');
      const minimalBet = {
        user_id: 'test-minimal-' + Date.now(),
        market_id: 'test-market-minimal',
        outcome: 'YES',
        amount: 1.0,
        odds_shown_to_user: 0.5,
        status: 'pending'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('bets')
        .insert([minimalBet])
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Minimal insertion failed:', insertError);
      } else {
        console.log('✅ Minimal record inserted, structure:', Object.keys(insertData));
        
        // Clean up
        await supabase.from('bets').delete().eq('id', insertData.id);
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error testing table structure:', err);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Running Supabase tests...');
  console.log('');
  
  const connectionOk = await testConnection();
  console.log('');
  
  if (!connectionOk) {
    console.error('❌ Connection test failed, skipping insertion test');
    return;
  }
  
  const insertionOk = await testBetInsertion();
  console.log('');
  
  if (connectionOk && insertionOk) {
    console.log('🎉 All tests passed! Supabase is working correctly.');
  } else {
    console.error('❌ Some tests failed. Check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error); 