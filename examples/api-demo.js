#!/usr/bin/env node

/**
 * Demo script for the Slack Channel Grouper Bot API
 * 
 * This script demonstrates how to use the REST API to:
 * 1. Get all channels
 * 2. Group channels by regex patterns
 * 3. Save and manage channel groups
 * 4. Get pattern suggestions
 */

const https = require('https');
const http = require('http');

class APIDemo {
  constructor(baseUrl = 'http://localhost:3000', apiKey = 'demo-key') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.userId = 'U123456789'; // Demo user ID
  }

  async makeRequest(path, method = 'GET', data = null) {
    const url = new URL(path, this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Slack Channel Grouper Demo'
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
              data: parsed
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
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

  async healthCheck() {
    console.log('🏥 Checking API health...');
    const response = await this.makeRequest('/api/health');
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200;
  }

  async getAllChannels() {
    console.log('\n📋 Getting all channels...');
    const response = await this.makeRequest('/api/channels');
    
    if (response.status === 200) {
      const { totalChannels, channels } = response.data.data;
      console.log(`Found ${totalChannels} channels`);
      
      // Show first 5 channels as sample
      const sample = channels.slice(0, 5);
      console.log('Sample channels:');
      sample.forEach(channel => {
        console.log(`  • ${channel.name} (${channel.is_private ? 'private' : 'public'})`);
      });
    } else {
      console.log('Error:', response.data);
    }
    
    return response;
  }

  async groupChannelsByPattern(pattern, flags = 'i') {
    console.log(`\n🔍 Grouping channels with pattern: ${pattern}`);
    const response = await this.makeRequest('/api/channels/group', 'POST', {
      pattern,
      flags
    });
    
    if (response.status === 200) {
      const result = response.data.data;
      console.log(`Pattern: ${result.pattern}`);
      console.log(`Total channels: ${result.totalChannels}`);
      console.log(`Matched channels: ${result.matchedChannels}`);
      
      if (result.matchedChannels > 0) {
        console.log('Matching channels:');
        result.channels.slice(0, 10).forEach(channel => {
          console.log(`  • ${channel.name} (${channel.is_private ? 'private' : 'public'})`);
        });
        
        if (result.channels.length > 10) {
          console.log(`  ... and ${result.channels.length - 10} more`);
        }
      }
    } else {
      console.log('Error:', response.data);
    }
    
    return response;
  }

  async saveGroup(groupName, pattern, flags = 'i') {
    console.log(`\n💾 Saving group "${groupName}" with pattern: ${pattern}`);
    const response = await this.makeRequest(`/api/groups/${this.userId}`, 'POST', {
      groupName,
      pattern,
      flags
    });
    
    if (response.status === 200) {
      console.log(`✅ Group "${groupName}" saved successfully`);
    } else {
      console.log('Error:', response.data);
    }
    
    return response;
  }

  async getUserGroups() {
    console.log(`\n📂 Getting saved groups for user ${this.userId}...`);
    const response = await this.makeRequest(`/api/groups/${this.userId}`);
    
    if (response.status === 200) {
      const { groups } = response.data.data;
      console.log(`Found ${groups.length} saved groups:`);
      
      groups.forEach(group => {
        console.log(`  • ${group.name}: ${group.pattern} (${group.flags})`);
      });
    } else {
      console.log('Error:', response.data);
    }
    
    return response;
  }

  async applySavedGroup(groupName) {
    console.log(`\n🎯 Applying saved group "${groupName}"...`);
    const response = await this.makeRequest(`/api/groups/${this.userId}/${groupName}/apply`, 'POST');
    
    if (response.status === 200) {
      const result = response.data.data;
      console.log(`Applied pattern: ${result.pattern}`);
      console.log(`Matched channels: ${result.matchedChannels}`);
      
      if (result.matchedChannels > 0) {
        console.log('Matching channels:');
        result.channels.slice(0, 5).forEach(channel => {
          console.log(`  • ${channel.name}`);
        });
      }
    } else {
      console.log('Error:', response.data);
    }
    
    return response;
  }

  async getPatternSuggestions() {
    console.log('\n💡 Getting pattern suggestions...');
    const response = await this.makeRequest('/api/suggestions');
    
    if (response.status === 200) {
      const { suggestions } = response.data.data;
      console.log('Available pattern suggestions:');
      
      suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion.name}`);
        console.log(`    Pattern: ${suggestion.pattern}`);
        console.log(`    Description: ${suggestion.description}`);
        console.log('');
      });
    } else {
      console.log('Error:', response.data);
    }
    
    return response;
  }

  async deleteGroup(groupName) {
    console.log(`\n🗑️ Deleting group "${groupName}"...`);
    const response = await this.makeRequest(`/api/groups/${this.userId}/${groupName}`, 'DELETE');
    
    if (response.status === 200) {
      console.log(`✅ Group "${groupName}" deleted successfully`);
    } else {
      console.log('Error:', response.data);
    }
    
    return response;
  }

  async runDemo() {
    console.log('🚀 Starting Slack Channel Grouper API Demo\n');
    console.log('This demo will show you how to use the REST API');
    console.log('Make sure the bot is running on', this.baseUrl);
    console.log('=' .repeat(60));

    try {
      // 1. Health check
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        console.log('❌ API is not healthy. Make sure the bot is running.');
        return;
      }

      // 2. Get all channels
      await this.getAllChannels();

      // 3. Try some pattern matching
      await this.groupChannelsByPattern('^dev');
      await this.groupChannelsByPattern('team-');
      await this.groupChannelsByPattern('(test|temp)');

      // 4. Save some groups
      await this.saveGroup('dev-channels', '^(dev|development|engineering)');
      await this.saveGroup('team-channels', 'team-');

      // 5. List saved groups
      await this.getUserGroups();

      // 6. Apply a saved group
      await this.applySavedGroup('dev-channels');

      // 7. Get suggestions
      await this.getPatternSuggestions();

      // 8. Cleanup - delete demo groups
      await this.deleteGroup('dev-channels');
      await this.deleteGroup('team-channels');

      console.log('\n🎉 Demo completed successfully!');
      console.log('\nNext steps:');
      console.log('• Set up your Slack bot tokens in .env');
      console.log('• Create your slash command in Slack');
      console.log('• Try the patterns in your Slack workspace');

    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      console.log('\nTroubleshooting:');
      console.log('• Make sure the bot is running: npm start');
      console.log('• Check your API key in the script');
      console.log('• Verify the base URL is correct');
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  const demo = new APIDemo();
  demo.runDemo();
}

module.exports = APIDemo;