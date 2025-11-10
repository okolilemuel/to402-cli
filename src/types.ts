/**
 * Type definitions for the to402 CLI tool
 */

export interface AuthConfig {
  type: "apiKey" | "basic" | "bearer";
  value?: string; // API key or bearer token
  username?: string; // For basic auth
  password?: string; // For basic auth
  headerName?: string; // For API key in header
  queryName?: string; // For API key in query
}

export interface RouteConfig {
  path: string; // Wildcard path like "/api/*" or exact path
  price: string;
}

export interface ProjectConfig {
  projectName: string;
  description: string;
  baseUrl: string;
  defaultPrice: string;
  sellerAddress: string;
  network: string;
  facilitatorUrl?: string;
  routes: RouteConfig[];
  auth?: AuthConfig;
}

