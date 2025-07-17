const { App } = require('@slack/bolt');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ChannelGrouperService = require('./services/channelGrouper');
const SlashCommandHandler = require('./slack/commands');
const APIRoutes = require('./api/routes');
const logger = require('./config/logger');

class SlackChannelGrouperBot {
  constructor() {
    // Initialize services
    this.channelGrouper = new ChannelGrouperService(process.env.SLACK_BOT_TOKEN);
    this.commandHandler = new SlashCommandHandler(this.channelGrouper);
    
    // Initialize Slack app
    this.slackApp = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
      appToken: process.env.SLACK_APP_TOKEN,
      port: process.env.PORT || 3000,
    });

    // Initialize Express app for API
    this.expressApp = express();
    this.apiRoutes = new APIRoutes(this.channelGrouper);
    
    this.setupSlackHandlers();
    this.setupExpressRoutes();
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  setupSlackHandlers() {
    // Handle the main slash command
    this.slackApp.command('/group-channels', async (args) => {
      await this.commandHandler.handleGroupChannels(args);
    });

    // Handle interactive button clicks
    this.slackApp.action(/^(apply_group_|try_pattern)/, async (args) => {
      await this.commandHandler.handleInteractiveActions(args);
    });

    // Handle app home opened (optional - for user onboarding)
    this.slackApp.event('app_home_opened', async ({ event, client }) => {
      try {
        const result = await client.views.publish({
          user_id: event.user,
          view: {
            type: 'home',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Welcome to Channel Grouper Bot! 🚀*\n\nI help you organize and find Slack channels using powerful regex patterns.'
                }
              },
              {
                type: 'divider'
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Quick Start:*\n• Use `/group-channels search <pattern>` to find channels\n• Use `/group-channels help` for all commands\n• Use `/group-channels suggestions` for pattern ideas'
                }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'View Help'
                    },
                    action_id: 'show_help',
                    style: 'primary'
                  },
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'Get Suggestions'
                    },
                    action_id: 'show_suggestions'
                  }
                ]
              }
            ]
          }
        });
      } catch (error) {
        logger.error('Error publishing home view:', error);
      }
    });

    // Handle home view button clicks
    this.slackApp.action('show_help', async ({ ack, respond }) => {
      await ack();
      await this.commandHandler.handleHelp(respond);
    });

    this.slackApp.action('show_suggestions', async ({ ack, respond }) => {
      await ack();
      await this.commandHandler.handleSuggestions(respond);
    });

    // Error handling
    this.slackApp.error((error) => {
      logger.error('Slack app error:', error);
    });
  }

  setupExpressRoutes() {
    // Health check
    this.expressApp.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          slack: 'running',
          api: 'running'
        }
      });
    });

    // API routes
    this.expressApp.use('/api', this.apiRoutes.getRouter());

    // Serve documentation
    this.expressApp.get('/', (req, res) => {
      res.json({
        name: 'Slack Channel Grouper Bot',
        version: '1.0.0',
        description: 'A bot that groups Slack channels using regex patterns',
        endpoints: {
          health: '/health',
          api: '/api',
          documentation: '/api/docs'
        },
        slack: {
          command: '/group-channels',
          description: 'Use this command in Slack to group channels by regex patterns'
        },
        mcp: {
          description: 'Run `npm run mcp` to start the MCP server',
          tools: [
            'group_channels_by_regex',
            'get_all_channels',
            'save_channel_group',
            'get_user_groups',
            'apply_saved_group',
            'delete_saved_group',
            'get_pattern_suggestions'
          ]
        }
      });
    });

    // Error handling for Express
    this.expressApp.use((error, req, res, next) => {
      logger.error('Express error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  async start() {
    try {
      // Start Slack app
      await this.slackApp.start();
      logger.info('⚡️ Slack Channel Grouper Bot is running!');

      // Start Express server
      const port = process.env.PORT || 3000;
      this.expressApp.listen(port, () => {
        logger.info(`🌐 API server running on port ${port}`);
        logger.info(`📖 API documentation available at http://localhost:${port}/api/docs`);
      });

      // Log startup information
      logger.info('🤖 Available features:');
      logger.info('  - Slack slash command: /group-channels');
      logger.info('  - REST API: /api/*');
      logger.info('  - MCP server: npm run mcp');
      
      return true;
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      await this.slackApp.stop();
      logger.info('🛑 Slack Channel Grouper Bot stopped');
    } catch (error) {
      logger.error('Error stopping bot:', error);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (global.botInstance) {
    await global.botInstance.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (global.botInstance) {
    await global.botInstance.stop();
  }
  process.exit(0);
});

// Start the bot if this file is run directly
if (require.main === module) {
  const bot = new SlackChannelGrouperBot();
  global.botInstance = bot;
  bot.start();
}

module.exports = SlackChannelGrouperBot;