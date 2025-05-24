import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to ensure integers
function ensureInteger(value) {
  if (typeof value === "string") {
    value = parseInt(value, 10);
  } else if (typeof value === "number") {
    value = Math.round(value);
  }
  return value;
}

// Helper function to validate plant data
function validatePlantData(plantData) {
  const errors = [];

  function check(field, type, condition = null, allowFloat = false) {
    if (type === "number" && !allowFloat) {
      // For integer fields, ensure the value is an integer
      plantData[field] = ensureInteger(plantData[field]);
    }

    if (type === "string") {
      if (
        typeof plantData[field] !== "string" ||
        plantData[field].length === 0
      ) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "number") {
      if (
        (allowFloat
          ? typeof plantData[field] !== "number"
          : !Number.isInteger(plantData[field])) ||
        (condition && !condition(plantData[field]))
      ) {
        errors.push(
          `Invalid ${field} (received ${
            plantData[field]
          } of type ${typeof plantData[field]})`
        );
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

  // Lifecycle parameters - ensure integers for lifespan and maturityAge
  check("lifespan", "number", (v) => v >= 30 && v <= 300);
  check("growthRate", "number", (v) => v >= 0.1 && v <= 2.0, true);
  check("maturityAge", "number", (v) => v >= 10 && v <= 60);
  check("decayRate", "number", (v) => v >= 0.1 && v <= 1.0, true);
  check("resilience", "number", (v) => v >= 1 && v <= 10);
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

Important: You must respond with ONLY a valid JSON object containing ALL of the following required properties. No explanation text or comments outside the JSON:

Text fields (required strings):
- name: A creative, descriptive name for the flower species (e.g., "Celestial Trumpet", "Aurora Bell")
- description: A short description of the flower's appearance and characteristics

Integer parameters (must be whole numbers, no decimals):
- lifespan: Whole number between 30 and 300 (e.g., 120, 200, 250)
- maturityAge: Whole number between 10 and 60 (e.g., 30, 45, 50)
- petals: Whole number between 1 and 40
- layerCount: Whole number between 1 and 4
- depthOffset: Whole number between 0 and 100
- stemRadius: Whole number between 1 and 10
- resilience: Whole number between 1 and 10

Decimal numbers (floating point values allowed):
- growthRate: Number between 0.1 and 2.0 (e.g., 1.2, 1.5)
- decayRate: Number between 0.1 and 1.0 (e.g., 0.5, 0.8)

Required exact string values:
- growthPattern: Must be one of: "spiral", "symmetrical", "cascading", or "random"
- stemStyle: Must be one of: "straight", "curved", "segmented", or "straight_bushy"
- petalShape: Must be one of: "elongated", "round", "pointed", "bell_shaped", or "daisy_like"
- flowerType: Must be one of: "spike", "single_bloom", "cluster", "composite", or "bell"
- leafPattern: Must be one of: "basal", "alternate", "opposite", or "whorled"
- seasonalBehavior: Must be one of: "perennial", "annual", or "biennial"
- oscillator: Must be one of: "sine", "square", "triangle", or "sawtooth"

Array parameters:
- colors: Array of 1-5 RGB color arrays, each color as [R,G,B] (e.g., [[255,0,0], [0,255,0]])
- size: Array of exactly 2 numbers between [30,150] (e.g., [50,120])
- height: Array of exactly 2 numbers between [50,300] (e.g., [100,250])
- scale: Array of at least 2 numbers representing musical notes (MIDI values 48-84, e.g., [60, 64, 67, 72])

Boolean parameter:
- pollinatorAttractant: Must be true or false`;

const USER_PROMPT =
  "Generate a large, spectacular garden flower. Requirements:\n1) Include 3-5 different colors in your design\n2) Use large sizes (size array between [30-150])\n3) Make it tall (height array between [50-300])\n4) Include 4-7 MIDI notes between 48-84 in the scale array\n5) Include all lifecycle parameters (lifespan, growthRate, maturityAge, decayRate, resilience)\n6) Make sure all number arrays are properly formatted as JSON arrays, not strings.";

async function generatePlant() {
  try {
    // Get the generative model (Gemini 2.5 Flash Preview)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    // Generate content
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: USER_PROMPT },
    ]);

    const response = result.response.text().trim();

    // Extract JSON from response (in case Gemini adds any extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const plantData = JSON.parse(jsonMatch[0]);

    // Debug logging
    console.log("Received plant data:", {
      lifespan: plantData.lifespan,
      maturityAge: plantData.maturityAge,
      types: {
        lifespan: typeof plantData.lifespan,
        maturityAge: typeof plantData.maturityAge,
      },
    });

    // Validate the plant data
    const validationErrors = validatePlantData(plantData);
    if (validationErrors.length > 0) {
      throw new Error(
        `Validation failed: ${validationErrors.join(
          "; "
        )}. Received values: ${JSON.stringify({
          lifespan: plantData.lifespan,
          maturityAge: plantData.maturityAge,
        })}`
      );
    }

    return plantData;
  } catch (error) {
    console.error("Error generating plant:", error);
    throw error;
  }
}

export { generatePlant };
