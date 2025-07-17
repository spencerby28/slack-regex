/**
 * Channels API endpoint for Vercel
 * Handles GET /api/channels and POST /api/channels/group
 */

const ChannelGrouperService = require('../lib/channelGrouper');

// API authentication middleware
function authenticate(req) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedKey = process.env.API_SECRET_KEY;
  
  if (!expectedKey) {
    throw new Error('API key not configured on server');
  }
  
  if (!apiKey || apiKey !== expectedKey) {
    throw new Error('Invalid or missing API key');
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Authenticate request
    authenticate(req);
    
    // Initialize channel grouper
    const channelGrouper = new ChannelGrouperService(process.env.SLACK_BOT_TOKEN);

    if (req.method === 'GET') {
      // Get all channels
      const channels = await channelGrouper.getAllChannels();
      res.status(200).json({
        success: true,
        data: {
          totalChannels: channels.length,
          channels
        }
      });
      
    } else if (req.method === 'POST') {
      // Group channels by pattern
      const { pattern, flags = 'i' } = req.body;
      
      if (!pattern) {
        return res.status(400).json({
          success: false,
          error: 'Pattern is required'
        });
      }

      const result = await channelGrouper.groupChannelsByRegex(pattern, flags);
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Error in channels API:', error);
    
    if (error.message.includes('API key')) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
};