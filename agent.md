# to402 Agent MD file

the aim is to create a cli tool to scaffold an x402 proxy server that can easily turn a normal API into an
x402 API. kinda like an "npx create" tool.

the CLI will take the following params in a workflow kinda way:

- project or server name (default is to402-server)
- description
- base url to proxy
- option to set general price for x402 routes
- option to configure routes with wildcard support (e.g., /api/*, /users/:id)
- option to set price per route
- option to set the seller address
- option to configure authentication (API Key, Bearer Token, or Basic Auth)
 
read about x402 here https://www.x402.org and here https://x402.gitbook.io/x402
read x402 white paper here https://www.x402.org/x402.pdf
reference x402-hono here https://github.com/coinbase/x402/tree/main/examples/typescript/servers/hono