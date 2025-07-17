#!/usr/bin/env node

/**
 * Setup script for Slack Channel Grouper Bot
 * 
 * This script helps users set up the bot by:
 * 1. Checking Node.js version
 * 2. Installing dependencies
 * 3. Creating .env file
 * 4. Providing setup instructions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SetupWizard {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
    this.envExamplePath = path.join(process.cwd(), '.env.example');
  }

  log(message, type = 'info') {
    const symbols = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      question: '❓'
    };
    console.log(`${symbols[type]} ${message}`);
  }

  checkNodeVersion() {
    this.log('Checking Node.js version...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      this.log(`Node.js ${majorVersion} detected. Node.js 16+ is required.`, 'error');
      return false;
    }
    
    this.log(`Node.js ${nodeVersion} ✓`, 'success');
    return true;
  }

  checkDependencies() {
    this.log('Checking package.json...');
    
    if (!fs.existsSync('package.json')) {
      this.log('package.json not found!', 'error');
      return false;
    }
    
    this.log('package.json found ✓', 'success');
    return true;
  }

  installDependencies() {
    this.log('Installing dependencies...');
    
    try {
      execSync('npm install', { stdio: 'inherit' });
      this.log('Dependencies installed ✓', 'success');
      return true;
    } catch (error) {
      this.log('Failed to install dependencies', 'error');
      console.error(error.message);
      return false;
    }
  }

  createEnvFile() {
    this.log('Setting up environment variables...');
    
    if (fs.existsSync(this.envPath)) {
      this.log('.env file already exists', 'warning');
      return true;
    }
    
    if (!fs.existsSync(this.envExamplePath)) {
      this.log('.env.example not found', 'error');
      return false;
    }
    
    try {
      fs.copyFileSync(this.envExamplePath, this.envPath);
      this.log('.env file created ✓', 'success');
      return true;
    } catch (error) {
      this.log('Failed to create .env file', 'error');
      return false;
    }
  }

  createLogsDirectory() {
    this.log('Creating logs directory...');
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      this.log('Logs directory created ✓', 'success');
    } else {
      this.log('Logs directory already exists ✓', 'success');
    }
  }

  displaySlackSetupInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 SLACK APP SETUP INSTRUCTIONS');
    console.log('='.repeat(60));
    
    console.log('\n1. Create a Slack App:');
    console.log('   • Go to https://api.slack.com/apps');
    console.log('   • Click "Create New App" → "From scratch"');
    console.log('   • Name your app "Channel Grouper Bot"');
    console.log('   • Select your workspace');
    
    console.log('\n2. Enable Socket Mode:');
    console.log('   • Go to "Socket Mode" in the sidebar');
    console.log('   • Enable Socket Mode');
    console.log('   • Generate an App-Level Token');
    console.log('   • Copy the token (starts with xapp-)');
    
    console.log('\n3. Set OAuth Scopes:');
    console.log('   • Go to "OAuth & Permissions"');
    console.log('   • Add these Bot Token Scopes:');
    console.log('     - channels:read');
    console.log('     - groups:read');
    console.log('     - commands');
    console.log('     - chat:write');
    
    console.log('\n4. Create Slash Command:');
    console.log('   • Go to "Slash Commands"');
    console.log('   • Click "Create New Command"');
    console.log('   • Command: /group-channels');
    console.log('   • Request URL: https://your-domain.com/slack/events');
    console.log('   • Description: Group channels with regex patterns');
    
    console.log('\n5. Install to Workspace:');
    console.log('   • Go to "Install App"');
    console.log('   • Click "Install to Workspace"');
    console.log('   • Copy the Bot User OAuth Token (starts with xoxb-)');
    
    console.log('\n6. Get Signing Secret:');
    console.log('   • Go to "Basic Information"');
    console.log('   • Copy the Signing Secret');
  }

  displayEnvConfiguration() {
    console.log('\n' + '='.repeat(60));
    console.log('⚙️  ENVIRONMENT CONFIGURATION');
    console.log('='.repeat(60));
    
    console.log('\nEdit the .env file with your Slack credentials:');
    console.log('');
    console.log('SLACK_BOT_TOKEN=xoxb-your-bot-token-here');
    console.log('SLACK_SIGNING_SECRET=your-signing-secret-here');
    console.log('SLACK_APP_TOKEN=xapp-your-app-token-here');
    console.log('');
    console.log('API_SECRET_KEY=your-secure-api-key-here');
    console.log('');
    
    this.log('Generate a secure API key for the REST API', 'warning');
    this.log('You can use: openssl rand -hex 32', 'info');
  }

  displayStartupInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STARTUP INSTRUCTIONS');
    console.log('='.repeat(60));
    
    console.log('\nAfter configuring your .env file:');
    console.log('');
    console.log('1. Start the main bot (Slack + API):');
    console.log('   npm start');
    console.log('');
    console.log('2. Start in development mode:');
    console.log('   npm run dev');
    console.log('');
    console.log('3. Start only the MCP server:');
    console.log('   npm run mcp');
    console.log('');
    console.log('4. Test the API:');
    console.log('   node examples/api-demo.js');
    console.log('');
    
    console.log('📖 Documentation:');
    console.log('   • README.md - Complete documentation');
    console.log('   • http://localhost:3000/api/docs - API documentation');
    console.log('   • /group-channels help - Slack command help');
  }

  displayTestingInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING THE BOT');
    console.log('='.repeat(60));
    
    console.log('\n1. Test in Slack:');
    console.log('   /group-channels help');
    console.log('   /group-channels search ^general');
    console.log('   /group-channels suggestions');
    
    console.log('\n2. Test the API:');
    console.log('   curl http://localhost:3000/health');
    console.log('');
    console.log('   curl -X POST http://localhost:3000/api/channels/group \\');
    console.log('     -H "X-API-Key: your-api-key" \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"pattern": "^general"}\'');
    
    console.log('\n3. Test the MCP server:');
    console.log('   The MCP server runs via stdio transport');
    console.log('   Integrate it with your AI model or MCP client');
  }

  async run() {
    console.log('🚀 Welcome to Slack Channel Grouper Bot Setup!\n');
    
    // Check prerequisites
    if (!this.checkNodeVersion()) {
      process.exit(1);
    }
    
    if (!this.checkDependencies()) {
      process.exit(1);
    }
    
    // Install dependencies
    if (!this.installDependencies()) {
      process.exit(1);
    }
    
    // Setup files
    this.createLogsDirectory();
    this.createEnvFile();
    
    // Display instructions
    this.displaySlackSetupInstructions();
    this.displayEnvConfiguration();
    this.displayStartupInstructions();
    this.displayTestingInstructions();
    
    console.log('\n' + '='.repeat(60));
    this.log('Setup completed! Follow the instructions above to finish configuration.', 'success');
    console.log('='.repeat(60));
    
    console.log('\n📚 Need help? Check out:');
    console.log('   • README.md for detailed documentation');
    console.log('   • GitHub issues for support');
    console.log('   • Slack API documentation: https://api.slack.com/');
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  const setup = new SetupWizard();
  setup.run().catch(console.error);
}

module.exports = SetupWizard;