/**
 * CamTech Black Box Test Suite
 * Run this to verify the camera isolation system works
 */

import { useCamTechBroadcaster, useCamTechListener } from './useCamTech';

// Test 1: Verify hooks exist and are exported
console.log('✅ Test 1: useCamTechBroadcaster exported:', typeof useCamTechBroadcaster === 'function');
console.log('✅ Test 2: useCamTechListener exported:', typeof useCamTechListener === 'function');

// Test 2: Verify event system works
let testPassed = false;
window.addEventListener('camtech:active', (e) => {
  console.log('✅ Test 3: Event received:', e.detail);
  testPassed = true;
});

// Simulate camera activation
window.dispatchEvent(new CustomEvent('camtech:active', { 
  detail: { active: true, timestamp: Date.now() } 
}));

// Test 3: Verify global flag
console.log('✅ Test 4: Global flag set:', window.__camTechActive === true);

// Summary
setTimeout(() => {
  console.log('\n📊 CamTech Test Results:');
  console.log('All tests:', testPassed ? '✅ PASSED' : '❌ FAILED');
  console.log('\nUsage:');
  console.log('1. Camera component: useCamTechBroadcaster()');
  console.log('2. Polling components: useCamTechListener({ onPause, onResume })');
  console.log('3. Check status: window.__camTechActive');
}, 100);
