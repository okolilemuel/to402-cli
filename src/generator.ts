/**
 * Project generation utilities
 */

import fs from "fs-extra";
import path from "path";
import { ProjectConfig, OpenApiPath } from "./types.js";
import chalk from "chalk";

/**
 * Generates the main server file
 */
function generateServerFile(config: ProjectConfig, paths: OpenApiPath[]): string {
  const paymentConfig: Record<string, any> = {};

  for (const apiPath of paths) {
    const price = config.endpointPrices[apiPath.path] || config.defaultPrice;
    paymentConfig[apiPath.path] = {
      price,
      network: config.network,
    };
  }

  // Format payment config as JavaScript object
  if (Object.keys(paymentConfig).length === 0) {
    throw new Error("No API paths found in OpenAPI spec");
  }
  
  const paymentConfigEntries = Object.entries(paymentConfig)
    .map(([path, config]) => {
      return `    "${path}": {\n      price: "${config.price}",\n      network,\n    }`;
    })
    .join(",\n");
  
  const paymentConfigStr = `{\n${paymentConfigEntries}\n  }`;

  return `import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, Network, Resource, SolanaAddress } from "x402-hono";

config();

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const payTo = process.env.ADDRESS as \`0x\${string}\` | SolanaAddress;
const network = process.env.NETWORK as Network;
const apiBaseUrl = process.env.API_BASE_URL || "${config.baseUrl}";

if (!facilitatorUrl || !payTo || !network) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = new Hono();

console.log("Server is running on port", process.env.PORT || 4021);

// Configure payment middleware
app.use(
  paymentMiddleware(
    payTo,
    ${paymentConfigStr},
    {
      url: facilitatorUrl,
    },
  ),
);

// Proxy routes
${paths
  .map((apiPath) => {
    return apiPath.methods
      .map((method) => {
        const methodLower = method.toLowerCase();
        return `app.${methodLower}("${apiPath.path}", async (c) => {
  try {
    const baseUrl = new URL(apiBaseUrl);
    const path = "${apiPath.path}";
    const url = new URL(path, baseUrl);
    
    // Forward query parameters
    const searchParams = new URL(c.req.url).searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Prepare headers (exclude host and connection headers)
    const headers = new Headers();
    c.req.raw.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "host" && key.toLowerCase() !== "connection") {
        headers.set(key, value);
      }
    });
    headers.set("host", baseUrl.host);

    // Forward request to original API
    const response = await fetch(url.toString(), {
      method: "${method}",
      headers,
      body: ${method !== "GET" && method !== "HEAD" ? "await c.req.raw.clone().arrayBuffer()" : "undefined"},
    });

    // Forward response
    const responseBody = await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return c.json({ error: "Failed to proxy request" }, 500);
  }
});`;
      })
      .join("\n\n");
  })
  .join("\n\n")}

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 4021,
});
`;
}

/**
 * Generates package.json for the scaffolded project
 */
function generatePackageJson(config: ProjectConfig): string {
  return JSON.stringify(
    {
      name: config.projectName,
      version: "0.1.0",
      description: config.description,
      type: "module",
      scripts: {
        dev: "tsx src/index.ts",
        build: "tsup src/index.ts --format cjs,esm --dts --outDir dist",
        start: "node dist/index.js",
      },
      dependencies: {
        "@hono/node-server": "^1.13.8",
        dotenv: "^16.4.7",
        hono: "^4.7.1",
        "x402-hono": "^0.7.1",
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        tsup: "^7.2.0",
        tsx: "^4.7.0",
        typescript: "^5.3.0",
      },
    },
    null,
    2,
  );
}

/**
 * Generates tsconfig.json for the scaffolded project
 */
function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "ES2020",
        moduleResolution: "bundler",
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
        strict: true,
        resolveJsonModule: true,
        baseUrl: ".",
        types: ["node"],
      },
      include: ["src/**/*.ts"],
    },
    null,
    2,
  );
}

/**
 * Generates .env.example file
 */
function generateEnvExample(config: ProjectConfig): string {
  return `# x402 Configuration
FACILITATOR_URL=${config.facilitatorUrl || "https://facilitator.x402.org"}
ADDRESS=${config.sellerAddress}
NETWORK=${config.network}

# API Configuration
API_BASE_URL=${config.baseUrl}

# Server Configuration
PORT=4021
`;
}

/**
 * Generates README.md for the scaffolded project
 */
function generateReadme(config: ProjectConfig): string {
  return `# ${config.projectName}

${config.description}

This is an x402 proxy server that adds payment functionality to your API endpoints.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A valid Ethereum address for receiving payments
- Coinbase Developer Platform API Key & Secret (if accepting payments on Base mainnet)
  - Get them here [https://portal.cdp.coinbase.com/projects](https://portal.cdp.coinbase.com/projects)

## Setup

1. Copy \`.env.example\` to \`.env\` and configure your settings:

\`\`\`bash
cp .env.example .env
\`\`\`

2. Install dependencies:

\`\`\`bash
pnpm install
\`\`\`

3. Run the server:

\`\`\`bash
pnpm dev
\`\`\`

## Configuration

The server proxies requests to: \`${config.baseUrl}\`

All endpoints require payment as configured. See the payment middleware configuration in \`src/index.ts\` for pricing details.

## Endpoints

This server proxies the following endpoints from the original API:

${Object.keys(config.endpointPrices).length > 0
  ? Object.entries(config.endpointPrices)
      .map(([path, price]) => `- \`${path}\` - Price: \`${price}\``)
      .join("\n")
  : `- All endpoints - Price: \`${config.defaultPrice}\``}

## Environment Variables

- \`FACILITATOR_URL\` - The x402 facilitator URL
- \`ADDRESS\` - Your Ethereum address for receiving payments
- \`NETWORK\` - The blockchain network (base, ethereum, solana, etc.)
- \`API_BASE_URL\` - The base URL of the original API to proxy
- \`PORT\` - The port to run the server on (default: 4021)

## Learn More

- [x402 Documentation](https://x402.gitbook.io/x402)
- [x402 Website](https://www.x402.org)
`;
}

/**
 * Generates the complete project structure
 */
export async function generateProject(
  config: ProjectConfig,
  paths: OpenApiPath[],
  outputDir: string,
  openApiFilePath?: string,
): Promise<void> {
  try {
    // Create directory structure
    await fs.ensureDir(path.join(outputDir, "src"));

    // Generate main server file
    const serverContent = generateServerFile(config, paths);
    await fs.writeFile(path.join(outputDir, "src", "index.ts"), serverContent, "utf-8");

    // Generate package.json
    const packageJson = generatePackageJson(config);
    await fs.writeFile(path.join(outputDir, "package.json"), packageJson, "utf-8");

    // Generate tsconfig.json
    const tsConfig = generateTsConfig();
    await fs.writeFile(path.join(outputDir, "tsconfig.json"), tsConfig, "utf-8");

    // Generate .env.example
    const envExample = generateEnvExample(config);
    await fs.writeFile(path.join(outputDir, ".env.example"), envExample, "utf-8");

    // Generate README.md
    const readme = generateReadme(config);
    await fs.writeFile(path.join(outputDir, "README.md"), readme, "utf-8");

    // Copy OpenAPI spec if it was downloaded and not already in the project directory
    if (openApiFilePath) {
      const specFileName = path.basename(openApiFilePath);
      const destPath = path.join(outputDir, specFileName);
      const sourcePath = path.resolve(openApiFilePath);
      const destPathResolved = path.resolve(destPath);
      
      // Only copy if source and destination are different
      if (sourcePath !== destPathResolved) {
        await fs.copy(openApiFilePath, destPath);
      }
    }

    console.log(chalk.green(`✓ Project generated successfully in ${outputDir}`));
  } catch (error) {
    throw new Error(
      `Failed to generate project: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

