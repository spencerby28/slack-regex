const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const ChannelGrouperService = require('./services/channelGrouper');
const logger = require('./config/logger');

require('dotenv').config();

class MCPChannelGrouperServer {
  constructor() {
    this.server = new Server(
      {
        name: 'slack-channel-grouper',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.channelGrouper = new ChannelGrouperService(process.env.SLACK_BOT_TOKEN);
    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'group_channels_by_regex',
            description: 'Group Slack channels using a regex pattern',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: 'Regex pattern to match channel names, topics, or purposes',
                },
                flags: {
                  type: 'string',
                  description: 'Regex flags (default: "i" for case-insensitive)',
                  default: 'i',
                },
              },
              required: ['pattern'],
            },
          },
          {
            name: 'get_all_channels',
            description: 'Get all channels in the Slack workspace',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'save_channel_group',
            description: 'Save a named channel group with a regex pattern',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID to associate the group with',
                },
                groupName: {
                  type: 'string',
                  description: 'Name for the saved group',
                },
                pattern: {
                  type: 'string',
                  description: 'Regex pattern for the group',
                },
                flags: {
                  type: 'string',
                  description: 'Regex flags (default: "i")',
                  default: 'i',
                },
              },
              required: ['userId', 'groupName', 'pattern'],
            },
          },
          {
            name: 'get_user_groups',
            description: 'Get all saved groups for a user',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID to get groups for',
                },
              },
              required: ['userId'],
            },
          },
          {
            name: 'apply_saved_group',
            description: 'Apply a saved group pattern to find matching channels',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID who owns the group',
                },
                groupName: {
                  type: 'string',
                  description: 'Name of the saved group to apply',
                },
              },
              required: ['userId', 'groupName'],
            },
          },
          {
            name: 'delete_saved_group',
            description: 'Delete a saved channel group',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID who owns the group',
                },
                groupName: {
                  type: 'string',
                  description: 'Name of the group to delete',
                },
              },
              required: ['userId', 'groupName'],
            },
          },
          {
            name: 'get_pattern_suggestions',
            description: 'Get suggested regex patterns for common channel groupings',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'group_channels_by_regex':
            return await this.handleGroupChannelsByRegex(args);
          
          case 'get_all_channels':
            return await this.handleGetAllChannels(args);
          
          case 'save_channel_group':
            return await this.handleSaveChannelGroup(args);
          
          case 'get_user_groups':
            return await this.handleGetUserGroups(args);
          
          case 'apply_saved_group':
            return await this.handleApplySavedGroup(args);
          
          case 'delete_saved_group':
            return await this.handleDeleteSavedGroup(args);
          
          case 'get_pattern_suggestions':
            return await this.handleGetPatternSuggestions(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error(`Error handling tool call ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async handleGroupChannelsByRegex(args) {
    const { pattern, flags = 'i' } = args;
    
    if (!pattern) {
      throw new McpError(ErrorCode.InvalidParams, 'Pattern is required');
    }

    try {
      const result = await this.channelGrouper.groupChannelsByRegex(pattern, flags);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              pattern,
              flags,
              totalChannels: result.totalChannels,
              matchedChannels: result.matchedChannels,
              channels: result.channels.map(ch => ({
                id: ch.id,
                name: ch.name,
                is_private: ch.is_private,
                is_archived: ch.is_archived,
                topic: ch.topic,
                purpose: ch.purpose
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  async handleGetAllChannels(args) {
    try {
      const channels = await this.channelGrouper.getAllChannels();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              totalChannels: channels.length,
              channels: channels.map(ch => ({
                id: ch.id,
                name: ch.name,
                is_private: ch.is_private,
                is_archived: ch.is_archived,
                topic: ch.topic,
                purpose: ch.purpose
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  async handleSaveChannelGroup(args) {
    const { userId, groupName, pattern, flags = 'i' } = args;
    
    if (!userId || !groupName || !pattern) {
      throw new McpError(ErrorCode.InvalidParams, 'userId, groupName, and pattern are required');
    }

    try {
      // Validate regex pattern
      new RegExp(pattern, flags);
      
      this.channelGrouper.saveGroup(userId, groupName, pattern, flags);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Group "${groupName}" saved successfully for user ${userId}`,
              groupName,
              pattern,
              flags
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      if (error.message.includes('Invalid regular expression')) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid regex pattern: ${error.message}`);
      }
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  async handleGetUserGroups(args) {
    const { userId } = args;
    
    if (!userId) {
      throw new McpError(ErrorCode.InvalidParams, 'userId is required');
    }

    try {
      const groups = this.channelGrouper.getUserGroups(userId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              userId,
              groups: groups.map(group => ({
                name: group.name,
                pattern: group.pattern,
                flags: group.flags,
                createdAt: group.createdAt
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  async handleApplySavedGroup(args) {
    const { userId, groupName } = args;
    
    if (!userId || !groupName) {
      throw new McpError(ErrorCode.InvalidParams, 'userId and groupName are required');
    }

    try {
      const result = await this.channelGrouper.applySavedGroup(userId, groupName);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              groupName,
              pattern: result.pattern,
              flags: result.flags,
              totalChannels: result.totalChannels,
              matchedChannels: result.matchedChannels,
              channels: result.channels.map(ch => ({
                id: ch.id,
                name: ch.name,
                is_private: ch.is_private,
                is_archived: ch.is_archived,
                topic: ch.topic,
                purpose: ch.purpose
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InvalidParams, error.message);
    }
  }

  async handleDeleteSavedGroup(args) {
    const { userId, groupName } = args;
    
    if (!userId || !groupName) {
      throw new McpError(ErrorCode.InvalidParams, 'userId and groupName are required');
    }

    try {
      const deleted = this.channelGrouper.deleteGroup(userId, groupName);
      
      if (deleted) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Group "${groupName}" deleted successfully`
              }, null, 2)
            }
          ]
        };
      } else {
        throw new McpError(ErrorCode.InvalidParams, `Group "${groupName}" not found for user ${userId}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  async handleGetPatternSuggestions(args) {
    try {
      const suggestions = this.channelGrouper.getSuggestions();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              suggestions: suggestions.map(suggestion => ({
                name: suggestion.name,
                pattern: suggestion.pattern,
                description: suggestion.description
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Slack Channel Grouper Server started');
  }
}

// Start the server
if (require.main === module) {
  const server = new MCPChannelGrouperServer();
  server.run().catch((error) => {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

module.exports = MCPChannelGrouperServer;