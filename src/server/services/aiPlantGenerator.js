import OpenAI from "openai";
import { config } from "dotenv";

// Load environment variables
config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
      v.length >= 1 &&
      v.length <= 5 &&
      v.every((color) => Array.isArray(color) && color.length === 3)
  );
  check("petals", "number", (v) => v >= 1 && v <= 40);
  check("size", "array", (v) => v.length === 2 && v[1] <= 150);
  check("height", "array", (v) => v.length === 2 && v[1] <= 300);
  check(
    "scale",
    "array",
    (v) => v.length >= 2 && v.every((n) => typeof n === "number")
  );
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

const SYSTEM_PROMPT = `You are a creative botanical AI that generates garden-inspired flower species with musical properties. Create flowers inspired by traditional garden varieties like:
- Tall spiky flowers (delphiniums, salvias)
- Bell-shaped flowers (foxgloves, snapdragons)
- Round flowers (zinnias, marigolds)
- Daisy-like flowers (asters, daisies)
- Ground-level flowers (petunias, pansies)

Respond with ONLY a valid JSON object with numerical arrays properly formatted (no string arrays). Example format:
{
  "name": "Sunset Lily",
  "description": "A towering flower with rainbow-hued petals that shimmer in the breeze",
  "colors": [[320, 80, 90], [45, 85, 95], [200, 70, 85]], // 1-5 color arrays, each with exactly 3 numbers
  "petals": 25, // Single number between 5-40
  "size": [30, 150], // Example format: exactly two numbers for [min, max] size
  "height": [50, 300], // Example format: exactly two numbers for [min, max] height
  "scale": [60, 64, 67, 72], // Example format: array of 4-7 MIDI numbers between 48-84
  "oscillator": "sine", // Must be exactly "sine", "triangle", "square", or "sawtooth"
  "layerCount": 2, // Single number between 1-4
  "growthPattern": "string ('spiral'|'symmetrical'|'cascading'|'random')",
  "depthOffset": "number (0-100, for 3D placement variety)",
  "stemStyle": "string ('straight'|'curved'|'segmented'|'straight_bushy')",
  "stemRadius": "number (1-10, base radius of the stem)",
  "petalShape": "string ('elongated'|'round'|'pointed'|'bell_shaped'|'daisy_like')",
  "leafPattern": "string ('basal'|'alternate'|'opposite'|'whorled')",
  "flowerType": "string ('spike'|'single_bloom'|'cluster'|'composite'|'bell')",
  "seasonalBehavior": "string ('perennial'|'annual'|'biennial')",
  "pollinatorAttractant": "boolean (affects movement patterns)"
}`;

const USER_PROMPT =
  "Generate a large, spectacular garden flower. Requirements: 1) Include 3-5 different colors in your design, 2) Use large sizes (size array between [30-150]), 3) Make it tall (height array between [50-300]), 4) Include 4-7 MIDI notes between 48-84 in the scale array, 5) Make sure all number arrays are properly formatted as JSON arrays, not strings.";

async function generatePlant() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT },
      ],
      temperature: 0.8,
    });

    const response = completion.choices[0].message.content.trim();
    const plantData = JSON.parse(response);

    // Validate the plant data
    const validationErrors = validatePlantData(plantData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join("; ")}`);
    }

    return plantData;
  } catch (error) {
    console.error("Error generating plant:", error);
    throw error;
  }
}

export { generatePlant };
