// AI Aurora Borealis Generator
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT_AURORA = `You are a mystical AI that generates specifications for psychedelic aurora borealis with ethereal harmonic sounds. These auroras are dynamic, flowing visual and auditory experiences that dance across the sky.

Important: You must respond with ONLY a valid JSON object. The JSON object must have the following top-level properties: "name", "description", "visualProperties", and "soundProperties".
No explanation text or comments outside the JSON.

The structure must be:
{
  "name": "string (creative, mystical name)",
  "description": "string (evocative description of the aurora experience)",
  "visualProperties": {
    "colors": "Array of 4-8 color arrays, each color as [R,G,B] where R,G,B are integers 0-255. Should include aurora-like colors: greens, blues, purples, magentas, with occasional reds and yellows.",
    "waveCount": "Integer between 3 and 8 (number of flowing waves/curtains)",
    "waveHeight": "Number between 0.3 and 0.8 (can be float, relative height of aurora in sky)",
    "flowPattern": "string, one of: 'flowing_waves', 'dancing_curtains', 'rippling_sheets', 'spiral_vortex', 'breathing_veils'",
    "intensity": "Number between 0.4 and 1.0 (can be float, overall brightness and movement intensity)",
    "shimmerSpeed": "Number between 0.5 and 3.0 (can be float, speed of color transitions and movement)"
  },  "soundProperties": {
    "soundscapeName": "string (name for the aurora soundscape, e.g., 'Celestial Whispers')",
    "baseFrequency": "Number between 80 and 300 (Hz, can be float, fundamental frequency - lower for mystical feel)",
    "harmonicComplexity": "Number between 1.2 and 4.0 (can be float, complexity of harmonic layers)",
    "oscillatorType": "string, one of: 'sine', 'triangle', 'sawtooth'",
    "durationSeconds": "Integer between 20 and 90 (how long the aurora persists)",
    "spatialEffect": "Number between 0.3 and 0.9 (can be float, amount of spatial/stereo movement)",
    "atmosphericReverb": "Number between 0.4 and 0.9 (can be float, deep atmospheric reverb)"
  }
}
`;

const USER_PROMPT_AURORA = `Generate a specification for a mesmerizing psychedelic aurora borealis according to the exact JSON structure defined in the system prompt.

Requirements:
1) The "visualProperties.colors" array should contain 5-7 aurora-like colors. Focus on:
   - Deep greens: [0, 255, 100], [50, 200, 80]
   - Electric blues: [0, 150, 255], [100, 200, 255]  
   - Mystical purples: [150, 0, 255], [200, 100, 255]
   - Magical magentas: [255, 0, 200], [255, 100, 150]
   - Occasional warm accents: [255, 200, 0], [255, 100, 50]

2) "visualProperties.flowPattern" should create flowing, organic movement like real aurora
3) The sound should be deeply atmospheric and mystical with complex harmonics
4) Ensure all parameters are within their specified ranges and types
5) All RGB color components must be integers 0-255
6) "visualProperties.waveCount" and "soundProperties.durationSeconds" must be integers
7) Use the nested JSON structure exactly as specified

Create an aurora that feels both scientifically inspired and magically enhanced - like northern lights viewed through a psychedelic lens.`;

function ensureIntegerLocal(value) {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  } else if (typeof value === "number") {
    return Math.round(value);
  }
  return value;
}

function validateAuroraData(auroraData) {
  const errors = [];

  // Helper to access potentially nested properties
  const getProp = (obj, path) => {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  };

  // Helper to set potentially nested properties
  const setProp = (obj, path, value) => {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  };

  function check(fieldPath, type, condition = null, allowFloat = false) {
    const fieldValue = getProp(auroraData, fieldPath);

    if (fieldValue === undefined || fieldValue === null) {
      errors.push(`${fieldPath} is missing or null.`);
      return;
    }

    let valueToValidate = fieldValue;

    if (type === "number" && !allowFloat) {
      const ensuredInt = ensureIntegerLocal(valueToValidate);
      if (ensuredInt !== valueToValidate) {
        setProp(auroraData, fieldPath, ensuredInt);
        valueToValidate = ensuredInt;
      }
    }

    if (type === "string") {
      if (typeof valueToValidate !== "string" || valueToValidate.length === 0) {
        errors.push(
          `Invalid ${fieldPath}: Expected non-empty string. Got: '${valueToValidate}' (type: ${typeof valueToValidate})`
        );
      }
    } else if (type === "number") {
      const val = valueToValidate;
      if (typeof val !== "number" || isNaN(val)) {
        errors.push(
          `Invalid ${fieldPath}: Expected number. Got: '${val}' (type: ${typeof val})`
        );
        return;
      }
      if (!allowFloat && !Number.isInteger(val)) {
        errors.push(`Invalid ${fieldPath}: Expected integer. Got: ${val}`);
      }
      if (condition && !condition(val)) {
        errors.push(`Invalid ${fieldPath}: Value ${val} failed condition.`);
      }
    } else if (type === "array") {
      if (!Array.isArray(valueToValidate)) {
        errors.push(
          `Invalid ${fieldPath}: Expected array. Got: ${typeof valueToValidate}`
        );
        return;
      }
      if (condition && !condition(valueToValidate)) {
        errors.push(
          `Invalid ${fieldPath}: Array failed condition. Got: ${JSON.stringify(
            valueToValidate
          )}`
        );
      }
    } else if (type === "enum") {
      if (!Array.isArray(condition) || !condition.includes(valueToValidate)) {
        errors.push(
          `Invalid ${fieldPath}: Value '${valueToValidate}' not in allowed enum list: [${
            condition ? condition.join(", ") : ""
          }]`
        );
      }
    }
  }

  check("name", "string");
  check("description", "string");

  // Visual Properties
  check(
    "visualProperties.colors",
    "array",
    (v) =>
      v.length >= 4 &&
      v.length <= 8 &&
      v.every(
        (color) =>
          Array.isArray(color) &&
          color.length === 3 &&
          color.every(
            (c) =>
              typeof c === "number" && Number.isInteger(c) && c >= 0 && c <= 255
          )
      )
  );
  check(
    "visualProperties.waveCount",
    "number",
    (v) => Number.isInteger(v) && v >= 3 && v <= 8
  );
  check(
    "visualProperties.waveHeight",
    "number",
    (v) => v >= 0.3 && v <= 0.8,
    true
  );
  check("visualProperties.flowPattern", "enum", [
    "flowing_waves",
    "dancing_curtains",
    "rippling_sheets",
    "spiral_vortex",
    "breathing_veils",
  ]);
  check(
    "visualProperties.intensity",
    "number",
    (v) => v >= 0.4 && v <= 1.0,
    true
  );
  check(
    "visualProperties.shimmerSpeed",
    "number",
    (v) => v >= 0.5 && v <= 3.0,
    true
  );

  // Sound Properties
  check("soundProperties.soundscapeName", "string");
  check(
    "soundProperties.baseFrequency",
    "number",
    (v) => v >= 80 && v <= 300,
    true
  );
  check(
    "soundProperties.harmonicComplexity",
    "number",
    (v) => v >= 1.2 && v <= 4.0,
    true
  );
  check("soundProperties.oscillatorType", "enum", [
    "sine",
    "triangle",
    "custom_aurora",
  ]);
  check(
    "soundProperties.durationSeconds",
    "number",
    (v) => Number.isInteger(v) && v >= 20 && v <= 90
  );
  check(
    "soundProperties.spatialEffect",
    "number",
    (v) => v >= 0.3 && v <= 0.9,
    true
  );
  check(
    "soundProperties.atmosphericReverb",
    "number",
    (v) => v >= 0.4 && v <= 0.9,
    true
  );

  return errors;
}

async function generateAurora() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const generationConfig = {
      responseMimeType: "application/json",
    };

    const result = await model.generateContent(
      [{ text: SYSTEM_PROMPT_AURORA }, { text: USER_PROMPT_AURORA }],
      generationConfig
    );

    let responseText = result.response.text().trim();
    let auroraData;

    try {
      auroraData = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Raw AI Response (Aurora):", responseText);
        throw new Error(
          "No valid JSON found in aurora AI response after fallback."
        );
      }
      auroraData = JSON.parse(jsonMatch[0]);
    }

    console.log("Received raw aurora data from AI:", auroraData);

    const validationErrors = validateAuroraData(auroraData);
    if (validationErrors.length > 0) {
      console.error("Aurora Data Validation Failed. Errors:", validationErrors);
      console.error("Problematic Aurora Data:", auroraData);
      throw new Error(
        `Validation failed for aurora data: ${validationErrors.join("; ")}`
      );
    }

    return auroraData;
  } catch (error) {
    console.error("Error in generateAurora:", error.message, error.stack);
    throw error;
  }
}

export { generateAurora };
