const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('../config/logger');

class APIRoutes {
  constructor(channelGrouper) {
    this.channelGrouper = channelGrouper;
    this.router = express.Router();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.router.use(helmet());
    this.router.use(cors());
    this.router.use(express.json());
    
    // API key authentication middleware
    this.router.use((req, res, next) => {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      const expectedKey = process.env.API_SECRET_KEY;
      
      if (!expectedKey) {
        return res.status(500).json({
          error: 'API key not configured on server'
        });
      }
      
      if (!apiKey || apiKey !== expectedKey) {
        return res.status(401).json({
          error: 'Invalid or missing API key'
        });
      }
      
      next();
    });

    // Request logging
    this.router.use((req, res, next) => {
      logger.info(`API Request: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.router.get('/health', this.handleHealth.bind(this));
    
    // Channel operations
    this.router.get('/channels', this.handleGetAllChannels.bind(this));
    this.router.post('/channels/group', this.handleGroupChannels.bind(this));
    
    // Saved groups operations
    this.router.get('/groups/:userId', this.handleGetUserGroups.bind(this));
    this.router.post('/groups/:userId', this.handleSaveGroup.bind(this));
    this.router.delete('/groups/:userId/:groupName', this.handleDeleteGroup.bind(this));
    this.router.post('/groups/:userId/:groupName/apply', this.handleApplyGroup.bind(this));
    
    // Suggestions
    this.router.get('/suggestions', this.handleGetSuggestions.bind(this));
    
    // Documentation
    this.router.get('/docs', this.handleDocs.bind(this));
  }

  /**
   * Health check endpoint
   */
  async handleHealth(req, res) {
    try {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }

  /**
   * Get all channels
   */
  async handleGetAllChannels(req, res) {
    try {
      const channels = await this.channelGrouper.getAllChannels();
      res.json({
        success: true,
        data: {
          totalChannels: channels.length,
          channels
        }
      });
    } catch (error) {
      logger.error('Error fetching channels:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Group channels by regex
   */
  async handleGroupChannels(req, res) {
    try {
      const { pattern, flags = 'i' } = req.body;
      
      if (!pattern) {
        return res.status(400).json({
          success: false,
          error: 'Pattern is required'
        });
      }

      const result = await this.channelGrouper.groupChannelsByRegex(pattern, flags);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error grouping channels:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's saved groups
   */
  async handleGetUserGroups(req, res) {
    try {
      const { userId } = req.params;
      const groups = this.channelGrouper.getUserGroups(userId);
      
      res.json({
        success: true,
        data: {
          userId,
          groups
        }
      });
    } catch (error) {
      logger.error('Error fetching user groups:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Save a new group
   */
  async handleSaveGroup(req, res) {
    try {
      const { userId } = req.params;
      const { groupName, pattern, flags = 'i' } = req.body;
      
      if (!groupName || !pattern) {
        return res.status(400).json({
          success: false,
          error: 'Group name and pattern are required'
        });
      }

      // Validate regex pattern
      try {
        new RegExp(pattern, flags);
      } catch (regexError) {
        return res.status(400).json({
          success: false,
          error: `Invalid regex pattern: ${regexError.message}`
        });
      }

      this.channelGrouper.saveGroup(userId, groupName, pattern, flags);
      
      res.json({
        success: true,
        data: {
          message: `Group "${groupName}" saved successfully`,
          groupName,
          pattern,
          flags
        }
      });
    } catch (error) {
      logger.error('Error saving group:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete a saved group
   */
  async handleDeleteGroup(req, res) {
    try {
      const { userId, groupName } = req.params;
      const deleted = this.channelGrouper.deleteGroup(userId, groupName);
      
      if (deleted) {
        res.json({
          success: true,
          data: {
            message: `Group "${groupName}" deleted successfully`
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Group "${groupName}" not found`
        });
      }
    } catch (error) {
      logger.error('Error deleting group:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Apply a saved group
   */
  async handleApplyGroup(req, res) {
    try {
      const { userId, groupName } = req.params;
      const result = await this.channelGrouper.applySavedGroup(userId, groupName);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error applying group:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get pattern suggestions
   */
  async handleGetSuggestions(req, res) {
    try {
      const suggestions = this.channelGrouper.getSuggestions();
      
      res.json({
        success: true,
        data: {
          suggestions
        }
      });
    } catch (error) {
      logger.error('Error fetching suggestions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * API documentation
   */
  async handleDocs(req, res) {
    const docs = {
      title: 'Slack Channel Grouper API',
      version: '1.0.0',
      description: 'API for grouping Slack channels using regex patterns',
      authentication: {
        type: 'API Key',
        header: 'X-API-Key',
        description: 'Include your API key in the X-API-Key header or as api_key query parameter'
      },
      endpoints: {
        'GET /api/health': {
          description: 'Health check endpoint',
          parameters: 'None',
          response: 'Health status object'
        },
        'GET /api/channels': {
          description: 'Get all channels in the workspace',
          parameters: 'None',
          response: 'Array of channel objects'
        },
        'POST /api/channels/group': {
          description: 'Group channels by regex pattern',
          parameters: {
            pattern: 'string (required) - Regex pattern',
            flags: 'string (optional) - Regex flags (default: "i")'
          },
          response: 'Grouping result with matched channels'
        },
        'GET /api/groups/:userId': {
          description: 'Get saved groups for a user',
          parameters: {
            userId: 'string (required) - User ID'
          },
          response: 'Array of saved groups'
        },
        'POST /api/groups/:userId': {
          description: 'Save a new group for a user',
          parameters: {
            userId: 'string (required) - User ID',
            groupName: 'string (required) - Name of the group',
            pattern: 'string (required) - Regex pattern',
            flags: 'string (optional) - Regex flags'
          },
          response: 'Success confirmation'
        },
        'DELETE /api/groups/:userId/:groupName': {
          description: 'Delete a saved group',
          parameters: {
            userId: 'string (required) - User ID',
            groupName: 'string (required) - Name of the group to delete'
          },
          response: 'Deletion confirmation'
        },
        'POST /api/groups/:userId/:groupName/apply': {
          description: 'Apply a saved group pattern',
          parameters: {
            userId: 'string (required) - User ID',
            groupName: 'string (required) - Name of the group to apply'
          },
          response: 'Grouping result with matched channels'
        },
        'GET /api/suggestions': {
          description: 'Get suggested regex patterns',
          parameters: 'None',
          response: 'Array of pattern suggestions'
        }
      },
      examples: {
        'Group channels starting with "dev"': {
          method: 'POST',
          endpoint: '/api/channels/group',
          body: {
            pattern: '^dev',
            flags: 'i'
          }
        },
        'Save a group for engineering channels': {
          method: 'POST',
          endpoint: '/api/groups/U123456789',
          body: {
            groupName: 'engineering',
            pattern: '^(dev|eng|api|backend|frontend)',
            flags: 'i'
          }
        }
      }
    };

    res.json(docs);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = APIRoutes;