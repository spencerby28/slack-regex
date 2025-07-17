/**
 * Suggestions API endpoint for Vercel
 * Handles GET /api/suggestions
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    return;
  }

  try {
    // Authenticate request
    authenticate(req);
    
    // Get suggestions (no need for Slack token)
    const channelGrouper = new ChannelGrouperService('dummy-token');
    const suggestions = channelGrouper.getSuggestions();
    
    res.status(200).json({
      success: true,
      data: {
        suggestions
      }
    });

  } catch (error) {
    console.error('Error in suggestions API:', error);
    
    if (error.message.includes('API key')) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};