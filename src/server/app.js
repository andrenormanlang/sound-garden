import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generatePlant } from "./services/aiPlantGenerator.js";
import { generateWeather } from "./services/aiWeatherGenerator.js";
import { generateRainbow } from "./services/aiRainbowGenerator.js"; // Added import

// Determine directory name for both ESM and CJS contexts (Netlify functions)
let __dirname;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
} catch {
  // import.meta.url might be undefined in CJS context
  __dirname = process.cwd();
}

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "../../public")));
app.use("/js", express.static(join(__dirname, "../client/js")));
app.use("/styles", express.static(join(__dirname, "../client/styles")));
app.use("/assets", express.static(join(__dirname, "../client/assets")));

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
    console.log("[/api/generate-plant] Incoming request body:", req.body);
    const maskedKey = process.env.GEMINI_API_KEY
      ? `${process.env.GEMINI_API_KEY.slice(
          0,
          4
        )}...${process.env.GEMINI_API_KEY.slice(-4)}`
      : "undefined";
    console.log("[/api/generate-plant] GEMINI_API_KEY:", maskedKey);

    // Check rate limit
    if (!checkRateLimit()) {
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(
          (RATE_LIMIT_WINDOW - requestLog[0] + Date.now()) / 1000
        ),
      });
    }

    const quantity = Math.min(Math.max(1, req.body.quantity || 1), 10); // Reduce max to 10 per request
    const batchSize = 2; // Reduce batch size
    const plants = [];
    const errors = [];

    // Process plants in batches
    for (let i = 0; i < quantity; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, quantity - i);
      const batchPromises = Array(currentBatchSize)
        .fill()
        .map(async () => {
          try {
            const plantData = await generatePlant();
            return plantData;
          } catch (error) {
            console.error("Error generating plant:", error);
            errors.push(error.message);
            return null;
          }
        });

      try {
        const batchResults = await Promise.all(batchPromises);
        plants.push(...batchResults.filter(Boolean));
      } catch (error) {
        console.error("Error processing batch:", error);
        errors.push(error.message);
      }

      // Add delay between batches to avoid rate limits
      if (i + batchSize < quantity) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // If we have no plants and errors occurred, return an error
    if (plants.length === 0 && errors.length > 0) {
      return res.status(500).json({
        error: "Failed to generate any plants",
        details: errors,
      });
    }

    // Send response with all successfully generated plants
    res.json({
      plants: plants,
      total: plants.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in batch plant generation:", error);
    res.status(500).json({
      error: "Failed to generate plants",
      details: error.message,
    });
  }
});

// API endpoint for generating psychedelic rainbows
app.post("/api/generate-rainbow", async (req, res) => {
  try {
    console.log("[/api/generate-rainbow] Request received");
    const maskedKey = process.env.GEMINI_API_KEY
      ? `${process.env.GEMINI_API_KEY.slice(
          0,
          4
        )}...${process.env.GEMINI_API_KEY.slice(-4)}`
      : "undefined";
    console.log("[/api/generate-rainbow] GEMINI_API_KEY:", maskedKey);

    // Basic rate limiting (can be enhanced as needed)
    if (!checkRateLimit()) {
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(
          (RATE_LIMIT_WINDOW -
            (requestLog.length > 0
              ? requestLog[0]
              : Date.now() - RATE_LIMIT_WINDOW) +
            Date.now()) /
            1000
        ),
      });
    }

    const rainbowData = await generateRainbow();
    res.json(rainbowData);
  } catch (error) {
    console.error("Error in /api/generate-rainbow endpoint:", error);
    res.status(500).json({
      error: "Failed to generate rainbow",
      details: error.message,
    });
  }
});

// API endpoint for generating weather events
app.post("/api/generate-weather", async (req, res) => {
  try {
    console.log("[/api/generate-weather] Request received");
    const maskedKey = process.env.GEMINI_API_KEY
      ? `${process.env.GEMINI_API_KEY.slice(
          0,
          4
        )}...${process.env.GEMINI_API_KEY.slice(-4)}`
      : "undefined";
    console.log("[/api/generate-weather] GEMINI_API_KEY:", maskedKey);

    // Check rate limit
    if (!checkRateLimit()) {
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(
          (RATE_LIMIT_WINDOW - requestLog[0] + Date.now()) / 1000
        ),
      });
    }

    const weatherData = await generateWeather();
    res.json(weatherData);
  } catch (error) {
    console.error("Error generating weather:", error);
    res.status(500).json({
      error: "Failed to generate weather",
      details: error.message,
    });
  }
});

// Start server on specified port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
