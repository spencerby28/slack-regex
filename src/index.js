/*
 * Slack Channel Regex Bot
 * -----------------------
 * 1. Slash command `/groupchannels <regex>` lists matching channels.
 * 2. REST endpoint GET /api/channels?regex=<pattern> returns JSON list.
 * 3. MCP tool `group_channels` does the same and is exposed via SSE.
 */

require('dotenv').config();

const { ExpressReceiver, App: SlackApp } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const express = require('express');
const { FastMCP } = require('fastmcp');
const { z } = require('zod');

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------
const requiredEnv = ['SLACK_SIGNING_SECRET', 'SLACK_BOT_TOKEN'];
requiredEnv.forEach((name) => {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
});

const HTTP_PORT = process.env.PORT || 3000;
const MCP_PORT = process.env.MCP_PORT || 3100;

// ---------------------------------------------------------------------------
// Slack setup
// ---------------------------------------------------------------------------
const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
const slackApp = new SlackApp({ token: process.env.SLACK_BOT_TOKEN, receiver });
const slackWeb = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Helper: fetch all channels and filter by regex
 * @param {string} regexStr regex pattern passed from user
 * @returns {Promise<Array<{id:string,name:string}>>}
 */
async function listChannelsMatching(regexStr) {
  let re;
  try {
    re = new RegExp(regexStr);
  } catch (err) {
    throw new Error(`Invalid regex: ${regexStr}`);
  }
  let cursor = undefined;
  const matches = [];
  do {
    const resp = await slackWeb.conversations.list({
      limit: 1000,
      types: 'public_channel,private_channel',
      cursor,
    });
    if (!resp.ok) {
      throw new Error(resp.error || 'Unknown Slack API error');
    }
    resp.channels.forEach((ch) => {
      if (re.test(ch.name)) {
        matches.push({ id: ch.id, name: ch.name });
      }
    });
    cursor = resp.response_metadata?.next_cursor;
  } while (cursor);
  return matches;
}

// Slash command handler ------------------------------------------------------
slackApp.command('/groupchannels', async ({ ack, command, respond }) => {
  await ack();
  const pattern = (command.text || '').trim();
  if (!pattern) {
    await respond('Usage: /groupchannels <regex pattern>');
    return;
  }
  try {
    const channels = await listChannelsMatching(pattern);
    if (channels.length === 0) {
      await respond(`No channels matched \
\`${pattern}\``);
    } else {
      const lines = channels.map((c) => `• #${c.name}`).join('\n');
      await respond(`Channels matching \
\`${pattern}\` (total ${channels.length}):\n${lines}`);
    }
  } catch (err) {
    console.error(err);
    await respond(`Error: ${err.message}`);
  }
});

// Express REST API -----------------------------------------------------------
const api = receiver.app || express(); // ExpressReceiver ensures we have an app

api.get('/api/channels', async (req, res) => {
  const pattern = req.query.regex;
  if (!pattern) {
    return res.status(400).json({ error: 'Missing required query parameter `regex`' });
  }
  try {
    const channels = await listChannelsMatching(pattern);
    return res.json(channels);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

api.get('/', (req, res) => {
  res.send('Slack Channel Regex Bot is running');
});

api.listen(HTTP_PORT, () => {
  console.log(`✅ HTTP & Slack Bolt server listening on port ${HTTP_PORT}`);
});

// ---------------------------------------------------------------------------
// MCP Server using fastmcp
// ---------------------------------------------------------------------------
const mcpServer = new FastMCP({
  name: 'slack-channel-regex-bot',
  version: '1.0.0',
});

mcpServer.addTool({
  name: 'group_channels',
  description: 'Return Slack channels whose names match the provided regular expression.',
  parameters: z.object({
    regex: z.string().describe('JavaScript regular expression (as string) to match channel names'),
  }),
  // The execute callback can be async; fastmcp will await it.
  execute: async ({ regex }) => {
    const matches = await listChannelsMatching(regex);
    if (matches.length === 0) {
      return {
        content: [
          { type: 'text', text: `No channels matched \
\`${regex}\`` },
        ],
      };
    }
    const textLines = matches.map((c) => `#${c.name}`).join('\n');
    return {
      content: [
        { type: 'text', text: textLines },
      ],
    };
  },
});

(async () => {
  try {
    await mcpServer.start({
      transportType: 'sse',
      sse: {
        port: Number(MCP_PORT),
        endpoint: '/mcp',
      },
    });
    console.log(`✅ MCP server (SSE) listening at http://localhost:${MCP_PORT}/mcp`);
  } catch (err) {
    console.error('Failed to start MCP server:', err);
  }
})();