/**
 * Project generation utilities
 */

import fs from "fs-extra";
import path from "path";
import { ProjectConfig, AuthConfig, RouteConfig } from "./types.js";
import chalk from "chalk";

/**
 * Generates authentication configuration code
 */
function generateAuthConfig(auth: AuthConfig): string {
  if (auth.type === "apiKey") {
    if (auth.headerName) {
      return `const apiKeyHeader = process.env.API_KEY_HEADER || "${auth.headerName}";
const apiKeyValue = process.env.API_KEY;
if (!apiKeyValue) {
  console.warn("⚠️  API Key not set in environment variables");
}`;
    } else if (auth.queryName) {
      return `const apiKeyQuery = process.env.API_KEY_QUERY || "${auth.queryName}";
const apiKeyValue = process.env.API_KEY;
if (!apiKeyValue) {
  console.warn("⚠️  API Key not set in environment variables");
}`;
    } else if (auth.cookieName) {
      return `const apiKeyCookie = process.env.API_KEY_COOKIE || "${auth.cookieName}";
const apiKeyValue = process.env.API_KEY;
if (!apiKeyValue) {
  console.warn("⚠️  API Key not set in environment variables");
}`;
    }
  } else if (auth.type === "bearer") {
    return `const bearerToken = process.env.BEARER_TOKEN;
if (!bearerToken) {
  console.warn("⚠️  Bearer Token not set in environment variables");
}`;
  } else if (auth.type === "basic") {
    return `const basicAuthUsername = process.env.BASIC_AUTH_USERNAME;
const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;
if (!basicAuthUsername || !basicAuthPassword) {
  console.warn("⚠️  Basic Auth credentials not set in environment variables");
}`;
  }
  return "";
}

/**
 * Generates code to add authentication to request headers/query
 */
function generateAuthCode(auth: AuthConfig): string {
  if (auth.type === "apiKey") {
    if (auth.headerName) {
      return `    // Add API Key header
    if (apiKeyValue) {
      headers.set(apiKeyHeader, apiKeyValue);
    }`;
    } else if (auth.queryName) {
      return `    // Add API Key query parameter
    if (apiKeyValue) {
      url.searchParams.append(apiKeyQuery, apiKeyValue);
    }`;
    } else if (auth.cookieName) {
      return `    // Add API Key cookie
    if (apiKeyValue) {
      const existingCookie = headers.get("Cookie") || "";
      headers.set("Cookie", existingCookie ? \`\${existingCookie}; \${apiKeyCookie}=\${apiKeyValue}\` : \`\${apiKeyCookie}=\${apiKeyValue}\`);
    }`;
    }
  } else if (auth.type === "bearer") {
    return `    // Add Bearer token
    if (bearerToken) {
      headers.set("Authorization", \`Bearer \${bearerToken}\`);
    }`;
  } else if (auth.type === "basic") {
    return `    // Add Basic Auth
    if (basicAuthUsername && basicAuthPassword) {
      const credentials = Buffer.from(\`\${basicAuthUsername}:\${basicAuthPassword}\`).toString("base64");
      headers.set("Authorization", \`Basic \${credentials}\`);
    }`;
  }
  return "";
}

/**
 * Generates the main server file
 */
function generateServerFile(config: ProjectConfig): string {
  // Format payment config as JavaScript object
  if (config.routes.length === 0) {
    throw new Error("At least one route is required");
  }

  const paymentConfigEntries = config.routes
    .map(route => {
      return `    "${route.path}": {\n      price: "${route.price}",\n      network,\n    }`;
    })
    .join(",\n");

  const paymentConfigStr = `{\n${paymentConfigEntries}\n  }`;

  // Generate proxy routes for each configured route
  const proxyRoutes = config.routes
    .map(route => {
      // Hono uses /* for wildcard routes
      const routePath = route.path;
      
      return `// Proxy route: ${route.path}
app.all("${routePath}", async (c) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    console.log(\`[\${new Date().toISOString()}] [\${requestId}] Incoming request: \${c.req.method} \${c.req.path}\`);
    
    const baseUrl = new URL(apiBaseUrl);
    const path = c.req.path;
    const url = new URL(path, baseUrl);

    // Forward query parameters
    const searchParams = new URL(c.req.url).searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    console.log(\`[\${new Date().toISOString()}] [\${requestId}] Proxying to: \${url.toString()}\`);

    // Prepare headers (exclude host and connection headers)
    const headers = new Headers();
    c.req.raw.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "host" && key.toLowerCase() !== "connection") {
        headers.set(key, value);
      }
    });
    headers.set("host", baseUrl.host);
${config.auth ? generateAuthCode(config.auth) : ""}

    // Forward request to original API
    const method = c.req.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: hasBody ? await c.req.raw.clone().arrayBuffer() : undefined,
    });

    const duration = Date.now() - startTime;
    console.log(\`[\${new Date().toISOString()}] [\${requestId}] Response: \${response.status} \${response.statusText} (\${duration}ms)\`);

    // Forward response
    const responseBody = await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(\`[\${new Date().toISOString()}] [\${requestId}] Proxy error after \${duration}ms:\`, error);
    return c.json({ error: "Failed to proxy request" }, 500);
  }
});`;
    })
    .join("\n\n");

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

// Authentication configuration
${config.auth ? generateAuthConfig(config.auth) : "// No authentication configured"}
${config.auth ? `console.log(\`[\${new Date().toISOString()}] Authentication configured: ${config.auth.type}\`);` : "console.log(`[${new Date().toISOString()}] No authentication configured`);"}

const app = new Hono();

const port = Number(process.env.PORT) || 4021;
console.log(\`[\${new Date().toISOString()}] Server starting on port \${port}\`);
console.log(\`[\${new Date().toISOString()}] Proxying to API: \${apiBaseUrl}\`);

// Configure payment middleware - this enforces payment requirements
// The middleware will return HTTP 402 (Payment Required) if:
// - The X-PAYMENT header is missing
// - The payment is invalid or insufficient
// - The payment verification fails
// Only requests with valid payment will proceed to the route handlers
app.use(
  paymentMiddleware(
    payTo,
    ${paymentConfigStr},
    {
      url: facilitatorUrl,
    },
  ),
);

// Proxy routes - these will only execute if payment is verified by the middleware above
// If payment is missing or invalid, the middleware will return 402 before reaching these handlers
${proxyRoutes}

// Catch-all route for unmatched paths - returns 404
app.all("*", (c) => {
  console.log(\`[\${new Date().toISOString()}] 404 Not Found: \${c.req.method} \${c.req.path}\`);
  return c.json({ error: "Not Found" }, 404);
});

serve({
  fetch: app.fetch,
  port,
});

console.log(\`[\${new Date().toISOString()}] ✅ Server is running on port \${port}\`);
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
  let authSection = "";
  
  if (config.auth) {
    if (config.auth.type === "apiKey") {
      if (config.auth.headerName) {
        authSection = `# API Key Authentication (Header)
API_KEY_HEADER=${config.auth.headerName}
API_KEY=your-api-key-here
`;
      } else if (config.auth.queryName) {
        authSection = `# API Key Authentication (Query Parameter)
API_KEY_QUERY=${config.auth.queryName}
API_KEY=your-api-key-here
`;
      } else if (config.auth.cookieName) {
        authSection = `# API Key Authentication (Cookie)
API_KEY_COOKIE=${config.auth.cookieName}
API_KEY=your-api-key-here
`;
      }
    } else if (config.auth.type === "bearer") {
      authSection = `# Bearer Token Authentication
BEARER_TOKEN=your-bearer-token-here
`;
    } else if (config.auth.type === "basic") {
      authSection = `# Basic Authentication
BASIC_AUTH_USERNAME=your-username-here
BASIC_AUTH_PASSWORD=your-password-here
`;
    }
  }

  return `# x402 Configuration
FACILITATOR_URL=${config.facilitatorUrl || "https://facilitator.payai.network"}
ADDRESS=${config.sellerAddress}
NETWORK=${config.network}

# API Configuration
API_BASE_URL=${config.baseUrl}
${authSection}
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
- A valid blockchain address for receiving payments (Ethereum or Solana, depending on network)
${config.network === "base" || config.network === "base-mainnet" ? `- Coinbase Developer Platform API Key & Secret (required for Base mainnet)
  - Get them here [https://portal.cdp.coinbase.com/projects](https://portal.cdp.coinbase.com/projects)` : ""}

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

## Routes

This server proxies the following routes:

${config.routes.length > 0
  ? config.routes
      .map(route => `- \`${route.path}\` - Price: \`${route.price}\``)
      .join("\n")
  : `- All routes - Price: \`${config.defaultPrice}\``}

## Environment Variables

- \`FACILITATOR_URL\` - The x402 facilitator URL (default: \`https://facilitator.payai.network\`)
- \`ADDRESS\` - Your blockchain address for receiving payments (Ethereum or Solana, depending on network)
- \`NETWORK\` - The blockchain network (default: \`solana-devnet\`)
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
  outputDir: string,
): Promise<void> {
  try {
    // Create directory structure
    await fs.ensureDir(path.join(outputDir, "src"));

    // Generate main server file
    const serverContent = generateServerFile(config);
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

    console.log(chalk.green(`✓ Project generated successfully in ${outputDir}`));
  } catch (error) {
    throw new Error(
      `Failed to generate project: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

