# to402 CLI

A developer-friendly CLI tool to scaffold an x402 proxy server. Easily turn any API into an x402 API with payment functionality.

## Installation

```bash
pnpm install
pnpm build
```

Or install globally:

```bash
pnpm install -g .
```

## Usage

### Development Mode

```bash
pnpm dev create
```

### Production Build

```bash
pnpm build
./dist/cli.js create
```

Or if installed globally:

```bash
to402 create
```

## Features

- 🚀 **Interactive Setup**: Step-by-step prompts for easy configuration
- 💰 **Flexible Pricing**: Set default prices and configure per-route pricing
- 🔗 **Wildcard Routes**: Support for wildcard paths (e.g., `/api/*`)
- 🔐 **Authentication**: Support for API Key, Bearer Token, and Basic Auth
- ⚡ **Developer Friendly**: Clear prompts, validation, and helpful defaults

## Workflow

The CLI will guide you through:

1. **Project Name** - Name for your x402 server project (default: `to402-server`)
2. **Description** - Project description
3. **Base URL** - API base URL to proxy
4. **Default Price** - Default price for all routes (e.g., `$0.001`)
5. **Routes** - Configure routes with wildcard support (e.g., `/api/*`, `/users/:id`)
6. **Seller Address** - Your Ethereum or Solana address for receiving payments
7. **Network** - Blockchain network (base, ethereum, solana, etc.)
8. **Facilitator URL** - x402 facilitator URL (default: `https://facilitator.x402.org`)
9. **Authentication** - Optional authentication (API Key, Bearer Token, or Basic Auth)

## Generated Project Structure

```
your-project/
├── src/
│   └── index.ts          # Main server file with proxy routes
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variables template
└── README.md             # Generated documentation
```

## Example

```bash
$ to402 create

🚀 to402 CLI - Scaffold an x402 Proxy Server

? Project name: my-api-proxy
? Project description: Proxy server for my API
? API base URL to proxy: https://api.example.com
? Default price for all routes (e.g., $0.001): $0.001

💰 Configure routes and pricing
? Route path (use * for wildcard, e.g., /api/* or /users/:id): /api/*
? Price for /api/*: $0.001
? Add another route? Yes
? Route path: /users/:id
? Price for /users/:id: $0.01
? Add another route? No

? Seller address (Ethereum or Solana): 0x1234...
? Blockchain network: base
? Facilitator URL: https://facilitator.x402.org
? Add authentication? Yes
? Select authentication type: API Key (Header)
? Header name (e.g., X-API-Key): X-API-Key
? API Key: your-api-key-here

🔨 Generating project...
✓ Project generated successfully in ./my-api-proxy

✅ Project created successfully!

📁 Project location: /path/to/my-api-proxy

📝 Next steps:
  1. cd my-api-proxy
  2. cp .env.example .env
  3. Edit .env with your configuration
  4. pnpm install
  5. pnpm dev
```

## Learn More

- [x402 Documentation](https://x402.gitbook.io/x402)
- [x402 Website](https://www.x402.org)
- [x402 White Paper](https://www.x402.org/x402.pdf)
- [x402-hono Example](https://github.com/coinbase/x402/tree/main/examples/typescript/servers/hono)

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```
