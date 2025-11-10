# to402 Agent MD file

the aim is to create a cli tool to scafold an x402 proxy server that can easily turn a normal API into an
x402 API. kinda like an "npx create" tool.

the CLI will take the following params in a workflow kinda way:

- project or server name (default is to402-server)
- description
- path or url to openapi schema
- get the base url from the open api schema and display with option for user to provide a replacement
- option to set general price for x402 endpoints
- option to set price per endpoint. use scalar open api parser to display the api paths and option to set prices
- option to set the seller address

if openapi spec url is provided, there should be a helper function to download it into the project folder
 
read about x402 here https://www.x402.org and here https://x402.gitbook.io/x402
read x402 white paper here https://www.x402.org/x402.pdf
reference x402-hono here https://github.com/coinbase/x402/tree/main/examples/typescript/servers/hono
reference scalar openapi parser here https://github.com/scalar/scalar/tree/main/packages/openapi-parser