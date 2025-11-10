/**
 * Type definitions for the to402 CLI tool
 */

export interface AuthConfig {
  type: "apiKey" | "basic" | "bearer" | "custom";
  value?: string; // API key or bearer token
  username?: string; // For basic auth
  password?: string; // For basic auth
  headerName?: string; // For API key in header
  queryName?: string; // For API key in query
  // Custom auth
  customHeaders?: Record<string, string>; // Key-value pairs for custom headers
  customQueryParams?: Record<string, string>; // Key-value pairs for custom query parameters
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

