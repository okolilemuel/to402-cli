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
- 🔐 **Authentication**: Support for API Key, Bearer Token, Basic Auth, and Custom Headers/Query Parameters
- ⚡ **Developer Friendly**: Clear prompts, validation, and helpful defaults
- 💼 **API Reselling**: Convert expensive monthly subscription APIs into pay-per-use services to generate profits
- 🔄 **x402 Conversion**: Transform any existing API into an x402-capable API with cryptocurrency payments

## Use Cases

### 💼 API Reselling & Monetization

Transform expensive monthly subscription APIs into profitable pay-per-use services:

- **Resell Premium APIs**: Take APIs with high monthly subscription costs (e.g., $99-999/month) and offer them as pay-per-use services
- **Generate Profits**: Set your own pricing per request, allowing you to mark up costs and generate revenue
- **Lower Barrier to Entry**: Make expensive APIs accessible to users who only need occasional access
- **Flexible Pricing**: Configure different prices for different endpoints based on their value

**Example**: Resell a premium weather API that costs $299/month by charging $0.01 per request. Users who make fewer than 29,900 requests per month save money, while you generate profits from high-volume users.

### 🔄 x402 API Conversion

Convert any existing API to support x402 cryptocurrency payments:

- **Add Payment Functionality**: Transform traditional APIs into x402-capable services without modifying the original API
- **Cryptocurrency Payments**: Accept payments in various cryptocurrencies (Solana, Ethereum, Base, etc.)
- **No Code Changes Required**: The proxy server handles all payment logic, leaving your original API unchanged
- **Backward Compatible**: Your original API continues to work as before, while the proxy adds payment capabilities

**Example**: Convert your existing REST API to accept x402 payments by proxying requests through the generated server. Users pay per request using cryptocurrency, and you receive payments automatically.

## Workflow

The CLI will guide you through:

1. **Project Name** - Name for your x402 server project (default: `to402-server`)
2. **Description** - Project description
3. **Base URL** - API base URL to proxy
4. **Default Price** - Default price for all routes (e.g., `$0.001`)
5. **Routes** - Configure routes with wildcard support (e.g., `/api/*`, `/users/:id`)
6. **Seller Address** - Your Ethereum or Solana address for receiving payments
7. **Network** - Blockchain network (default: `solana-devnet`)
8. **Facilitator URL** - x402 facilitator URL (default: `https://facilitator.payai.network`)
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
? Blockchain network: solana-devnet
? Facilitator URL: https://facilitator.payai.network
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
