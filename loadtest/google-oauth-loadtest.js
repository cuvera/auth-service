import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUSERS = __ENV.VUSERS ? parseInt(__ENV.VUSERS) : 50; // Number of virtual users
const DURATION = __ENV.DURATION || '1m'; // Test duration

// Error rate metric
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    google_oauth_load: {
      executor: 'constant-vus',
      vus: VUSERS,
      duration: DURATION,
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'], // Less than 10% of requests should fail
    errors: ['rate<0.1'], // Less than 10% of errors
  },
};

// Main function
export default function () {
  // 1. Initiate Google OAuth flow
  const authUrl = `${BASE_URL}/auth/google`;
  const params = {
    redirect: 'manual', // Don't follow redirects automatically
    timeout: '30000',   // 30s timeout
  };

  // 2. Start OAuth flow - this will redirect to Google's login page
  const authRes = http.get(authUrl, params);
  
  // Check if we got a redirect to Google
  const isRedirect = authRes.status >= 300 && authRes.status < 400;
  const gotGoogleLogin = isRedirect && 
    authRes.headers['Location'] && 
    authRes.headers['Location'].includes('accounts.google.com');
  
  const authCheck = check(authRes, {
    'is status 302': (r) => r.status === 302,
    'got google login page': () => gotGoogleLogin,
  });

  if (!authCheck) {
    errorRate.add(1);
    console.error('Failed to initiate Google OAuth:', authRes.body);
    return;
  }

  // 3. If we got here, the OAuth flow was initiated successfully
  // In a real test, you would need to handle the OAuth callback
  // This is simplified as we can't automate Google's login page directly
  
  // 4. Simulate some processing time
  sleep(1);

  // 5. (Optional) Make a request to a protected endpoint if you have a valid token
  // This would require setting up a test user and handling the OAuth callback
  
  // 6. Log success
  console.log(`Virtual user ${__VU} completed OAuth flow`);
}

// Setup function to run before the test
export function setup() {
  console.log(`Starting load test with ${VUSERS} virtual users for ${DURATION}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  // You can add any test setup here, like creating test users
  
  return {};
}

// Teardown function to run after the test
export function teardown(data) {
  console.log('Load test completed');
  // Cleanup any test data if needed
}
