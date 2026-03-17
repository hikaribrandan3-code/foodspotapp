const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://buendqgmwpxdixwvlkhd.supabase.co',
  'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E'
);

async function forensicCheck() {
  console.log('=== KDS REALTIME FORENSIC VERIFICATION ===\n');

  // 1. Check all order statuses
  console.log('1. STATUS LANGUAGE VERIFICATION');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('status')
    .limit(100);
  
  if (ordersError) {
    console.log('   Error:', ordersError.message);
  } else {
    const statuses = [...new Set(orders.map(o => o.status))];
    console.log('   Unique statuses found:', statuses);
    console.log('   LANGUAGE:', statuses.every(s => ['pending', 'paid', 'cooking', 'ready', 'completed', 'cancelled'].includes(s)) ? 'ENGLISH ✓' : 'MIXED/SPANISH');
  }

  // 2. Check RPC by calling it and analyzing error/response
  console.log('\n2. RPC RETURN SIGNATURE - transition_order_state');
  try {
    const { data, error } = await supabase.rpc('transition_order_state', {
      p_order_id: 'abc038f2-5f39-4b9d-89ae-7835a3f0423c',
      p_new_status: 'cooking'
    });
    
    console.log('   Data:', data);
    console.log('   Error:', error);
    console.log('   Data type:', typeof data);
    if (Array.isArray(data)) {
      console.log('   Is Array:', true);
      console.log('   First element:', data[0]);
      console.log('   Has success prop:', data[0]?.success !== undefined);
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }

  // 3. Check realtime publication by subscribing
  console.log('\n3. TABLE REALTIME PUBLICATION');
  const channel = supabase.channel('test-kds-orders')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'orders' }, 
      (payload) => console.log('   Realtime event received:', payload)
    );
  
  const subStatus = channel.subscribe((status) => {
    console.log('   Subscription status:', status);
    if (status === 'SUBSCRIBED') {
      console.log('   ✓ Realtime is working - orders table IS published');
    } else if (status === 'CHANNEL_ERROR') {
      console.log('   ✗ Realtime error - table may not be published');
    }
  });

  // Wait a bit for subscription to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  supabase.removeChannel(channel);
  console.log('\n=== END VERIFICATION ===');
}

forensicCheck().catch(console.error);
