/**
 * OpenAPI schema handling utilities
 */

import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { ParsedOpenApi, OpenApiPath, SecurityScheme } from "./types.js";

/**
 * Downloads an OpenAPI spec from a URL
 * @param url - The URL to download from
 * @param outputPath - The path to save the file
 * @returns The path to the downloaded file
 */
export async function downloadOpenApiSpec(
  url: string,
  outputPath: string,
): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download OpenAPI spec: ${response.statusText}`);
    }

    const content = await response.text();
    const isYaml = url.endsWith(".yaml") || url.endsWith(".yml") || content.trim().startsWith("---");

    const filePath = isYaml
      ? path.join(outputPath, "openapi.yaml")
      : path.join(outputPath, "openapi.json");

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, "utf-8");

    return filePath;
  } catch (error) {
    throw new Error(`Failed to download OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Loads an OpenAPI spec from a file path or URL
 * @param specPath - Path to the spec file or URL
 * @param projectDir - Directory to save downloaded specs
 * @returns The path to the loaded spec file
 */
export async function loadOpenApiSpec(
  specPath: string,
  projectDir: string,
): Promise<string> {
  // Check if it's a URL
  if (specPath.startsWith("http://") || specPath.startsWith("https://")) {
    return await downloadOpenApiSpec(specPath, projectDir);
  }

  // Check if local file exists
  if (!(await fs.pathExists(specPath))) {
    throw new Error(`OpenAPI spec file not found: ${specPath}`);
  }

  return specPath;
}

/**
 * Parses an OpenAPI spec file
 * @param filePath - Path to the OpenAPI spec file
 * @returns Parsed OpenAPI information
 */
export async function parseOpenApiSpec(filePath: string): Promise<ParsedOpenApi> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const isYaml = filePath.endsWith(".yaml") || filePath.endsWith(".yml");

    let spec: any;
    if (isYaml) {
      spec = yaml.load(content);
    } else {
      spec = JSON.parse(content);
    }

    // Extract base URL from servers array
    let baseUrl = "";
    if (spec.servers && spec.servers.length > 0) {
      baseUrl = spec.servers[0].url;
    }

    // Extract security schemes (excluding OAuth2 and OpenID Connect)
    const securitySchemes: SecurityScheme[] = [];
    const components = spec.components || {};
    const securitySchemesObj = components.securitySchemes || {};

    for (const [name, scheme] of Object.entries(securitySchemesObj)) {
      if (typeof scheme !== "object" || scheme === null) continue;

      const schemeType = (scheme as any).type;
      
      // Skip OAuth2 and OpenID Connect for now
      if (schemeType === "oauth2" || schemeType === "openIdConnect") {
        continue;
      }

      if (schemeType === "apiKey") {
        const apiKeyScheme = scheme as any;
        securitySchemes.push({
          name,
          type: "apiKey",
          in: apiKeyScheme.in,
          headerName: apiKeyScheme.in === "header" ? apiKeyScheme.name : undefined,
          queryName: apiKeyScheme.in === "query" ? apiKeyScheme.name : undefined,
          cookieName: apiKeyScheme.in === "cookie" ? apiKeyScheme.name : undefined,
        });
      } else if (schemeType === "http") {
        const httpScheme = scheme as any;
        const httpSchemeType = httpScheme.scheme?.toLowerCase();
        if (httpSchemeType === "basic" || httpSchemeType === "bearer") {
          securitySchemes.push({
            name,
            type: "http",
            scheme: httpSchemeType,
            bearerFormat: httpScheme.bearerFormat,
          });
        }
      }
      // Skip mutualTLS and other unsupported auth types
    }

    // Extract paths
    const paths: OpenApiPath[] = [];
    const pathsObj = spec.paths || {};

    for (const [pathStr, pathItem] of Object.entries(pathsObj)) {
      if (typeof pathItem !== "object" || pathItem === null) continue;

      const methods: string[] = [];
      let operationId: string | undefined;
      let summary: string | undefined;

      for (const [method, operation] of Object.entries(pathItem)) {
        if (["get", "post", "put", "delete", "patch", "options", "head"].includes(method.toLowerCase())) {
          methods.push(method.toUpperCase());
          if (typeof operation === "object" && operation !== null) {
            if (!operationId && "operationId" in operation) {
              operationId = String(operation.operationId);
            }
            if (!summary && "summary" in operation) {
              summary = String(operation.summary);
            }
          }
        }
      }

      if (methods.length > 0) {
        paths.push({
          path: pathStr,
          methods,
          operationId,
          summary,
        });
      }
    }

    return {
      baseUrl,
      paths,
      spec,
      securitySchemes,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

