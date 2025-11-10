#!/usr/bin/env node
/**
 * to402 CLI - Scaffold an x402 proxy server from an OpenAPI specification
 */

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { loadOpenApiSpec, parseOpenApiSpec } from "./openapi.js";
import { generateProject } from "./generator.js";
import { ProjectConfig, OpenApiPath, AuthConfig } from "./types.js";

const networks = ["base", "ethereum", "solana", "polygon", "arbitrum", "optimism"];

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid Ethereum address
 */
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates if a string is a valid Solana address
 */
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validates if a string is a valid price format
 */
function isValidPrice(price: string): boolean {
  // Support formats like $0.001, 0.001, $1.50, etc.
  return /^\$?\d+(\.\d+)?$/.test(price.trim());
}

/**
 * Normalizes price format
 */
function normalizePrice(price: string): string {
  const trimmed = price.trim();
  return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
}

/**
 * Main CLI function
 */
function main() {
  program
    .name("to402")
    .description("Scaffold an x402 proxy server from an OpenAPI specification")
    .version("0.1.0");

  program
    .command("create")
    .description("Create a new x402 proxy server project")
    .action(async () => {
      try {
        console.log(chalk.blue.bold("\n🚀 to402 CLI - Scaffold an x402 Proxy Server\n"));
        await runInteractiveSetup();
      } catch (error) {
        console.error(chalk.red("\n❌ Error:"), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // If no command provided, show help
  if (process.argv.length === 2) {
    program.help();
  }

  program.parse();
}

/**
 * Runs the interactive setup workflow
 */
async function runInteractiveSetup(): Promise<void> {
  // Step 1: Project name
  const { projectName } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      default: "to402-server",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Project name cannot be empty";
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return "Project name can only contain lowercase letters, numbers, and hyphens";
        }
        return true;
      },
    },
  ]);

  // Step 2: Description
  const { description } = await inquirer.prompt([
    {
      type: "input",
      name: "description",
      message: "Project description:",
      default: "An x402 proxy server",
    },
  ]);

  // Step 3: OpenAPI schema path or URL
  const { openApiPath } = await inquirer.prompt([
    {
      type: "input",
      name: "openApiPath",
      message: "OpenAPI schema path or URL:",
      validate: async (input: string) => {
        if (!input.trim()) {
          return "OpenAPI schema path or URL is required";
        }
        // If it's a URL, validate URL format
        if (input.startsWith("http://") || input.startsWith("https://")) {
          if (!isValidUrl(input)) {
            return "Invalid URL format";
          }
          return true;
        }
        // If it's a local path, check if file exists
        if (!(await fs.pathExists(input))) {
          return `File not found: ${input}`;
        }
        return true;
      },
    },
  ]);

  // Step 4: Load and parse OpenAPI spec
  console.log(chalk.blue("\n📥 Loading OpenAPI specification..."));
  const projectDir = path.join(process.cwd(), projectName);
  await fs.ensureDir(projectDir);

  let openApiFilePath: string;
  try {
    openApiFilePath = await loadOpenApiSpec(openApiPath, projectDir);
  } catch (error) {
    throw new Error(`Failed to load OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
  }

  let parsedOpenApi;
  try {
    parsedOpenApi = await parseOpenApiSpec(openApiFilePath);
  } catch (error) {
    throw new Error(`Failed to parse OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(chalk.green(`✓ Loaded ${parsedOpenApi.paths.length} API paths`));

  // Step 5: Base URL
  let baseUrl = parsedOpenApi.baseUrl;
  if (baseUrl) {
    const { useDefaultBaseUrl } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useDefaultBaseUrl",
        message: `Use base URL from OpenAPI spec: ${chalk.cyan(baseUrl)}?`,
        default: true,
      },
    ]);

    if (!useDefaultBaseUrl) {
      const { customBaseUrl } = await inquirer.prompt([
        {
          type: "input",
          name: "customBaseUrl",
          message: "Enter base URL:",
          validate: (input: string) => {
            if (!input.trim()) {
              return "Base URL cannot be empty";
            }
            if (!isValidUrl(input)) {
              return "Invalid URL format";
            }
            return true;
          },
        },
      ]);
      baseUrl = customBaseUrl.trim();
    }
  } else {
    const { customBaseUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "customBaseUrl",
        message: "Enter base URL (not found in OpenAPI spec):",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Base URL cannot be empty";
          }
          if (!isValidUrl(input)) {
            return "Invalid URL format";
          }
          return true;
        },
      },
    ]);
    baseUrl = customBaseUrl.trim();
  }

  // Step 6: Default price
  const { defaultPrice } = await inquirer.prompt([
    {
      type: "input",
      name: "defaultPrice",
      message: "Default price for all endpoints (e.g., $0.001):",
      default: "$0.001",
      validate: (input: string) => {
        if (!isValidPrice(input)) {
          return "Invalid price format. Use format like $0.001 or 0.001";
        }
        return true;
      },
    },
  ]);

  // Step 7: Per-endpoint pricing
  console.log(chalk.blue("\n💰 Configure endpoint pricing"));
  const endpointPrices: Record<string, string> = {};

  if (parsedOpenApi.paths.length > 0) {
    const { configurePerEndpoint } = await inquirer.prompt([
      {
        type: "confirm",
        name: "configurePerEndpoint",
        message: `Configure individual prices for ${parsedOpenApi.paths.length} endpoints?`,
        default: false,
      },
    ]);

    if (configurePerEndpoint) {
      for (const apiPath of parsedOpenApi.paths) {
        const pathDisplay = `${apiPath.methods.join(", ")} ${apiPath.path}${apiPath.summary ? ` - ${apiPath.summary}` : ""}`;
        const { price } = await inquirer.prompt([
          {
            type: "input",
            name: "price",
            message: `Price for ${chalk.cyan(pathDisplay)}:`,
            default: defaultPrice,
            validate: (input: string) => {
              if (!isValidPrice(input)) {
                return "Invalid price format. Use format like $0.001 or 0.001";
              }
              return true;
            },
          },
        ]);
        endpointPrices[apiPath.path] = normalizePrice(price);
      }
    }
  }

  // Step 8: Seller address
  const { sellerAddress } = await inquirer.prompt([
    {
      type: "input",
      name: "sellerAddress",
      message: "Seller address (Ethereum or Solana):",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Seller address is required";
        }
        if (!isValidEthereumAddress(input) && !isValidSolanaAddress(input)) {
          return "Invalid address format. Must be a valid Ethereum or Solana address";
        }
        return true;
      },
    },
  ]);

  // Step 9: Network
  const { network } = await inquirer.prompt([
    {
      type: "list",
      name: "network",
      message: "Blockchain network:",
      choices: networks,
      default: "base",
    },
  ]);

  // Step 10: Facilitator URL
  const { facilitatorUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "facilitatorUrl",
      message: "Facilitator URL:",
      default: "https://facilitator.x402.org",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Facilitator URL cannot be empty";
        }
        if (!isValidUrl(input)) {
          return "Invalid URL format";
        }
        return true;
      },
    },
  ]);

  // Step 11: Authentication
  let authConfig: AuthConfig | undefined;
  
  if (parsedOpenApi.securitySchemes.length > 0) {
    console.log(chalk.blue("\n🔐 Authentication detected in OpenAPI spec"));
    
    // If multiple schemes, let user choose which one to use
    let selectedScheme;
    if (parsedOpenApi.securitySchemes.length === 1) {
      selectedScheme = parsedOpenApi.securitySchemes[0];
      console.log(chalk.cyan(`Using: ${selectedScheme.name} (${selectedScheme.type})`));
    } else {
      const { schemeName } = await inquirer.prompt([
        {
          type: "list",
          name: "schemeName",
          message: "Select authentication method:",
          choices: parsedOpenApi.securitySchemes.map(s => ({
            name: `${s.name} (${s.type}${s.scheme ? ` - ${s.scheme}` : ""})`,
            value: s.name,
          })),
        },
      ]);
      selectedScheme = parsedOpenApi.securitySchemes.find(s => s.name === schemeName);
    }

    if (selectedScheme) {
      if (selectedScheme.type === "apiKey") {
        const promptMessage = selectedScheme.in === "header"
          ? `API Key for ${selectedScheme.headerName || "header"}:`
          : selectedScheme.in === "query"
          ? `API Key for query parameter ${selectedScheme.queryName || "query"}:`
          : `API Key for cookie ${selectedScheme.cookieName || "cookie"}:`;
        
        const { apiKey } = await inquirer.prompt([
          {
            type: "input",
            name: "apiKey",
            message: promptMessage,
            validate: (input: string) => {
              if (!input.trim()) {
                return "API Key cannot be empty";
              }
              return true;
            },
          },
        ]);

        authConfig = {
          type: "apiKey",
          value: apiKey.trim(),
          headerName: selectedScheme.headerName,
          queryName: selectedScheme.queryName,
          cookieName: selectedScheme.cookieName,
        };
      } else if (selectedScheme.type === "http" && selectedScheme.scheme === "bearer") {
        const { bearerToken } = await inquirer.prompt([
          {
            type: "input",
            name: "bearerToken",
            message: "Bearer Token:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Bearer Token cannot be empty";
              }
              return true;
            },
          },
        ]);

        authConfig = {
          type: "bearer",
          value: bearerToken.trim(),
        };
      } else if (selectedScheme.type === "http" && selectedScheme.scheme === "basic") {
        const { username, password } = await inquirer.prompt([
          {
            type: "input",
            name: "username",
            message: "Username:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Username cannot be empty";
              }
              return true;
            },
          },
          {
            type: "password",
            name: "password",
            message: "Password:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Password cannot be empty";
              }
              return true;
            },
          },
        ]);

        authConfig = {
          type: "basic",
          username: username.trim(),
          password: password.trim(),
        };
      }
    }
  } else {
    // No auth in spec, ask if user wants to add custom
    const { addCustomAuth } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addCustomAuth",
        message: "No authentication found in OpenAPI spec. Add custom authentication?",
        default: false,
      },
    ]);

    if (addCustomAuth) {
      const { authType } = await inquirer.prompt([
        {
          type: "list",
          name: "authType",
          message: "Select authentication type:",
          choices: [
            { name: "API Key (Header)", value: "apiKeyHeader" },
            { name: "API Key (Query Parameter)", value: "apiKeyQuery" },
            { name: "Bearer Token", value: "bearer" },
            { name: "Basic Auth", value: "basic" },
          ],
        },
      ]);

      if (authType === "apiKeyHeader") {
        const { headerName, apiKey } = await inquirer.prompt([
          {
            type: "input",
            name: "headerName",
            message: "Header name (e.g., X-API-Key):",
            default: "X-API-Key",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Header name cannot be empty";
              }
              return true;
            },
          },
          {
            type: "input",
            name: "apiKey",
            message: "API Key:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "API Key cannot be empty";
              }
              return true;
            },
          },
        ]);

        authConfig = {
          type: "apiKey",
          value: apiKey.trim(),
          headerName: headerName.trim(),
        };
      } else if (authType === "apiKeyQuery") {
        const { queryName, apiKey } = await inquirer.prompt([
          {
            type: "input",
            name: "queryName",
            message: "Query parameter name (e.g., api_key):",
            default: "api_key",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Query parameter name cannot be empty";
              }
              return true;
            },
          },
          {
            type: "input",
            name: "apiKey",
            message: "API Key:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "API Key cannot be empty";
              }
              return true;
            },
          },
        ]);

        authConfig = {
          type: "apiKey",
          value: apiKey.trim(),
          queryName: queryName.trim(),
        };
      } else if (authType === "bearer") {
        const { bearerToken } = await inquirer.prompt([
          {
            type: "input",
            name: "bearerToken",
            message: "Bearer Token:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Bearer Token cannot be empty";
              }
              return true;
            },
          },
        ]);

        authConfig = {
          type: "bearer",
          value: bearerToken.trim(),
        };
      } else if (authType === "basic") {
        const { username, password } = await inquirer.prompt([
          {
            type: "input",
            name: "username",
            message: "Username:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Username cannot be empty";
              }
              return true;
            },
          },
          {
            type: "password",
            name: "password",
            message: "Password:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Password cannot be empty";
              }
              return true;
            },
          },
        ]);

        authConfig = {
          type: "basic",
          username: username.trim(),
          password: password.trim(),
        };
      }
    }
  }

  // Build config
  const config: ProjectConfig = {
    projectName,
    description,
    openApiPath: openApiPath,
    baseUrl,
    defaultPrice: normalizePrice(defaultPrice),
    sellerAddress: sellerAddress.trim(),
    network,
    facilitatorUrl: facilitatorUrl.trim(),
    endpointPrices,
    auth: authConfig,
  };

  // Generate project
  console.log(chalk.blue("\n🔨 Generating project..."));
  await generateProject(config, parsedOpenApi.paths, projectDir, openApiFilePath);

  console.log(chalk.green.bold("\n✅ Project created successfully!"));
  console.log(chalk.cyan(`\n📁 Project location: ${path.resolve(projectDir)}`));
  console.log(chalk.yellow("\n📝 Next steps:"));
  console.log(`  1. cd ${projectName}`);
  console.log(`  2. cp .env.example .env`);
  console.log(`  3. Edit .env with your configuration`);
  console.log(`  4. pnpm install`);
  console.log(`  5. pnpm dev`);
  console.log();
}

// Run CLI if this file is executed directly
main();

