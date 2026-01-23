/**
 * Standalone script to test OpenAI API key validity
 * 
 * Usage:
 *   node test-openai-key.js
 * 
 * Or with a specific key:
 *   OPENAI_API_KEY=your_key_here node test-openai-key.js
 */

import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get API key from environment or command line argument
const apiKey = process.env.OPENAI_API_KEY || process.argv[2];

if (!apiKey) {
  console.error("❌ Error: No API key provided!");
  console.log("\nUsage:");
  console.log("  1. Set OPENAI_API_KEY in .env file, or");
  console.log("  2. Run: OPENAI_API_KEY=your_key node test-openai-key.js, or");
  console.log("  3. Run: node test-openai-key.js your_key_here");
  process.exit(1);
}

console.log("🔍 Testing OpenAI API key...");
console.log("Key prefix:", apiKey.substring(0, 20) + "...\n");

const openai = new OpenAI({
  apiKey: apiKey,
});

async function testKey() {
  try {
    // Make a simple API call to verify the key
    // Using models.list() as it's a lightweight endpoint
    const models = await openai.models.list();
    
    console.log("✅ SUCCESS! Your OpenAI API key is valid!");
    console.log(`📊 Available models: ${models.data.length}`);
    console.log("\nYou can now use AI features in your application.");
    
    // Optionally show a few model names
    if (models.data.length > 0) {
      console.log("\nSample models available:");
      models.data.slice(0, 5).forEach(model => {
        console.log(`  - ${model.id}`);
      });
      if (models.data.length > 5) {
        console.log(`  ... and ${models.data.length - 5} more`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ FAILED! Your OpenAI API key is invalid or has an error.");
    
    if (error.status === 401) {
      console.error("\n🔑 Error: Invalid API key");
      console.error("   The key you provided is not valid or has been revoked.");
      console.error("   Please check your API key at: https://platform.openai.com/api-keys");
    } else if (error.status === 429) {
      console.error("\n⏱️  Error: Rate limit exceeded");
      console.error("   Your API key is valid, but you've hit the rate limit.");
      console.error("   Please try again later.");
    } else {
      console.error("\n💥 Error:", error.message);
      if (error.status) {
        console.error("   Status code:", error.status);
      }
    }
    
    process.exit(1);
  }
}

testKey();

