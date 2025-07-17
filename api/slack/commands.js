/**
 * Slack slash commands endpoint for Vercel
 * Handles /group-channels command
 */

const crypto = require('crypto');
const qs = require('querystring');
const ChannelGrouperService = require('../../lib/channelGrouper');

// Verify Slack request signature
function verifySlackSignature(rawBody, signature, timestamp) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    throw new Error('SLACK_SIGNING_SECRET not configured');
  }

  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    throw new Error('Request timestamp too old');
  }

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex')}`;

  if (signature !== mySignature) {
    throw new Error('Invalid signature');
  }
}

// Parse command arguments
function parseCommand(text) {
  const args = text.trim().split(/\s+/);
  const command = args[0] || 'help';
  const params = args.slice(1);
  
  return { command, params, rawText: text };
}

// Handle search/group command
async function handleSearch(channelGrouper, params) {
  if (params.length === 0) {
    return {
      text: '❌ Please provide a regex pattern. Example: `/group-channels search ^dev`',
      response_type: 'ephemeral'
    };
  }

  const pattern = params.join(' ');
  const result = await channelGrouper.groupChannelsByRegex(pattern);
  const formatted = channelGrouper.formatChannelsForSlack(result);

  return {
    ...formatted,
    response_type: 'in_channel'
  };
}

// Handle suggestions command
async function handleSuggestions(channelGrouper) {
  const suggestions = channelGrouper.getSuggestions();

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
      }
    });
  });

  return {
    text: 'Channel grouping suggestions',
    blocks,
    response_type: 'ephemeral'
  };
}

// Handle help command
async function handleHelp() {
  const helpText = `
*🤖 Channel Grouper Bot Help*

*Available Commands:*
• \`/group-channels search <regex>\` - Find channels matching a regex pattern
• \`/group-channels suggestions\` - View common grouping patterns
• \`/group-channels help\` - Show this help message

*Examples:*
• \`/group-channels search ^dev\` - Find channels starting with "dev"
• \`/group-channels search team-\` - Find channels containing "team-"
• \`/group-channels search (temp|test)\` - Find temporary or test channels

*Regex Tips:*
• \`^\` - Start of channel name
• \`$\` - End of channel name
• \`|\` - OR operator
• \`()\` - Grouping
• \`[]\` - Character sets

*Note:* In serverless mode, saved groups are not available. Use the pattern directly each time.
  `;

  return {
    text: helpText,
    response_type: 'ephemeral'
  };
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Slack-Signature, X-Slack-Request-Timestamp');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get raw body for signature verification
    let rawBody = '';
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString();
    } else {
      rawBody = JSON.stringify(req.body);
    }

    // Verify Slack signature
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    
    if (signature && timestamp) {
      verifySlackSignature(rawBody, signature, timestamp);
    }

    // Parse form data
    const body = typeof req.body === 'string' ? qs.parse(req.body) : req.body;
    
    const { command: cmd, params } = parseCommand(body.text || '');
    
    console.log(`User ${body.user_id} executed command: ${cmd} with params: ${params.join(' ')}`);

    // Initialize channel grouper
    const channelGrouper = new ChannelGrouperService(process.env.SLACK_BOT_TOKEN);

    let response;

    switch (cmd) {
      case 'search':
      case 'group':
        response = await handleSearch(channelGrouper, params);
        break;
      
      case 'suggestions':
      case 'suggest':
        response = await handleSuggestions(channelGrouper);
        break;
      
      case 'help':
      default:
        response = await handleHelp();
        break;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error handling slash command:', error);
    
    res.status(200).json({
      text: `❌ Error: ${error.message}`,
      response_type: 'ephemeral'
    });
  }
};