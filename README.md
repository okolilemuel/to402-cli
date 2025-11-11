# to402 CLI

A developer-friendly CLI tool to scaffold an x402 proxy server. Easily turn any API into an x402 API with payment functionality.

## 📹 Video Tutorial

Watch a quick demo of the to402 CLI in action:

[![Watch the video](https://cdn.loom.com/sessions/thumbnails/6cba3ed98ac34cb19255fb32fc2b235e-with-play.gif)](https://www.loom.com/share/6cba3ed98ac34cb19255fb32fc2b235e)

Or view directly: [Loom Video](https://www.loom.com/share/6cba3ed98ac34cb19255fb32fc2b235e)

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

## Prerequisites

Before using the to402 CLI, ensure you have:

- **Node.js** v20 or higher ([install via nvm](https://github.com/nvm-sh/nvm))
- **pnpm** v10 or higher ([install via pnpm.io](https://pnpm.io/installation))
- A blockchain wallet address (Ethereum or Solana) for receiving payments
- An API endpoint you want to proxy (optional, for testing)

## Installation

### Local Installation

```bash
# Clone or download the repository
cd to402-cli

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Global Installation

```bash
# Install globally
pnpm install -g .

# Now you can use 'to402' command from anywhere
to402 create
```

## Quick Start

### Step 1: Create a New x402 Proxy Server

Run the CLI in development mode:

```bash
pnpm dev create
```

Or if installed globally:

```bash
to402 create
```

### Step 2: Follow the Interactive Prompts

The CLI will guide you through the setup process:

1. **Project Name**: Enter a name for your project (default: `to402-server`)
2. **Description**: Describe what your proxy server does
3. **Base URL**: The API endpoint you want to proxy (e.g., `https://api.example.com`)
4. **Default Price**: Set a default price for all routes (e.g., `$0.001`)
5. **Routes**: Configure specific routes with custom pricing
   - Use wildcards like `/api/*` to match all paths under `/api`
   - Use specific paths like `/users/:id` for exact routes
6. **Seller Address**: Your blockchain address for receiving payments
7. **Network**: Choose a blockchain network (default: `solana-devnet`)
8. **Facilitator URL**: x402 facilitator URL (default: `https://facilitator.payai.network`)
9. **Authentication**: Optionally add API authentication (API Key, Bearer Token, Basic Auth, or Custom)

### Step 3: Navigate to Your Generated Project

```bash
cd your-project-name
```

### Step 4: Install Dependencies

```bash
pnpm install
```

### Step 5: Configure Environment Variables

If you provided authentication during setup, the `.env` file is already created with your credentials. Otherwise, copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and ensure all required variables are set:
- `FACILITATOR_URL`: x402 facilitator URL
- `ADDRESS`: Your blockchain address
- `NETWORK`: Blockchain network (e.g., `solana-devnet`)
- `API_BASE_URL`: The API you're proxying
- Authentication variables (if configured)

### Step 6: Start the Server

```bash
pnpm dev
```

The server will start on port `4021` by default. You should see:

```
✅ Server is running!
   Port: 4021
   Address: http://localhost:4021
   Network: solana-devnet
```

## Usage

### Development Mode

Run the CLI directly with TypeScript:

```bash
pnpm dev create
```

### Production Build

Build and run the compiled version:

```bash
# Build the project
pnpm build

# Run the compiled CLI
./dist/cli.js create
```

### Global Command

If installed globally, use the `to402` command from anywhere:

```bash
to402 create
```

## Using Your Generated Proxy Server

### Making Requests

Once your server is running, clients need to include an `X-PAYMENT` header with their requests. The server will:

1. Verify the payment
2. Forward the request to your upstream API
3. Return the API response to the client

### Testing with the Client

A test client (`axios-client.ts`) is included in the CLI project. To use it:

1. Create a `.env` file in the CLI project root:

```env
PRIVATE_KEY=your-private-key-here
RESOURCE_SERVER_URL=http://localhost:4021
ENDPOINT_PATH=/your-endpoint
NETWORK=solana-devnet
```

2. Run the client:

```bash
pnpm client
```

### Example Request Flow

```
Client Request → x402 Proxy Server → Upstream API
                (validates payment)  (original API)
                ↓
            Response ← Response ← Response
```

### Supported Authentication Methods

The generated server supports forwarding these authentication methods to your upstream API:

- **API Key (Header)**: Adds an API key to request headers
- **API Key (Query Parameter)**: Adds an API key as a query parameter
- **Bearer Token**: Adds `Authorization: Bearer <token>` header
- **Basic Auth**: Adds `Authorization: Basic <credentials>` header
- **Custom Headers/Query Parameters**: Add any custom headers or query parameters

### Route Configuration

Routes support wildcard patterns:

- `/*`: Matches all paths (catch-all)
- `/api/*`: Matches all paths under `/api`
- `/users/:id`: Matches specific paths with parameters
- `/products`: Exact path matching

Each route can have its own price configuration.


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

## Troubleshooting

### Server Won't Start

**Issue**: Server fails to start with missing environment variables error.

**Solution**: Ensure your `.env` file contains all required variables:
- `FACILITATOR_URL`
- `ADDRESS` (your blockchain address)
- `NETWORK` (e.g., `solana-devnet`)
- `API_BASE_URL`

### Payment Verification Fails

**Issue**: Clients receive 402 Payment Required errors.

**Solution**: 
- Ensure the client includes a valid `X-PAYMENT` header
- Verify the facilitator URL is correct and accessible
- Check that the network matches between client and server
- Ensure the payment amount meets the route's price requirement

### Upstream API Returns Errors

**Issue**: The proxy server returns errors from the upstream API.

**Solution**:
- Verify the `API_BASE_URL` is correct
- Check that authentication credentials are properly configured
- Ensure the upstream API is accessible from your server
- Review server logs for detailed error messages

### Route Not Found (404)

**Issue**: Requests to certain paths return 404.

**Solution**:
- Ensure the route path is configured in your server
- Check that the route pattern matches your request path
- Use wildcards (`/*` or `/api/*`) to match multiple paths

## Development

### Contributing to the CLI

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build the project
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Project Structure

```
to402-cli/
├── src/
│   ├── cli.ts          # Main CLI entry point
│   ├── generator.ts    # Project generation logic
│   └── types.ts        # TypeScript type definitions
├── dist/               # Compiled output (after build)
├── axios-client.ts     # Test client for generated servers
└── README.md          # This file
```

### Testing

To test the CLI:

1. Run the CLI to generate a test project
2. Navigate to the generated project
3. Install dependencies and start the server
4. Use the `axios-client.ts` to make test requests
