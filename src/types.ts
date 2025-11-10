/**
 * Type definitions for the to402 CLI tool
 */

export interface SecurityScheme {
  name: string;
  type: "apiKey" | "http";
  scheme?: string; // For http type: "basic" | "bearer"
  in?: "header" | "query" | "cookie"; // For apiKey type
  headerName?: string; // For apiKey in header
  queryName?: string; // For apiKey in query
  cookieName?: string; // For apiKey in cookie
  bearerFormat?: string; // For bearer auth
}

export interface AuthConfig {
  type: "apiKey" | "basic" | "bearer" | "custom";
  value?: string; // API key or bearer token
  username?: string; // For basic auth
  password?: string; // For basic auth
  headerName?: string; // For custom header auth
  queryName?: string; // For custom query auth
}

export interface ProjectConfig {
  projectName: string;
  description: string;
  openApiPath: string;
  baseUrl: string;
  defaultPrice: string;
  sellerAddress: string;
  network: string;
  facilitatorUrl?: string;
  endpointPrices: Record<string, string>;
  auth?: AuthConfig;
}

export interface OpenApiPath {
  path: string;
  methods: string[];
  operationId?: string;
  summary?: string;
}

export interface ParsedOpenApi {
  baseUrl: string;
  paths: OpenApiPath[];
  spec: any;
  securitySchemes: SecurityScheme[];
}

