/**
 * Test Avatar Integration
 * 
 * This script tests the WebSocket connection and avatar API endpoints
 * Run with: node test-avatar-integration.js
 */

const WebSocket = require('ws');

// Configuration
const BACKEND_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/api/ws/avatar';
const INTERVIEW_ID = 'test-interview-' + Date.now();

console.log('🧪 Testing NeuroHire Avatar Integration\n');

// Test 1: Health Check
async function testHealthCheck() {
  console.log('📍 Test 1: Avatar Health Check');
  try {
    const response = await fetch(`${BACKEND_URL}/api/avatar/health`);
    const data = await response.json();
    console.log('   Status:', data.status);
    console.log('   Enabled:', data.enabled);
    console.log('   Service URL:', data.service_url);
    console.log('   ✅ Health check passed\n');
    return data.enabled;
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    console.log('   Note: This is expected if backend is not running\n');
    return false;
  }
}

// Test 2: WebSocket Connection
async function testWebSocketConnection() {
  console.log('📍 Test 2: WebSocket Connection');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}/${INTERVIEW_ID}`);
    
    const timeout = setTimeout(() => {
      console.log('   ⏱️  Connection timeout (backend not running?)');
      ws.close();
      resolve(false);
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('   ✅ WebSocket connected successfully');
      
      // Send initialization message
      ws.send(JSON.stringify({
        type: 'init',
        interviewId: INTERVIEW_ID
      }));
      
      console.log('   📤 Sent init message');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('   📥 Received message:', message.type);
        
        if (message.type === 'connection') {
          console.log('       Status:', message.status);
          console.log('       Avatar enabled:', message.avatar_enabled);
        } else if (message.type === 'question') {
          console.log('       Question:', message.question.substring(0, 60) + '...');
        }
      } catch (error) {
        console.log('   ⚠️  Could not parse message');
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log('   ❌ WebSocket error:', error.message);
      resolve(false);
    });

    // Close after 3 seconds of successful connection
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('   ✅ WebSocket test passed\n');
        ws.close();
        resolve(true);
      }
    }, 3000);
  });
}

// Test 3: Status Check
async function testStatusCheck() {
  console.log('📍 Test 3: Interview Status');
  try {
    const response = await fetch(`${BACKEND_URL}/api/avatar/status/${INTERVIEW_ID}`);
    const data = await response.json();
    console.log('   Interview ID:', data.interview_id);
    console.log('   Connected:', data.connected);
    console.log('   Active interviews:', data.active_interviews);
    console.log('   ✅ Status check passed\n');
    return true;
  } catch (error) {
    console.log('   ❌ Status check failed:', error.message, '\n');
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('Starting Avatar Integration Tests');
  console.log('='.repeat(60), '\n');

  const results = {
    health: false,
    websocket: false,
    status: false
  };

  // Run tests sequentially
  results.health = await testHealthCheck();
  results.websocket = await testWebSocketConnection();
  results.status = await testStatusCheck();

  // Summary
  console.log('='.repeat(60));
  console.log('Test Results Summary');
  console.log('='.repeat(60));
  console.log('Health Check:       ', results.health ? '✅ PASS' : '❌ FAIL');
  console.log('WebSocket:          ', results.websocket ? '✅ PASS' : '❌ FAIL');
  console.log('Status Check:       ', results.status ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(60), '\n');

  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;

  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! Avatar integration is working correctly.');
  } else if (totalPassed > 0) {
    console.log(`⚠️  ${totalPassed}/${totalTests} tests passed. Some features may not be available.`);
  } else {
    console.log('❌ All tests failed. Make sure the backend is running:');
    console.log('   cd backend');
    console.log('   python -m uvicorn app.main:app --reload --port 8000');
  }

  console.log('\n📚 For setup instructions, see: AVATAR_SETUP_GUIDE.md');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run tests
runTests().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
