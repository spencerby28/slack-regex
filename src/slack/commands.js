const logger = require('../config/logger');

class SlashCommandHandler {
  constructor(channelGrouper) {
    this.channelGrouper = channelGrouper;
  }

  /**
   * Parse command arguments
   */
  parseCommand(text) {
    const args = text.trim().split(/\s+/);
    const command = args[0] || 'help';
    const params = args.slice(1);
    
    return { command, params, rawText: text };
  }

  /**
   * Main slash command handler
   */
  async handleGroupChannels({ command, ack, respond, body }) {
    await ack();
    
    try {
      const { command: cmd, params } = this.parseCommand(command.text);
      const userId = body.user_id;
      
      logger.info(`User ${userId} executed command: ${cmd} with params: ${params.join(' ')}`);

      switch (cmd) {
        case 'search':
        case 'group':
          await this.handleSearch(respond, params);
          break;
        
        case 'save':
          await this.handleSave(respond, userId, params);
          break;
        
        case 'list':
          await this.handleList(respond, userId);
          break;
        
        case 'delete':
        case 'remove':
          await this.handleDelete(respond, userId, params);
          break;
        
        case 'apply':
        case 'use':
          await this.handleApply(respond, userId, params);
          break;
        
        case 'suggestions':
        case 'suggest':
          await this.handleSuggestions(respond);
          break;
        
        case 'help':
        default:
          await this.handleHelp(respond);
          break;
      }
    } catch (error) {
      logger.error('Error handling slash command:', error);
      await respond({
        text: `❌ Error: ${error.message}`,
        response_type: 'ephemeral'
      });
    }
  }

  /**
   * Handle search/group command
   */
  async handleSearch(respond, params) {
    if (params.length === 0) {
      await respond({
        text: '❌ Please provide a regex pattern. Example: `/group-channels search ^dev`',
        response_type: 'ephemeral'
      });
      return;
    }

    const pattern = params.join(' ');
    const result = await this.channelGrouper.groupChannelsByRegex(pattern);
    const formatted = this.channelGrouper.formatChannelsForSlack(result);

    await respond({
      ...formatted,
      response_type: 'in_channel'
    });
  }

  /**
   * Handle save command
   */
  async handleSave(respond, userId, params) {
    if (params.length < 2) {
      await respond({
        text: '❌ Please provide a group name and regex pattern. Example: `/group-channels save "dev-channels" ^dev`',
        response_type: 'ephemeral'
      });
      return;
    }

    const groupName = params[0].replace(/"/g, '');
    const pattern = params.slice(1).join(' ');

    // Test the regex pattern first
    try {
      new RegExp(pattern);
    } catch (error) {
      await respond({
        text: `❌ Invalid regex pattern: ${error.message}`,
        response_type: 'ephemeral'
      });
      return;
    }

    this.channelGrouper.saveGroup(userId, groupName, pattern);

    await respond({
      text: `✅ Group "${groupName}" saved with pattern: \`${pattern}\``,
      response_type: 'ephemeral'
    });
  }

  /**
   * Handle list command
   */
  async handleList(respond, userId) {
    const groups = this.channelGrouper.getUserGroups(userId);

    if (groups.length === 0) {
      await respond({
        text: '📝 You have no saved channel groups. Use `/group-channels save` to create one.',
        response_type: 'ephemeral'
      });
      return;
    }

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Your Saved Channel Groups:*'
        }
      },
      {
        type: 'divider'
      }
    ];

    groups.forEach(group => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${group.name}*\nPattern: \`${group.pattern}\`\nCreated: ${group.createdAt.toLocaleDateString()}`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Apply'
          },
          action_id: `apply_group_${group.name}`,
          value: group.name
        }
      });
    });

    await respond({
      text: 'Your saved channel groups',
      blocks,
      response_type: 'ephemeral'
    });
  }

  /**
   * Handle delete command
   */
  async handleDelete(respond, userId, params) {
    if (params.length === 0) {
      await respond({
        text: '❌ Please provide a group name to delete. Example: `/group-channels delete "dev-channels"`',
        response_type: 'ephemeral'
      });
      return;
    }

    const groupName = params.join(' ').replace(/"/g, '');
    const deleted = this.channelGrouper.deleteGroup(userId, groupName);

    if (deleted) {
      await respond({
        text: `✅ Group "${groupName}" has been deleted.`,
        response_type: 'ephemeral'
      });
    } else {
      await respond({
        text: `❌ Group "${groupName}" not found.`,
        response_type: 'ephemeral'
      });
    }
  }

  /**
   * Handle apply command
   */
  async handleApply(respond, userId, params) {
    if (params.length === 0) {
      await respond({
        text: '❌ Please provide a group name to apply. Example: `/group-channels apply "dev-channels"`',
        response_type: 'ephemeral'
      });
      return;
    }

    const groupName = params.join(' ').replace(/"/g, '');
    
    try {
      const result = await this.channelGrouper.applySavedGroup(userId, groupName);
      const formatted = this.channelGrouper.formatChannelsForSlack(result);

      await respond({
        ...formatted,
        response_type: 'in_channel'
      });
    } catch (error) {
      await respond({
        text: `❌ ${error.message}`,
        response_type: 'ephemeral'
      });
    }
  }

  /**
   * Handle suggestions command
   */
  async handleSuggestions(respond) {
    const suggestions = this.channelGrouper.getSuggestions();

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🔍 Suggested Channel Grouping Patterns:*'
        }
      },
      {
        type: 'divider'
      }
    ];

    suggestions.forEach(suggestion => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${suggestion.name}*\n\`${suggestion.pattern}\`\n_${suggestion.description}_`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Try Pattern'
          },
          action_id: `try_pattern`,
          value: suggestion.pattern
        }
      });
    });

    await respond({
      text: 'Channel grouping suggestions',
      blocks,
      response_type: 'ephemeral'
    });
  }

  /**
   * Handle help command
   */
  async handleHelp(respond) {
    const helpText = `
*🤖 Channel Grouper Bot Help*

*Basic Commands:*
• \`/group-channels search <regex>\` - Find channels matching a regex pattern
• \`/group-channels suggestions\` - View common grouping patterns

*Saved Groups:*
• \`/group-channels save "<name>" <regex>\` - Save a regex pattern with a name
• \`/group-channels list\` - View your saved groups
• \`/group-channels apply "<name>"\` - Apply a saved group
• \`/group-channels delete "<name>"\` - Delete a saved group

*Examples:*
• \`/group-channels search ^dev\` - Find channels starting with "dev"
• \`/group-channels search team-\` - Find channels containing "team-"
• \`/group-channels save "dev-channels" ^(dev|eng|api)\` - Save a pattern for development channels
• \`/group-channels apply "dev-channels"\` - Use your saved "dev-channels" pattern

*Regex Tips:*
• \`^\` - Start of channel name
• \`$\` - End of channel name
• \`|\` - OR operator
• \`()\` - Grouping
• \`[]\` - Character sets
    `;

    await respond({
      text: helpText,
      response_type: 'ephemeral'
    });
  }

  /**
   * Handle interactive button clicks
   */
  async handleInteractiveActions({ action, ack, respond, body }) {
    await ack();

    try {
      const actionId = action.action_id;
      const userId = body.user.id;

      if (actionId.startsWith('apply_group_')) {
        const groupName = action.value;
        const result = await this.channelGrouper.applySavedGroup(userId, groupName);
        const formatted = this.channelGrouper.formatChannelsForSlack(result);

        await respond({
          ...formatted,
          response_type: 'in_channel',
          replace_original: false
        });
      } else if (actionId === 'try_pattern') {
        const pattern = action.value;
        const result = await this.channelGrouper.groupChannelsByRegex(pattern);
        const formatted = this.channelGrouper.formatChannelsForSlack(result);

        await respond({
          ...formatted,
          response_type: 'in_channel',
          replace_original: false
        });
      }
    } catch (error) {
      logger.error('Error handling interactive action:', error);
      await respond({
        text: `❌ Error: ${error.message}`,
        response_type: 'ephemeral'
      });
    }
  }
}

module.exports = SlashCommandHandler;