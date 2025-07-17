/**
 * Main Vercel API endpoint
 * Serves as the homepage and documentation
 */

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const baseUrl = `https://${req.headers.host}`;
  
  const response = {
    name: 'Slack Channel Grouper Bot',
    version: '1.0.0',
    description: 'A serverless bot that groups Slack channels using regex patterns',
    deployment: 'Vercel Serverless',
    endpoints: {
      health: `${baseUrl}/api/health`,
      channels: `${baseUrl}/api/channels`,
      groups: `${baseUrl}/api/groups`,
      suggestions: `${baseUrl}/api/suggestions`,
      documentation: `${baseUrl}/api/docs`,
      slack: {
        commands: `${baseUrl}/slack/commands`,
        events: `${baseUrl}/slack/events`,
        interactive: `${baseUrl}/slack/interactive`
      }
    },
    slack: {
      command: '/group-channels',
      description: 'Use this command in Slack to group channels by regex patterns',
      setup: {
        requestUrl: `${baseUrl}/slack/commands`,
        interactiveUrl: `${baseUrl}/slack/interactive`
      }
    },
    authentication: {
      api: 'Include X-API-Key header or api_key query parameter',
      slack: 'Configure SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET environment variables'
    },
    github: 'https://github.com/your-repo/slack-channel-grouper',
    documentation: `${baseUrl}/api/docs`
  };

  res.status(200).json(response);
};