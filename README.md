# Slack Channel Regex Bot

This project provides a **fully-functional Slack bot** that lets you _group channels by regular expression_, exposed via three different interfaces:

1. **Slack slash command** – `/groupchannels <regex>`
2. **REST API** – `GET /api/channels?regex=<pattern>`
3. **MCP tool** – `group_channels` served over SSE using **FastMCP**

---

## Features

• Lists private **and** public channels that match any JavaScript-style regular expression.

• Uses the official **[@slack/bolt](https://github.com/slackapi/bolt-js)** framework so you get events, retries, middleware, etc.

• Exposes the same capability as a simple **HTTP JSON API** – great for scripts and automations.

• Ships a **Model Context Protocol (MCP)** server so AI agents / IDEs like Cursor or Claude Desktop can call the `group_channels` tool directly.

---

## Quick-start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your tokens
cp .env.example .env
# ➜ Set SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, etc.

# 3. Start the bot
npm start
```

The process starts **two HTTP servers**:

| Service | Port | What for |
|---------|------|----------|
| Express + Slack Bolt | `$PORT` (default **3000**) | Slash-commands & REST API |
| FastMCP (SSE) | `$MCP_PORT` (default **3100**) | MCP tool endpoint at `/mcp` |

---

## Using the slash command

1. Head over to <https://api.slack.com/apps>, click **Create App** → **From scratch**.
2. Add **slash command** `/groupchannels` pointing to `https://<your-host>/slack/events` (or your public tunnel).
3. Add **OAuth scopes**: `channels:read`, `groups:read`, `chat:write`, `commands`.
4. Install the app to your workspace, copy **Bot Token** & **Signing Secret** into `.env`.

In any channel or DM, type e.g.

```
/groupchannels ^proj-.*
```

You will receive an ephemeral reply listing all channels whose names start with `proj-`.

---

## REST API

```
GET /api/channels?regex=<pattern>
```

Example:

```bash
curl "http://localhost:3000/api/channels?regex=marketing"
# => [{ "id": "C01234", "name": "marketing-team" }, ...]
```

---

## MCP – Model Context Protocol

FastMCP exposes a single tool:

```jsonc
{
  "name": "group_channels",
  "description": "Return Slack channels whose names match the provided regular expression.",
  "parameters": {
    "type": "object",
    "properties": {
      "regex": { "type": "string" }
    },
    "required": ["regex"]
  }
}
```

Connect with any MCP-compatible client:

```jsonc
// ~/.cursor/mcp.json (example)
{
  "slack-regex": {
    "url": "http://localhost:3100/mcp"
  }
}
```

Now the tool can be invoked directly from AI agents or LLMs.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SLACK_SIGNING_SECRET` | Found on *Basic Information* page of your Slack app |
| `SLACK_BOT_TOKEN` | Begins with `xoxb-…` |
| `PORT` | HTTP port for the Bolt/REST server (default 3000) |
| `MCP_PORT` | Port for the FastMCP SSE server (default 3100) |

---

## License

MIT – free for personal and commercial use.
