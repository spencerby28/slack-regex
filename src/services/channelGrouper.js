const { WebClient } = require('@slack/web-api');
const logger = require('../config/logger');

class ChannelGrouperService {
  constructor(token) {
    this.slack = new WebClient(token);
    this.groups = new Map(); // Store user-defined groups
  }

  /**
   * Get all channels in the workspace
   */
  async getAllChannels() {
    try {
      const result = await this.slack.conversations.list({
        types: 'public_channel,private_channel',
        limit: 1000
      });
      
      return result.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private,
        is_archived: channel.is_archived,
        topic: channel.topic?.value || '',
        purpose: channel.purpose?.value || ''
      }));
    } catch (error) {
      logger.error('Error fetching channels:', error);
      throw new Error('Failed to fetch channels');
    }
  }

  /**
   * Group channels by regex pattern
   */
  async groupChannelsByRegex(pattern, flags = 'i') {
    try {
      const regex = new RegExp(pattern, flags);
      const channels = await this.getAllChannels();
      
      const matchedChannels = channels.filter(channel => {
        return regex.test(channel.name) || 
               regex.test(channel.topic) || 
               regex.test(channel.purpose);
      });

      return {
        pattern,
        flags,
        totalChannels: channels.length,
        matchedChannels: matchedChannels.length,
        channels: matchedChannels
      };
    } catch (error) {
      logger.error('Error grouping channels:', error);
      if (error.message.includes('Invalid regular expression')) {
        throw new Error('Invalid regex pattern provided');
      }
      throw new Error('Failed to group channels');
    }
  }

  /**
   * Save a named group
   */
  saveGroup(userId, groupName, pattern, flags = 'i') {
    const userGroups = this.groups.get(userId) || new Map();
    userGroups.set(groupName, { pattern, flags, createdAt: new Date() });
    this.groups.set(userId, userGroups);
    
    logger.info(`Group '${groupName}' saved for user ${userId}`);
    return true;
  }

  /**
   * Get saved groups for a user
   */
  getUserGroups(userId) {
    const userGroups = this.groups.get(userId) || new Map();
    return Array.from(userGroups.entries()).map(([name, config]) => ({
      name,
      pattern: config.pattern,
      flags: config.flags,
      createdAt: config.createdAt
    }));
  }

  /**
   * Delete a saved group
   */
  deleteGroup(userId, groupName) {
    const userGroups = this.groups.get(userId);
    if (!userGroups || !userGroups.has(groupName)) {
      return false;
    }
    
    userGroups.delete(groupName);
    if (userGroups.size === 0) {
      this.groups.delete(userId);
    }
    
    logger.info(`Group '${groupName}' deleted for user ${userId}`);
    return true;
  }

  /**
   * Apply a saved group
   */
  async applySavedGroup(userId, groupName) {
    const userGroups = this.groups.get(userId);
    if (!userGroups || !userGroups.has(groupName)) {
      throw new Error(`Group '${groupName}' not found`);
    }
    
    const config = userGroups.get(groupName);
    return await this.groupChannelsByRegex(config.pattern, config.flags);
  }

  /**
   * Get group suggestions based on common patterns
   */
  getSuggestions() {
    return [
      {
        name: 'Engineering Channels',
        pattern: '^(dev|eng|engineering|tech|api|backend|frontend)',
        description: 'Channels starting with development-related keywords'
      },
      {
        name: 'Project Channels',
        pattern: 'project-|proj-',
        description: 'Channels containing project prefixes'
      },
      {
        name: 'Team Channels',
        pattern: 'team-|^(sales|marketing|hr|design|product)',
        description: 'Team-specific channels'
      },
      {
        name: 'Temporary Channels',
        pattern: '(temp|tmp|test|sandbox)',
        description: 'Temporary or testing channels'
      },
      {
        name: 'Date-based Channels',
        pattern: '\\d{4}|202[0-9]|q[1-4]',
        description: 'Channels with years or quarters'
      }
    ];
  }

  /**
   * Format channels for Slack display
   */
  formatChannelsForSlack(groupResult, limit = 20) {
    const { pattern, matchedChannels, channels } = groupResult;
    
    if (matchedChannels === 0) {
      return {
        text: `No channels found matching pattern: \`${pattern}\``,
        blocks: []
      };
    }

    const displayChannels = channels.slice(0, limit);
    const hasMore = channels.length > limit;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Found ${matchedChannels} channels matching pattern:* \`${pattern}\``
        }
      },
      {
        type: 'divider'
      }
    ];

    // Group channels by type
    const publicChannels = displayChannels.filter(ch => !ch.is_private);
    const privateChannels = displayChannels.filter(ch => ch.is_private);

    if (publicChannels.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Public Channels (${publicChannels.length}):*\n${publicChannels.map(ch => 
            `• <#${ch.id}|${ch.name}>${ch.is_archived ? ' (archived)' : ''}`
          ).join('\n')}`
        }
      });
    }

    if (privateChannels.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Private Channels (${privateChannels.length}):*\n${privateChannels.map(ch => 
            `• #${ch.name}${ch.is_archived ? ' (archived)' : ''}`
          ).join('\n')}`
        }
      });
    }

    if (hasMore) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Showing first ${limit} channels. ${channels.length - limit} more channels match this pattern._`
          }
        ]
      });
    }

    return {
      text: `Found ${matchedChannels} channels matching pattern: ${pattern}`,
      blocks
    };
  }
}

module.exports = ChannelGrouperService;