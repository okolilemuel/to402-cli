import axios from "axios";
import { config } from "dotenv";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
// @ts-ignore - x402 types may not be fully exported
import { createSigner } from "x402/types";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

config();

/**
 * Converts a Solana private key (base58) to hex format
 * Solana keys are typically 64 bytes, but we need the first 32 bytes for Ethereum
 */
function convertSolanaKeyToHex(base58Key: string): Hex {
  try {
    // Decode base58 to buffer
    const decoded = bs58.decode(base58Key);
    
    // Solana private keys can be 64 bytes (secret key + public key) or 32 bytes (just secret key)
    // Ethereum needs exactly 32 bytes (the secret key part)
    let secretKey: Uint8Array;
    
    if (decoded.length === 32) {
      // Already 32 bytes, use as-is
      secretKey = decoded;
    } else if (decoded.length === 64) {
      // 64 bytes, take first 32 bytes (secret key part)
      secretKey = decoded.slice(0, 32);
    } else if (decoded.length > 32) {
      // Longer than 32 bytes, take first 32
      secretKey = decoded.slice(0, 32);
    } else {
      // Shorter than 32 bytes, pad with zeros (shouldn't happen but handle it)
      const padded = new Uint8Array(32);
      padded.set(decoded, 0);
      secretKey = padded;
    }
    
    // Ensure we have exactly 32 bytes
    if (secretKey.length !== 32) {
      throw new Error(`Invalid key length after processing: expected 32 bytes, got ${secretKey.length}`);
    }
    
    // Convert buffer to hex string
    const hex = `0x${Buffer.from(secretKey).toString("hex")}` as Hex;
    
    // Validate hex length
    if (hex.length !== 66) {
      throw new Error(`Invalid hex length: expected 66 characters, got ${hex.length}`);
    }
    
    return hex;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid")) {
      throw error;
    }
    throw new Error(`Failed to convert Solana private key to hex: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handles Solana private key in JSON array format [1,2,3,...]
 */
function parseSolanaKeyArray(keyString: string): Hex {
  try {
    // Try to parse as JSON array
    const keyArray = JSON.parse(keyString);
    if (!Array.isArray(keyArray)) {
      throw new Error("Not an array");
    }
    
    // Convert array to buffer (take first 32 bytes)
    const buffer = Buffer.from(keyArray.slice(0, 32));
    
    if (buffer.length !== 32) {
      throw new Error(`Invalid key length: expected 32 bytes, got ${buffer.length}`);
    }
    
    const hex = `0x${buffer.toString("hex")}` as Hex;
    return hex;
  } catch (error) {
    throw new Error(`Failed to parse Solana key array: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Detects if a private key is in Solana format (base58) or Ethereum format (hex)
 */
function normalizePrivateKey(key: string): Hex {
  const trimmedKey = key.trim();
  
  // Check if it's already hex format (starts with 0x and is valid hex)
  if (trimmedKey.startsWith("0x") && /^0x[0-9a-fA-F]+$/.test(trimmedKey)) {
    const hexKey = trimmedKey as Hex;
    // Validate length (should be 32 bytes = 64 hex chars + 0x prefix = 66 chars)
    if (hexKey.length === 66) {
      return hexKey;
    }
    throw new Error(`Invalid hex key length: expected 66 characters (0x + 64 hex), got ${hexKey.length}`);
  }
  
  // Check if it's hex without 0x prefix (64 hex characters)
  if (/^[0-9a-fA-F]{64}$/.test(trimmedKey)) {
    return `0x${trimmedKey}` as Hex;
  }
  
  // Check if it's a JSON array format [1,2,3,...]
  if (trimmedKey.startsWith("[")) {
    return parseSolanaKeyArray(trimmedKey);
  }
  
  // Assume it's Solana base58 format and convert
  return convertSolanaKeyToHex(trimmedKey);
}

const privateKeyRaw = process.env.PRIVATE_KEY;
const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. https://example.com
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /weather
const network = process.env.NETWORK as string; // e.g. solana-devnet, base, ethereum

if (!baseURL || !privateKeyRaw || !endpointPath) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// Determine if we're using Solana or Ethereum-based network
const isSolanaNetwork = network?.toLowerCase().includes("solana");

let wallet: any;

// Use async IIFE to handle async wallet creation
(async () => {
  console.log("🔧 Initializing wallet client...");
  console.log(`📡 Network: ${network || "not specified"}`);
  console.log(`🌐 Base URL: ${baseURL}`);
  console.log(`📍 Endpoint: ${endpointPath}`);

if (isSolanaNetwork) {
  // For Solana networks, use x402's svm.createSignerFromBase58
  try {
    console.log("🔐 Processing Solana private key...");
    let base58Key: string;
    
    // Check if it's a JSON array format [1,2,3,...]
    if (privateKeyRaw.trim().startsWith("[")) {
      console.log("📋 Detected JSON array format, converting to base58...");
      try {
        const keyArray = JSON.parse(privateKeyRaw);
        if (!Array.isArray(keyArray)) {
          throw new Error("Invalid JSON array format");
        }
        const secretKey = new Uint8Array(keyArray);
        base58Key = bs58.encode(secretKey);
        console.log(`✓ Converted JSON array to base58 (key length: ${secretKey.length} bytes)`);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON array:", parseError instanceof Error ? parseError.message : String(parseError));
        throw new Error(`Invalid JSON array format: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } else {
      // Assume it's already base58 format
      console.log("📋 Detected base58 format");
      base58Key = privateKeyRaw.trim();
      // Validate base58 format
      try {
        const decoded = bs58.decode(base58Key);
        console.log(`✓ Valid base58 key (decoded length: ${decoded.length} bytes)`);
      } catch (decodeError) {
        console.error("❌ Invalid base58 format:", decodeError instanceof Error ? decodeError.message : String(decodeError));
        throw new Error(`Invalid base58 private key format: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
      }
    }
    
    // Create wallet client using x402's createSigner
    // createSigner handles both EVM and SVM networks automatically
    console.log(`🔨 Creating Solana wallet client for network: ${network || "solana-devnet"}...`);
    if (typeof createSigner === "function") {
      wallet = await createSigner(network || "solana-devnet", base58Key);
      console.log(`✅ Solana wallet client created successfully`);
    } else {
      console.error("❌ createSigner function not available from x402/types");
      throw new Error("createSigner not available from x402/types");
    }
  } catch (error) {
    console.error("\n❌ Failed to create Solana wallet client");
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    console.error("\n💡 Troubleshooting tips:");
    console.error("  - Ensure your private key is in base58 or JSON array format");
    console.error("  - Verify the network is set correctly (e.g., solana-devnet)");
    console.error("  - Check that x402 package is properly installed");
    process.exit(1);
  }
} else {
  // For Ethereum-based networks, use Ethereum account
  console.log("🔐 Processing Ethereum private key...");
  let privateKey: Hex;
  try {
    privateKey = normalizePrivateKey(privateKeyRaw);
    console.log(`✓ Private key normalized (length: ${privateKey.length} chars)`);
  } catch (error) {
    console.error("\n❌ Failed to normalize private key");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    console.error("\n📋 Key format detected:", {
      startsWith0x: privateKeyRaw.startsWith("0x"),
      startsWithBracket: privateKeyRaw.trim().startsWith("["),
      length: privateKeyRaw.length,
      firstChars: privateKeyRaw.substring(0, 20) + "...",
    });
    console.error("\n💡 Troubleshooting tips:");
    console.error("  - For Ethereum: Use hex format starting with 0x (64 hex chars)");
    console.error("  - For Solana: Use base58 format or JSON array format");
    console.error("  - Ensure the private key is complete and not truncated");
    process.exit(1);
  }
  
  try {
    wallet = privateKeyToAccount(privateKey);
    console.log(`✅ Ethereum account created (address: ${wallet.address})`);
  } catch (error) {
    console.error("\n❌ Failed to create Ethereum account");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    console.error("\n💡 Troubleshooting tips:");
    console.error("  - Verify the private key is valid hex format");
    console.error("  - Ensure the key is exactly 32 bytes (64 hex characters + 0x prefix)");
    process.exit(1);
  }
}

  console.log("\n🚀 Creating API client with payment interceptor...");
  try {
    const api = withPaymentInterceptor(
      axios.create({
        baseURL,
      }),
      wallet,
    );
    console.log("✅ API client created successfully");

    console.log(`\n📤 Making request to: ${baseURL}${endpointPath}`);
    console.log(`⏳ Waiting for response...\n`);

    api
      .get(endpointPath)
      .then(response => {
        console.log("✅ Request successful!");
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log("📦 Response data:", JSON.stringify(response.data, null, 2));

        if (response.headers["x-payment-response"]) {
          try {
            const paymentResponse = decodeXPaymentResponse(response.headers["x-payment-response"] as string);
            console.log("\n💰 Payment response:", JSON.stringify(paymentResponse, null, 2));
          } catch (decodeError) {
            console.warn("⚠️  Failed to decode payment response:", decodeError instanceof Error ? decodeError.message : String(decodeError));
          }
        }
      })
      .catch(error => {
        console.error("\n❌ Request failed");
        
        if (error.response) {
          // HTTP error response
          console.error(`📡 HTTP Status: ${error.response.status} ${error.response.statusText}`);
          console.error("📦 Response data:", JSON.stringify(error.response.data, null, 2));
          
          if (error.response.status === 402) {
            console.error("\n💳 Payment Required (402)");
            if (error.response.data?.accepts) {
              console.error("📋 Accepted payment methods:");
              error.response.data.accepts.forEach((accept: any, index: number) => {
                console.error(`  ${index + 1}. Network: ${accept.network}, Asset: ${accept.asset}`);
                console.error(`     Max amount: ${accept.maxAmountRequired}, Pay to: ${accept.payTo}`);
              });
            }
            console.error("\n💡 The payment interceptor should have automatically handled this.");
            console.error("   If you see this, the payment transaction may have failed.");
          }
        } else if (error.cause) {
          // Transaction/simulation error
          console.error("🔴 Transaction Error:", error.message);
          console.error("📋 Error cause:", JSON.stringify(error.cause, null, 2));
          
          if (error.cause.InstructionError) {
            const [index, errorType] = error.cause.InstructionError;
            console.error(`\n💡 Instruction Error Details:`);
            console.error(`   Instruction Index: ${index}`);
            console.error(`   Error Type: ${errorType}`);
            
            if (errorType === "InvalidAccountData") {
              console.error("\n🔧 Possible solutions:");
              console.error("   - The associated token account (ATA) may not exist");
              console.error("   - The wallet may not have sufficient token balance");
              console.error("   - The token account may need to be created first");
              console.error("   - Verify the network and token addresses are correct");
            }
          }
        } else if (error.request) {
          // Request made but no response
          console.error("📡 No response received from server");
          console.error("💡 Check if the server is running at:", baseURL);
          console.error("💡 Verify the endpoint path is correct:", endpointPath);
        } else {
          // Other error
          console.error("❌ Error:", error.message);
          if (error.stack) {
            console.error("📚 Stack trace:", error.stack);
          }
        }
        
        console.error("\n🔍 Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        process.exit(1);
      });
  } catch (error) {
    console.error("\n❌ Failed to create API client");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
})();