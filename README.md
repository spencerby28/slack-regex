# Slack Channel Grouper Bot 🚀

A powerful Slack bot that allows you to group and organize channels using regex patterns. Available as a **slash command**, **REST API**, and **MCP (Model Context Protocol) server**.

## Features ✨

- **🔍 Smart Channel Grouping**: Use regex patterns to find and group channels by name, topic, or purpose
- **💾 Saved Groups**: Save your favorite patterns for quick reuse
- **🎯 Pattern Suggestions**: Get suggested patterns for common use cases
- **🔧 Multiple Interfaces**: 
  - Slack slash commands
  - REST API
  - MCP server for AI model integration
- **🎨 Interactive UI**: Rich Slack interface with buttons and formatted output
- **📊 Detailed Results**: See channel counts, types, and metadata

## Quick Start 🚀

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd slack-channel-grouper-bot

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### 2. Configuration

Edit `.env` file with your Slack credentials:

```env
# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_SECRET_KEY=your-api-secret-key-here

# MCP Configuration
MCP_PORT=3001
```

### 3. Slack App Setup

1. Go to [api.slack.com](https://api.slack.com/apps) and create a new app
2. Enable Socket Mode and generate an App Token
3. Add the following Bot Token Scopes:
   - `channels:read` - Read public channel information
   - `groups:read` - Read private channel information
   - `commands` - Add slash commands
   - `chat:write` - Send messages
4. Create a slash command: `/group-channels`
5. Install the app to your workspace

### 4. Start the Bot

```bash
# Start main bot (Slack + API)
npm start

# Start in development mode
npm run dev

# Start MCP server only
npm run mcp
```

## Usage 📖

### Slack Commands

The bot responds to the `/group-channels` slash command:

```
/group-channels search ^dev          # Find channels starting with "dev"
/group-channels search team-         # Find channels containing "team-"
/group-channels save "dev-channels" ^(dev|eng|api)  # Save a pattern
/group-channels list                 # View saved groups
/group-channels apply "dev-channels" # Use a saved pattern
/group-channels delete "dev-channels" # Delete a saved pattern
/group-channels suggestions          # Get pattern suggestions
/group-channels help                 # Show help
```

### Example Patterns

| Pattern | Description | Matches |
|---------|-------------|---------|
| `^dev` | Channels starting with "dev" | dev-team, development, dev-ops |
| `team-` | Channels containing "team-" | team-frontend, marketing-team |
| `(temp\|test)` | Temporary or test channels | temp-project, test-api |
| `\d{4}` | Channels with years | project-2024, q4-2023 |
| `^(eng\|dev\|api)` | Engineering channels | eng-general, dev-ops, api-team |

### REST API

The bot also provides a REST API for programmatic access:

#### Authentication
Include your API key in the `X-API-Key` header or as `api_key` query parameter.

#### Endpoints

- `GET /api/health` - Health check
- `GET /api/channels` - Get all channels
- `POST /api/channels/group` - Group channels by pattern
- `GET /api/groups/:userId` - Get user's saved groups
- `POST /api/groups/:userId` - Save a new group
- `DELETE /api/groups/:userId/:groupName` - Delete a group
- `POST /api/groups/:userId/:groupName/apply` - Apply a saved group
- `GET /api/suggestions` - Get pattern suggestions
- `GET /api/docs` - API documentation

#### Example API Usage

```bash
# Group channels starting with "dev"
curl -X POST http://localhost:3000/api/channels/group \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "^dev", "flags": "i"}'

# Save a group pattern
curl -X POST http://localhost:3000/api/groups/U123456789 \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "engineering",
    "pattern": "^(dev|eng|api)",
    "flags": "i"
  }'
```

### MCP (Model Context Protocol)

The bot includes an MCP server for AI model integration:

```bash
# Start MCP server
npm run mcp
```

**Available MCP Tools:**
- `group_channels_by_regex` - Group channels by pattern
- `get_all_channels` - Get all workspace channels
- `save_channel_group` - Save a named group
- `get_user_groups` - Get user's saved groups
- `apply_saved_group` - Apply a saved group
- `delete_saved_group` - Delete a saved group
- `get_pattern_suggestions` - Get pattern suggestions

## Advanced Features 🔧

### Pattern Suggestions

The bot includes built-in suggestions for common patterns:

- **Engineering Channels**: `^(dev|eng|engineering|tech|api|backend|frontend)`
- **Project Channels**: `project-|proj-`
- **Team Channels**: `team-|^(sales|marketing|hr|design|product)`
- **Temporary Channels**: `(temp|tmp|test|sandbox)`
- **Date-based Channels**: `\\d{4}|202[0-9]|q[1-4]`

### Interactive Features

- **Clickable Buttons**: Apply patterns or saved groups with one click
- **Rich Formatting**: Channels grouped by type (public/private)
- **Channel Links**: Direct links to public channels
- **Pagination**: Shows first 20 results with "show more" indicator

### Error Handling

- **Regex Validation**: Invalid patterns are caught and explained
- **Permission Handling**: Graceful handling of private channels
- **Rate Limiting**: Respects Slack API rate limits
- **Logging**: Comprehensive logging for debugging

## Development 🛠️

### Project Structure

```
src/
├── config/
│   └── logger.js          # Winston logging configuration
├── services/
│   └── channelGrouper.js  # Core channel grouping logic
├── slack/
│   └── commands.js        # Slack command handlers
├── api/
│   └── routes.js          # REST API routes
├── index.js               # Main server file
└── mcp-server.js          # MCP server implementation
```

### Key Components

- **ChannelGrouperService**: Core service for channel operations
- **SlashCommandHandler**: Processes Slack slash commands
- **APIRoutes**: Express.js REST API endpoints
- **MCPChannelGrouperServer**: Model Context Protocol server

### Testing

```bash
# Test the API
curl http://localhost:3000/health

# Test pattern matching
curl -X POST http://localhost:3000/api/channels/group \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "test"}'
```

## Deployment 🚀

### Vercel (Serverless) - Recommended

Deploy to Vercel for automatic scaling and global performance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/slack-channel-grouper)

```bash
# Quick deployment
npm i -g vercel
vercel

# Set environment variables
vercel env add SLACK_BOT_TOKEN
vercel env add SLACK_SIGNING_SECRET  
vercel env add API_SECRET_KEY

# Deploy to production
vercel --prod
```

📖 **Full Vercel Guide**: See `VERCEL_DEPLOYMENT.md` for complete instructions.

### Traditional Server Deployment

For traditional server deployment with persistent storage:

#### Environment Variables

```env
NODE_ENV=production
SLACK_BOT_TOKEN=xoxb-production-token
SLACK_SIGNING_SECRET=production-signing-secret
SLACK_APP_TOKEN=xapp-production-app-token
API_SECRET_KEY=secure-random-key
PORT=3000
```

#### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting 🔧

### Common Issues

1. **"Missing API key"** - Set `API_SECRET_KEY` in `.env`
2. **"Invalid regex pattern"** - Check your regex syntax
3. **"Failed to fetch channels"** - Verify bot token permissions
4. **Socket mode errors** - Ensure app token is set correctly

### Logs

Check logs in the `logs/` directory:
- `logs/error.log` - Error messages only
- `logs/combined.log` - All log messages

## Contributing 🤝

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License 📄

MIT License - see LICENSE file for details.

## Support 💬

- Create an issue for bug reports
- Use discussions for questions
- Check the logs for debugging information

---

**Made with ❤️ for better Slack channel organization!**
