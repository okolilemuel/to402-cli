/**
 * Type definitions for the to402 CLI tool
 */

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
}

