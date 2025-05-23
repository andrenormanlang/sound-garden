import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generatePlant } from "./services/aiPlantGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    }

    // Send response with all successfully generated plants
    res.json({
      plants: plants,
      total: plants.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in batch plant generation:", error);
    res.status(500).json({ error: "Failed to generate plants" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
