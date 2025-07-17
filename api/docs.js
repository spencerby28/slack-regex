/**
 * API Documentation endpoint for Vercel
 * Handles GET /api/docs
 */

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const baseUrl = `https://${req.headers.host}`;

  const docs = {
    title: 'Slack Channel Grouper API',
    version: '1.0.0',
    description: 'Serverless API for grouping Slack channels using regex patterns',
    deployment: 'Vercel Serverless',
    baseUrl,
    authentication: {
      type: 'API Key',
      header: 'X-API-Key',
      query: 'api_key',
      description: 'Include your API key in the X-API-Key header or as api_key query parameter'
    },
    endpoints: {
      'GET /api/health': {
        description: 'Health check endpoint',
        parameters: 'None',
        response: 'Health status object',
        example: `${baseUrl}/api/health`
      },
      'GET /api/channels': {
        description: 'Get all channels in the workspace',
        parameters: 'None',
        authentication: 'Required',
        response: 'Array of channel objects',
        example: `${baseUrl}/api/channels`
      },
      'POST /api/channels': {
        description: 'Group channels by regex pattern',
        authentication: 'Required',
        parameters: {
          pattern: 'string (required) - Regex pattern',
          flags: 'string (optional) - Regex flags (default: "i")'
        },
        response: 'Grouping result with matched channels',
        example: `${baseUrl}/api/channels`
      },
      'GET /api/suggestions': {
        description: 'Get suggested regex patterns',
        parameters: 'None',
        authentication: 'Required',
        response: 'Array of pattern suggestions',
        example: `${baseUrl}/api/suggestions`
      },
      'POST /slack/commands': {
        description: 'Slack slash command endpoint',
        parameters: 'Slack command payload',
        authentication: 'Slack signature verification',
        response: 'Slack message response',
        note: 'Configure this URL in your Slack app slash command settings'
      }
    },
    examples: {
      'Get all channels': {
        method: 'GET',
        url: `${baseUrl}/api/channels`,
        headers: {
          'X-API-Key': 'your-api-key-here'
        }
      },
      'Group channels starting with "dev"': {
        method: 'POST',
        url: `${baseUrl}/api/channels`,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-api-key-here'
        },
        body: {
          pattern: '^dev',
          flags: 'i'
        }
      },
      'Get pattern suggestions': {
        method: 'GET',
        url: `${baseUrl}/api/suggestions`,
        headers: {
          'X-API-Key': 'your-api-key-here'
        }
      }
    },
    curlExamples: {
      'Health check': `curl ${baseUrl}/api/health`,
      'Get channels': `curl -H "X-API-Key: your-key" ${baseUrl}/api/channels`,
      'Group channels': `curl -X POST -H "Content-Type: application/json" -H "X-API-Key: your-key" -d '{"pattern":"^dev"}' ${baseUrl}/api/channels`,
      'Get suggestions': `curl -H "X-API-Key: your-key" ${baseUrl}/api/suggestions`
    },
    slackSetup: {
      description: 'To use with Slack, configure these URLs in your Slack app:',
      slashCommand: {
        requestUrl: `${baseUrl}/slack/commands`,
        description: 'Use this URL for the /group-channels slash command'
      },
      environmentVariables: [
        'SLACK_BOT_TOKEN - Your Slack bot token (xoxb-...)',
        'SLACK_SIGNING_SECRET - Your Slack app signing secret',
        'API_SECRET_KEY - Secret key for API authentication'
      ]
    },
    limitations: {
      serverless: 'This is a serverless deployment, so:',
      notes: [
        'No persistent storage for saved groups',
        'Each request is stateless',
        'Cold start latency may occur',
        'Function timeout limit of 30 seconds'
      ]
    },
    support: {
      github: 'https://github.com/your-repo/slack-channel-grouper',
      documentation: 'README.md in the repository',
      issues: 'Create an issue on GitHub for bug reports'
    }
  };

  res.status(200).json(docs);
};