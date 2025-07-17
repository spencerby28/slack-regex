# Vercel Deployment Guide

This guide will help you deploy the Slack Channel Grouper Bot to Vercel as a serverless application.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/slack-channel-grouper)

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Slack App**: Set up a Slack app with the required permissions

## 🔧 Environment Variables

Set these environment variables in your Vercel project:

### Required Variables
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
API_SECRET_KEY=your-secure-api-key-here
```

### Optional Variables
```env
NODE_ENV=production
```

## 📁 Project Structure for Vercel

```
├── api/                    # Vercel API routes
│   ├── index.js           # Main endpoint
│   ├── health.js          # Health check
│   ├── channels.js        # Channel operations
│   ├── suggestions.js     # Pattern suggestions
│   ├── docs.js           # API documentation
│   └── slack/
│       └── commands.js    # Slack slash commands
├── lib/                   # Shared libraries
│   └── channelGrouper.js  # Core service (serverless)
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

## 🚀 Deployment Steps

### Method 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it as a Node.js project

3. **Configure Environment Variables**:
   - In the Vercel dashboard, go to your project
   - Navigate to "Settings" → "Environment Variables"
   - Add the required variables listed above

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your application

### Method 2: Deploy with Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add SLACK_BOT_TOKEN
   vercel env add SLACK_SIGNING_SECRET
   vercel env add API_SECRET_KEY
   ```

5. **Redeploy with Environment Variables**:
   ```bash
   vercel --prod
   ```

## ⚙️ Slack App Configuration

After deployment, update your Slack app configuration:

### 1. Slash Commands
- Go to your Slack app settings
- Navigate to "Slash Commands"
- Edit the `/group-channels` command
- Set Request URL to: `https://your-app.vercel.app/slack/commands`

### 2. OAuth & Permissions
Ensure your bot has these scopes:
- `channels:read`
- `groups:read` 
- `commands`
- `chat:write`

### 3. Install App
- Install the app to your workspace
- Copy the Bot User OAuth Token
- Set it as `SLACK_BOT_TOKEN` in Vercel

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/health
```

### 2. API Test
```bash
curl -H "X-API-Key: your-key" https://your-app.vercel.app/api/suggestions
```

### 3. Slack Test
In Slack, try:
```
/group-channels help
/group-channels search ^general
```

## 📊 Monitoring and Logs

### Vercel Dashboard
- View function logs in the Vercel dashboard
- Monitor function invocations and errors
- Check performance metrics

### Function Logs
```bash
vercel logs your-project-name
```

## 🔒 Security Considerations

### Environment Variables
- Store sensitive data in Vercel environment variables
- Never commit secrets to your repository
- Use strong API keys

### Slack Security
- Vercel automatically verifies Slack signatures
- Request timestamps are validated
- Only authenticated requests are processed

## ⚡ Performance Optimization

### Cold Starts
- Vercel functions may have cold start latency
- Keep functions lightweight
- Consider using Vercel Edge Functions for better performance

### Caching
- Vercel automatically caches static assets
- API responses are not cached by default
- Consider implementing response caching for channels

## 🚨 Limitations

### Serverless Constraints
- **No persistent storage**: Saved groups are not available
- **30-second timeout**: Long operations may timeout
- **Stateless**: Each request is independent
- **Cold starts**: First request may be slower

### Workarounds
- Use external storage (Redis, Database) for saved groups
- Implement caching for channel data
- Use Vercel Edge Functions for better performance

## 🔧 Troubleshooting

### Common Issues

1. **Environment Variables Not Working**
   ```bash
   # Check if variables are set
   vercel env ls
   
   # Redeploy after adding variables
   vercel --prod
   ```

2. **Slack Commands Not Working**
   - Verify the Request URL in Slack app settings
   - Check Vercel function logs for errors
   - Ensure SLACK_SIGNING_SECRET is correct

3. **API Authentication Failing**
   - Verify API_SECRET_KEY is set in Vercel
   - Check the X-API-Key header format
   - Try using query parameter: `?api_key=your-key`

4. **Channel Access Issues**
   - Verify bot token permissions
   - Check if bot is added to workspace
   - Ensure correct scopes are granted

### Debug Commands
```bash
# Check deployment status
vercel ls

# View recent logs
vercel logs

# Check environment variables
vercel env ls

# Test specific function
curl -v https://your-app.vercel.app/api/health
```

## 📈 Scaling Considerations

### Vercel Limits
- **Hobby Plan**: 100GB-hrs per month
- **Pro Plan**: 1000GB-hrs per month
- **Function Duration**: 30 seconds max (Hobby), 60 seconds (Pro)

### Performance Tips
- Keep dependencies minimal
- Use dynamic imports for large libraries
- Implement response caching
- Consider Vercel Edge Functions for global performance

## 🔄 Updates and Maintenance

### Automatic Deployments
- Push to `main` branch triggers automatic deployment
- Use different branches for staging environments

### Manual Deployments
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

### Rollbacks
```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote [deployment-url]
```

## 🌐 Custom Domains

1. **Add Domain in Vercel**:
   - Go to project settings
   - Navigate to "Domains"
   - Add your custom domain

2. **Update Slack Configuration**:
   - Update Request URLs to use your custom domain
   - Test all endpoints

3. **SSL Certificate**:
   - Vercel automatically provides SSL certificates
   - No additional configuration needed

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Slack API Documentation](https://api.slack.com/)
- [Node.js on Vercel](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## 🎉 Success!

Your Slack Channel Grouper Bot is now running serverlessly on Vercel! 

### What You Can Do:
✅ **Group channels**: `/group-channels search ^dev`  
✅ **Get suggestions**: `/group-channels suggestions`  
✅ **Use REST API**: `https://your-app.vercel.app/api/docs`  
✅ **Monitor performance**: Vercel dashboard  
✅ **Scale automatically**: Vercel handles scaling  

### Next Steps:
- Set up monitoring and alerts
- Configure custom domain (optional)
- Implement caching for better performance
- Add external storage for saved groups (optional)

Happy channel grouping! 🚀