#!/usr/bin/env node
/**
 * to402 CLI - Scaffold an x402 proxy server
 */

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { generateProject } from "./generator.js";
import { ProjectConfig, AuthConfig, RouteConfig } from "./types.js";

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
    .description("Scaffold an x402 proxy server")
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

  // Step 3: Base URL
  const { baseUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "baseUrl",
      message: "API base URL to proxy:",
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

  // Step 4: Default price
  const { defaultPrice } = await inquirer.prompt([
    {
      type: "input",
      name: "defaultPrice",
      message: "Default price for all routes (e.g., $0.001):",
      default: "$0.001",
      validate: (input: string) => {
        if (!isValidPrice(input)) {
          return "Invalid price format. Use format like $0.001 or 0.001";
        }
        return true;
      },
    },
  ]);

  // Step 5: Routes configuration
  console.log(chalk.blue("\n💰 Configure routes and pricing"));
  const routes: RouteConfig[] = [];
  let addMoreRoutes = true;

  while (addMoreRoutes) {
    const { routePath } = await inquirer.prompt([
      {
        type: "input",
        name: "routePath",
        message: "Route path (use * for wildcard, e.g., /api/* or /users/:id):",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Route path cannot be empty";
          }
          if (!input.startsWith("/")) {
            return "Route path must start with /";
          }
          return true;
        },
      },
    ]);

    const { routePrice } = await inquirer.prompt([
      {
        type: "input",
        name: "routePrice",
        message: `Price for ${chalk.cyan(routePath)}:`,
        default: defaultPrice,
        validate: (input: string) => {
          if (!isValidPrice(input)) {
            return "Invalid price format. Use format like $0.001 or 0.001";
          }
          return true;
        },
      },
    ]);

    routes.push({
      path: routePath.trim(),
      price: normalizePrice(routePrice),
    });

    const { addMore } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addMore",
        message: "Add another route?",
        default: true,
      },
    ]);
    addMoreRoutes = addMore;
  }

  // Step 6: Seller address
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

  // Step 7: Network
  const { network } = await inquirer.prompt([
    {
      type: "list",
      name: "network",
      message: "Blockchain network:",
      choices: networks,
      default: "base",
    },
  ]);

  // Step 8: Facilitator URL
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

  // Step 9: Authentication
  const { addAuth } = await inquirer.prompt([
    {
      type: "confirm",
      name: "addAuth",
      message: "Add authentication?",
      default: false,
    },
  ]);

  let authConfig: AuthConfig | undefined;
  if (addAuth) {
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

  // Build config
  const config: ProjectConfig = {
    projectName,
    description,
    baseUrl: baseUrl.trim(),
    defaultPrice: normalizePrice(defaultPrice),
    sellerAddress: sellerAddress.trim(),
    network,
    facilitatorUrl: facilitatorUrl.trim(),
    routes,
    auth: authConfig,
  };

  // Generate project
  const projectDir = path.join(process.cwd(), projectName);
  await fs.ensureDir(projectDir);
  
  console.log(chalk.blue("\n🔨 Generating project..."));
  await generateProject(config, projectDir);

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

