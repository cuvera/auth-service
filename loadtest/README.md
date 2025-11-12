# Load Testing with k6

This directory contains load tests for the authentication service.

## Google OAuth Load Test

The `google-oauth-loadtest.js` script tests the Google OAuth login flow under load.

### Prerequisites

1. Install k6: https://k6.io/docs/get-started/installation/
2. Node.js (for running the test server if needed)
3. The authentication service should be running

### Running the Test

```bash
# Run with default settings (50 VUs for 1 minute)
k6 run google-oauth-loadtest.js

# Customize the test
k6 run -e VUSERS=100 -e DURATION=5m -e BASE_URL=http://your-auth-service:3000 google-oauth-loadtest.js
```

### Test Parameters

- `VUSERS`: Number of virtual users (default: 50)
- `DURATION`: Test duration (default: 1m)
- `BASE_URL`: Base URL of the auth service (default: http://localhost:3000)

### Test Scenarios

1. **OAuth Initiation**: Tests the initial OAuth redirect to Google
2. **Response Time**: Measures how quickly the service responds to OAuth requests
3. **Error Rate**: Tracks failed OAuth initiations

### Notes

- This test only measures the initial OAuth flow up to the Google login page
- It doesn't complete the actual Google login as that would require Google credentials
- For a complete end-to-end test, you would need to use a tool that can automate browser interactions

### Viewing Results

k6 will output test results to the console. For more detailed analysis, you can output to JSON or use k6's cloud service:

```bash
# Output to JSON
k6 run --out json=test_results.json google-oauth-loadtest.js
```

### Interpreting Results

- **http_req_duration**: Should be under 2 seconds for 95% of requests
- **http_req_failed**: Should be less than 10%
- **errors**: Custom error rate should be less than 10%

If you see high error rates or slow response times, consider:
- Scaling up your auth service
- Checking database connection pools
- Monitoring server resources (CPU, memory, network)
- Reviewing logs for specific errors
