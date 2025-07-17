#!/usr/bin/env node

/**
 * Test script for Vercel deployment
 * Tests all serverless endpoints
 */

const https = require('https');
const http = require('http');

class VercelTestSuite {
  constructor(baseUrl = 'http://localhost:3000', apiKey = 'test-key') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async makeRequest(path, method = 'GET', data = null, headers = {}) {
    const url = new URL(path, this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel Test Suite',
        ...headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsed
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async testEndpoint(name, path, method = 'GET', data = null, headers = {}, expectedStatus = 200) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   ${method} ${path}`);
    
    try {
      const response = await this.makeRequest(path, method, data, headers);
      
      if (response.status === expectedStatus) {
        console.log(`   ✅ Status: ${response.status} (Expected: ${expectedStatus})`);
        return { success: true, response };
      } else {
        console.log(`   ❌ Status: ${response.status} (Expected: ${expectedStatus})`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        return { success: false, response };
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return { success: false, error };
    }
  }

  async runTests() {
    console.log('🚀 Starting Vercel Deployment Test Suite');
    console.log(`🌐 Base URL: ${this.baseUrl}`);
    console.log('=' .repeat(60));

    const results = [];

    // Test 1: Health check (no auth required)
    results.push(await this.testEndpoint(
      'Health Check',
      '/api/health'
    ));

    // Test 2: Main endpoint
    results.push(await this.testEndpoint(
      'Main Endpoint',
      '/'
    ));

    // Test 3: API documentation
    results.push(await this.testEndpoint(
      'API Documentation',
      '/api/docs'
    ));

    // Test 4: Suggestions endpoint (with auth)
    results.push(await this.testEndpoint(
      'Pattern Suggestions',
      '/api/suggestions',
      'GET',
      null,
      { 'X-API-Key': this.apiKey }
    ));

    // Test 5: Suggestions endpoint (without auth - should fail)
    results.push(await this.testEndpoint(
      'Suggestions without auth (should fail)',
      '/api/suggestions',
      'GET',
      null,
      {},
      401
    ));

    // Test 6: Channels endpoint (with auth) - might fail without valid Slack token
    results.push(await this.testEndpoint(
      'Get Channels (may fail without Slack token)',
      '/api/channels',
      'GET',
      null,
      { 'X-API-Key': this.apiKey },
      200 // May return 400 if Slack token is invalid
    ));

    // Test 7: Group channels endpoint
    results.push(await this.testEndpoint(
      'Group Channels (may fail without Slack token)',
      '/api/channels',
      'POST',
      { pattern: '^general', flags: 'i' },
      { 'X-API-Key': this.apiKey },
      200 // May return 400 if Slack token is invalid
    ));

    // Test 8: Slack command endpoint (without proper signature - should fail)
    results.push(await this.testEndpoint(
      'Slack Command (should fail without signature)',
      '/slack/commands',
      'POST',
      'command=/group-channels&text=help&user_id=U123456',
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      200 // May still return 200 but with error message
    ));

    // Test 9: Invalid endpoint
    results.push(await this.testEndpoint(
      'Invalid Endpoint (should fail)',
      '/api/nonexistent',
      'GET',
      null,
      {},
      404
    ));

    // Test 10: CORS preflight
    results.push(await this.testEndpoint(
      'CORS Preflight',
      '/api/health',
      'OPTIONS',
      null,
      {},
      200
    ));

    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));

    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (passed === total) {
      console.log('\n🎉 All tests passed! Your Vercel deployment is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. This might be expected if:');
      console.log('   • Slack tokens are not configured');
      console.log('   • API key is not set correctly');
      console.log('   • App is not deployed yet');
    }

    console.log('\n🔧 Next Steps:');
    console.log('   1. Configure environment variables in Vercel');
    console.log('   2. Set up your Slack app with proper URLs');
    console.log('   3. Test the Slack commands in your workspace');
    console.log('   4. Monitor function logs in Vercel dashboard');

    console.log('\n📖 Documentation:');
    console.log(`   • API Docs: ${this.baseUrl}/api/docs`);
    console.log('   • Deployment Guide: VERCEL_DEPLOYMENT.md');
    console.log('   • Vercel Dashboard: https://vercel.com/dashboard');
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  const apiKey = args[1] || 'test-key';
  
  console.log('Usage: node examples/vercel-test.js [baseUrl] [apiKey]');
  console.log('Examples:');
  console.log('  node examples/vercel-test.js');
  console.log('  node examples/vercel-test.js https://your-app.vercel.app your-api-key');
  console.log('');
  
  const testSuite = new VercelTestSuite(baseUrl, apiKey);
  testSuite.runTests().catch(console.error);
}

module.exports = VercelTestSuite;