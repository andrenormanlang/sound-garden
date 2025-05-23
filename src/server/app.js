import express from "express";
import { config } from "dotenv";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "../../public")));
app.use("/js", express.static(join(__dirname, "../client/js")));
app.use("/styles", express.static(join(__dirname, "../client/styles")));
app.use("/assets", express.static(join(__dirname, "../client/assets")));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add global error handlers
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Rate limiting variables
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50;
const requestLog = [];

function checkRateLimit() {
  const now = Date.now();
  // Remove old requests
  while (requestLog.length > 0 && requestLog[0] < now - RATE_LIMIT_WINDOW) {
    requestLog.shift();
  }
  // Check if we're over the limit
  if (requestLog.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  // Add new request
  requestLog.push(now);
  return true;
}

// API endpoint for generating garden-inspired musical plants
app.post("/api/generate-plant", async (req, res) => {
  try {
    // Check rate limit
    if (!checkRateLimit()) {
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(
          (RATE_LIMIT_WINDOW - (Date.now() - requestLog[0])) / 1000
        ),
      });
    }

    const quantity = Math.min(Math.max(1, req.body.quantity || 1), 100); // Reduce max to 100 per request
    const batchSize = 3; // Reduce batch size
    const allPlants = [];
    const errors = [];

    // Process plants in batches
    for (let i = 0; i < quantity; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, quantity - i);
      const batchPromises = Array(currentBatchSize)
        .fill()
        .map(async () => {
          try {
            const completion = await openai.chat.completions.create({
              model: "gpt-4.1",
              messages: [
                {
                  role: "system",
                  content: `You are a creative botanical AI that generates garden-inspired flower species with musical properties. Create flowers inspired by traditional garden varieties like:
- Tall spiky flowers (delphiniums, salvias)
- Bell-shaped flowers (foxgloves, snapdragons)
- Round flowers (zinnias, marigolds)
- Daisy-like flowers (asters, daisies)
- Ground-level flowers (petunias, pansies)

Respond with ONLY a valid JSON object in this exact format:
{
  "name": "string (Garden-inspired flower name)",
  "description": "string (Brief, evocative description)",
  "colors": [[hue (0-360), saturation (0-100), brightness (0-100)], [hue, sat, bri]], 
  "petals": "number (5-30, realistic for garden flowers)",
  "size": "[min_flower_head_size (10-80), max_flower_head_size (20-100)]",
  "height": "[min_stem_height (20-150), max_stem_height (50-250)]",
  "scale": "[array of 3-7 MIDI note numbers for a pleasant melody]",
  "oscillator": "string ('sine'|'triangle' for delicate flowers, 'square'|'sawtooth' for bold flowers)",
  "layerCount": "number (1-4, for petal layers like in roses or carnations)",
  "growthPattern": "string ('spiral'|'symmetrical'|'cascading'|'random')",
  "depthOffset": "number (0-100, for 3D placement variety)",
  "stemStyle": "string ('straight'|'curved'|'segmented'|'straight_bushy')",
  "stemRadius": "number (1-10, base radius of the stem)",
  "petalShape": "string ('elongated'|'round'|'pointed'|'bell_shaped'|'daisy_like')",
  "leafPattern": "string ('basal'|'alternate'|'opposite'|'whorled')",
  "flowerType": "string ('spike'|'single_bloom'|'cluster'|'composite'|'bell')",
  "seasonalBehavior": "string ('perennial'|'annual'|'biennial')",
  "pollinatorAttractant": "boolean (affects movement patterns)"
}`,
                },
                {
                  role: "user",
                  content:
                    "Generate a garden flower with natural proportions and appearance. Make it musically harmonious with a scale array containing 4-7 MIDI note numbers between 48 and 84.",
                },
              ],
              temperature: 0.8,
            });

            const response = completion.choices[0].message.content.trim();
            const plantData = JSON.parse(response);

            // Validate the plant data
            const validationErrors = validatePlantData(plantData);
            if (validationErrors.length > 0) {
              throw new Error(
                `Validation failed: ${validationErrors.join("; ")}`
              );
            }

            return plantData;
          } catch (error) {
            console.error("Error generating plant:", error);
            errors.push(error.message);
            return null;
          }
        });

      // Wait for the current batch to complete
      const batchResults = await Promise.all(batchPromises);
      allPlants.push(...batchResults.filter((plant) => plant !== null));

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < quantity) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Send response with all successfully generated plants
    res.json({
      plants: allPlants,
      total: allPlants.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in batch plant generation:", error);
    res.status(500).json({ error: "Failed to generate plants" });
  }
});

// Helper function to validate plant data
function validatePlantData(plantData) {
  const errors = [];

  function check(field, type, condition = null) {
    if (type === "string") {
      if (
        typeof plantData[field] !== "string" ||
        plantData[field].length === 0
      ) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "number") {
      if (
        !Number.isInteger(plantData[field]) ||
        (condition && !condition(plantData[field]))
      ) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "array") {
      if (
        !Array.isArray(plantData[field]) ||
        (condition && !condition(plantData[field]))
      ) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "enum") {
      if (!condition.includes(plantData[field])) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "boolean") {
      if (typeof plantData[field] !== "boolean") {
        errors.push(`Invalid ${field}`);
      }
    }
  }

  // Basic validations
  check("name", "string");
  check("description", "string");
  check(
    "colors",
    "array",
    (v) =>
      v.length > 0 &&
      v.every((color) => Array.isArray(color) && color.length === 3)
  );
  check("petals", "number", (v) => v >= 1 && v <= 30); // Allow fewer petals for some plant types
  check("size", "array", (v) => v.length === 2 && v[1] <= 100);
  check("height", "array", (v) => v.length === 2 && v[1] <= 250);
  check(
    "scale",
    "array",
    (v) => v.length >= 2 && v.every((n) => typeof n === "number")
  ); // More flexible scale validation
  check("oscillator", "enum", ["sine", "square", "triangle", "sawtooth"]);
  check("layerCount", "number", (v) => v >= 1 && v <= 4);
  check("growthPattern", "enum", [
    "spiral",
    "symmetrical",
    "cascading",
    "random",
  ]);
  check("depthOffset", "number", (v) => v >= 0 && v <= 100);
  check("stemStyle", "enum", [
    "straight",
    "curved",
    "segmented",
    "straight_bushy",
  ]);
  check("stemRadius", "number", (v) => v >= 1 && v <= 10);
  check("petalShape", "enum", [
    "elongated",
    "round",
    "pointed",
    "bell_shaped",
    "daisy_like",
  ]);
  check("leafPattern", "enum", ["basal", "alternate", "opposite", "whorled"]);
  check("flowerType", "enum", [
    "spike",
    "single_bloom",
    "cluster",
    "composite",
    "bell",
  ]);
  check("seasonalBehavior", "enum", ["perennial", "annual", "biennial"]);
  check("pollinatorAttractant", "boolean");

  return errors;
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
