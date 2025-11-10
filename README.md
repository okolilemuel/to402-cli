# to402 CLI

A developer-friendly CLI tool to scaffold an x402 proxy server from an OpenAPI specification. Easily turn any API into an x402 API with payment functionality.

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
- 📋 **OpenAPI Support**: Works with local files or remote URLs
- 💰 **Flexible Pricing**: Set default prices or configure per-endpoint pricing
- 🔗 **Automatic Proxy**: Generates proxy routes for all API endpoints
- ⚡ **Developer Friendly**: Clear prompts, validation, and helpful defaults

## Workflow

The CLI will guide you through:

1. **Project Name** - Name for your x402 server project (default: `to402-server`)
2. **Description** - Project description
3. **OpenAPI Schema** - Path or URL to your OpenAPI specification
4. **Base URL** - API base URL (extracted from OpenAPI or manually entered)
5. **Default Price** - Default price for all endpoints (e.g., `$0.001`)
6. **Per-Endpoint Pricing** - Optional individual pricing for each endpoint
7. **Seller Address** - Your Ethereum or Solana address for receiving payments
8. **Network** - Blockchain network (base, ethereum, solana, etc.)
9. **Facilitator URL** - x402 facilitator URL (default: `https://facilitator.x402.org`)

## Generated Project Structure

```
your-project/
├── src/
│   └── index.ts          # Main server file with proxy routes
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variables template
├── README.md             # Generated documentation
└── openapi.json          # OpenAPI spec (if downloaded from URL)
```

## Example

```bash
$ to402 create

🚀 to402 CLI - Scaffold an x402 Proxy Server

? Project name: my-api-proxy
? Project description: Proxy server for my API
? OpenAPI schema path or URL: https://api.example.com/openapi.json
📥 Loading OpenAPI specification...
✓ Loaded 15 API paths
? Use base URL from OpenAPI spec: https://api.example.com? Yes
? Default price for all endpoints (e.g., $0.001): $0.001
? Configure individual prices for 15 endpoints? No
? Seller address (Ethereum or Solana): 0x1234...
? Blockchain network: base
? Facilitator URL: https://facilitator.x402.org

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
