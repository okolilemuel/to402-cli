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
  } else if (auth.type === "custom") {
    let customAuthCode = "";
    
    if (auth.customHeaders) {
      const headerKeys = Object.keys(auth.customHeaders);
      customAuthCode += `// Custom headers
const customHeaders: Record<string, string> = {};
${headerKeys.map(key => {
  const sanitizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const envVarName = `CUSTOM_HEADER_${sanitizedKey}`;
  return `const ${envVarName} = process.env.${envVarName} || "${auth.customHeaders![key]}";
customHeaders["${key}"] = ${envVarName};`;
}).join("\n")}
`;
    }
    
    if (auth.customQueryParams) {
      const paramKeys = Object.keys(auth.customQueryParams);
      customAuthCode += `// Custom query parameters
const customQueryParams: Record<string, string> = {};
${paramKeys.map(key => {
  const sanitizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const envVarName = `CUSTOM_QUERY_${sanitizedKey}`;
  return `const ${envVarName} = process.env.${envVarName} || "${auth.customQueryParams![key]}";
customQueryParams["${key}"] = ${envVarName};`;
}).join("\n")}
`;
    }
    
    return customAuthCode;
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
  } else if (auth.type === "custom") {
    let customAuthCode = "";
    
    if (auth.customHeaders) {
      customAuthCode += `    // Add custom headers
    Object.entries(customHeaders).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value);
      }
    });
`;
    }
    
    if (auth.customQueryParams) {
      customAuthCode += `    // Add custom query parameters
    Object.entries(customQueryParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
`;
    }
    
    return customAuthCode;
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
      // Convert /* to * for payment middleware (Hono uses * for catch-all)
      let paymentPath = route.path;
      if (paymentPath === "/*") {
        paymentPath = "*";
      }
      return `    "${paymentPath}": {\n      price: "${route.price}",\n      network,\n    }`;
    })
    .join(",\n");

  const paymentConfigStr = `{\n${paymentConfigEntries}\n  }`;

  // Generate proxy routes for each configured route
  const proxyRoutes = config.routes
    .map(route => {
      // Hono uses * for catch-all routes, /* for paths starting with /
      // Convert /* to * for proper matching
      let routePath = route.path;
      if (routePath === "/*") {
        routePath = "*";
      }
      
      return `// Proxy route: ${route.path}
app.all("${routePath}", async (c) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const timestamp = new Date().toISOString();
    console.log(\`\n📥 [\${timestamp}] [\${requestId}] Incoming request\`);
    console.log(\`   Method: \${c.req.method}\`);
    console.log(\`   Path: \${c.req.path}\`);
    console.log(\`   URL: \${c.req.url}\`);
    
    const baseUrl = new URL(apiBaseUrl);
    // Remove leading slash from request path to properly append to base URL
    const requestPath = c.req.path.startsWith("/") ? c.req.path.slice(1) : c.req.path;
    // Ensure base URL pathname ends with / for proper joining
    const basePathname = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : baseUrl.pathname + "/";
    // Construct the full pathname by joining base pathname with request path
    const fullPathname = basePathname + requestPath;
    // Create the final URL
    const url = new URL(fullPathname, baseUrl);

    // Forward query parameters
    const searchParams = new URL(c.req.url).searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    console.log(\`   🔄 Proxying to: \${url.toString()}\`);

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
    
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: hasBody ? await c.req.raw.clone().arrayBuffer() : undefined,
      });
    } catch (fetchError) {
      const duration = Date.now() - startTime;
      console.error(\`\n❌ [\${new Date().toISOString()}] [\${requestId}] Fetch error after \${duration}ms\`);
      console.error(\`   Error: \${fetchError instanceof Error ? fetchError.message : String(fetchError)}\`);
      console.error(\`   Target URL: \${url.toString()}\`);
      console.error(\`\n💡 Troubleshooting tips:\`);
      console.error(\`   - Verify the API base URL is correct: \${apiBaseUrl}\`);
      console.error(\`   - Check if the upstream API is accessible\`);
      console.error(\`   - Ensure network connectivity\`);
      if (fetchError instanceof Error && fetchError.stack) {
        console.error(\`   Stack trace: \${fetchError.stack}\`);
      }
      return c.json({ 
        error: "Failed to proxy request",
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        requestId 
      }, 502);
    }

    const duration = Date.now() - startTime;
    const statusEmoji = response.status >= 200 && response.status < 300 ? "✅" : 
                       response.status >= 400 && response.status < 500 ? "⚠️" : 
                       response.status >= 500 ? "❌" : "ℹ️";
    console.log(\`   \${statusEmoji} Response: \${response.status} \${response.statusText} (\${duration}ms)\`);
    
    if (response.status >= 400) {
      console.warn(\`   ⚠️  Upstream API returned error status\`);
      try {
        const errorBody = await response.clone().text();
        if (errorBody) {
          console.warn(\`   Response body: \${errorBody.substring(0, 200)}\${errorBody.length > 200 ? "..." : ""}\`);
        }
      } catch {
        // Ignore error body parsing errors
      }
    }

    // Forward response
    const responseBody = await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(\`\n❌ [\${new Date().toISOString()}] [\${requestId}] Unexpected error after \${duration}ms\`);
    console.error(\`   Error: \${error instanceof Error ? error.message : String(error)}\`);
    if (error instanceof Error && error.stack) {
      console.error(\`   Stack trace: \${error.stack}\`);
    }
    console.error(\`\n💡 Troubleshooting tips:\`);
    console.error(\`   - Check server logs for more details\`);
    console.error(\`   - Verify the request format is correct\`);
    console.error(\`   - Ensure all dependencies are properly installed\`);
    return c.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
      requestId 
    }, 500);
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

console.log("🔧 Initializing x402 proxy server...");
console.log(\`📡 Network: \${network || "not set"}\`);
console.log(\`🌐 API Base URL: \${apiBaseUrl}\`);
console.log(\`💳 Facilitator URL: \${facilitatorUrl || "not set"}\`);
console.log(\`💰 Payment Address: \${payTo || "not set"}\`);

if (!facilitatorUrl || !payTo || !network) {
  console.error("\n❌ Missing required environment variables");
  const missing: string[] = [];
  if (!facilitatorUrl) missing.push("FACILITATOR_URL");
  if (!payTo) missing.push("ADDRESS");
  if (!network) missing.push("NETWORK");
  console.error(\`   Missing: \${missing.join(", ")}\`);
  console.error("\n💡 Troubleshooting tips:");
  console.error("   - Ensure all required environment variables are set in your .env file");
  console.error("   - Check that FACILITATOR_URL is a valid URL");
  console.error("   - Verify ADDRESS is a valid blockchain address (Ethereum or Solana)");
  console.error("   - Ensure NETWORK matches your blockchain (e.g., solana-devnet, base, ethereum)");
  process.exit(1);
}

// Authentication configuration
${config.auth ? generateAuthConfig(config.auth) : "// No authentication configured"}
${config.auth ? `console.log(\`✅ Authentication configured: ${config.auth.type}\`);` : "console.log(`ℹ️  No authentication configured`);"}

const app = new Hono();

const port = Number(process.env.PORT) || 4021;
console.log(\`\n🚀 Starting server on port \${port}...\`);
console.log(\`📡 Proxying requests to: \${apiBaseUrl}\`);

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
  console.warn(\`\n⚠️  [\${new Date().toISOString()}] 404 Not Found\`);
  console.warn(\`   Method: \${c.req.method}\`);
  console.warn(\`   Path: \${c.req.path}\`);
  console.warn(\`   URL: \${c.req.url}\`);
  console.warn(\`\n💡 This path is not configured in the proxy server.\`);
  console.warn(\`   Configured routes: ${config.routes.map(r => r.path).join(", ")}\`);
  return c.json({ 
    error: "Not Found",
    message: \`The path \${c.req.path} is not configured in this proxy server\`,
    availableRoutes: ${JSON.stringify(config.routes.map(r => ({ path: r.path, price: r.price })))}
  }, 404);
});

const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(\`\n✅ Server is running!\`);
  console.log(\`   Port: \${info.port}\`);
  console.log(\`   Address: http://localhost:\${info.port}\`);
  console.log(\`   Network: \${network}\`);
  console.log(\`   Facilitator: \${facilitatorUrl}\`);
  console.log(\`   Payment Address: \${payTo}\`);
  console.log(\`\n📋 Configured routes:\`);
  ${config.routes.map(route => `  console.log(\`   - \${"${route.path}"} (Price: \${"${route.price}"})\`);`).join("\n")}
  console.log(\`\n🚀 Ready to accept requests!\n\`);
});

// Fallback log in case callback doesn't fire immediately
setTimeout(() => {
  console.log(\`\n✅ Server is running on port \${port}\`);
  console.log(\`   Address: http://localhost:\${port}\`);
}, 100);
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
 * Generates .env file with actual credentials
 */
function generateEnv(config: ProjectConfig): string {
  let authSection = "";
  
  if (config.auth) {
    if (config.auth.type === "apiKey") {
      if (config.auth.headerName) {
        authSection = `# API Key Authentication (Header)
API_KEY_HEADER=${config.auth.headerName}
API_KEY=${config.auth.value || ""}
`;
      } else if (config.auth.queryName) {
        authSection = `# API Key Authentication (Query Parameter)
API_KEY_QUERY=${config.auth.queryName}
API_KEY=${config.auth.value || ""}
`;
      } else if (config.auth.cookieName) {
        authSection = `# API Key Authentication (Cookie)
API_KEY_COOKIE=${config.auth.cookieName}
API_KEY=${config.auth.value || ""}
`;
      }
    } else if (config.auth.type === "bearer") {
      authSection = `# Bearer Token Authentication
BEARER_TOKEN=${config.auth.value || ""}
`;
    } else if (config.auth.type === "basic") {
      authSection = `# Basic Authentication
BASIC_AUTH_USERNAME=${config.auth.username || ""}
BASIC_AUTH_PASSWORD=${config.auth.password || ""}
`;
    } else if (config.auth.type === "custom") {
      authSection = "";
      
      if (config.auth.customHeaders) {
        authSection += `# Custom Headers Authentication
${Object.entries(config.auth.customHeaders)
  .map(([key, value]) => {
    const envVarName = `CUSTOM_HEADER_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return `${envVarName}=${value || ""}`;
  })
  .join("\n")}
`;
      }
      
      if (config.auth.customQueryParams) {
        authSection += `# Custom Query Parameters Authentication
${Object.entries(config.auth.customQueryParams)
  .map(([key, value]) => {
    const envVarName = `CUSTOM_QUERY_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return `${envVarName}=${value || ""}`;
  })
  .join("\n")}
`;
      }
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
 * Generates .env.example file with placeholder values
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
    } else if (config.auth.type === "custom") {
      authSection = "";
      
      if (config.auth.customHeaders) {
        authSection += `# Custom Headers Authentication
${Object.entries(config.auth.customHeaders)
  .map(([key]) => {
    const envVarName = `CUSTOM_HEADER_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return `${envVarName}=your-${key.toLowerCase().replace(/[^a-z0-9]/g, "-")}-value-here`;
  })
  .join("\n")}
`;
      }
      
      if (config.auth.customQueryParams) {
        authSection += `# Custom Query Parameters Authentication
${Object.entries(config.auth.customQueryParams)
  .map(([key]) => {
    const envVarName = `CUSTOM_QUERY_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return `${envVarName}=your-${key.toLowerCase().replace(/[^a-z0-9]/g, "-")}-value-here`;
  })
  .join("\n")}
`;
      }
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

1.${config.auth ? ` ✓ \`.env\` file has been created with your authentication credentials` : ` Copy \`.env.example\` to \`.env\` and configure your settings:

\`\`\`bash
cp .env.example .env
\`\`\``}

${config.auth ? `2.` : `2.`} Install dependencies:

\`\`\`bash
pnpm install
\`\`\`

${config.auth ? `3.` : `3.`} Run the server:

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

    // Generate .env with actual credentials
    const env = generateEnv(config);
    await fs.writeFile(path.join(outputDir, ".env"), env, "utf-8");

    // Generate .env.example with placeholder values
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

