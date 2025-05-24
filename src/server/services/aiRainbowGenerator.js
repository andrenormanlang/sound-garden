import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT_RAINBOW = `You are a creative cosmic AI that generates specifications for psychedelic rainbows with beautiful harmonic sounds. These rainbows are visual and auditory experiences.

Important: You must respond with ONLY a valid JSON object. The JSON object must have the following top-level properties: "name", "description", "visualProperties", and "soundProperties".
No explanation text or comments outside the JSON.

The structure must be:
{
  "name": "string (creative, descriptive name)",
  "description": "string (short, evocative description)",
  "visualProperties": {
    "colors": "Array of 3-7 color arrays, each color as [R,G,B] where R,G,B are integers 0-255 (e.g., [[255,0,0], [0,255,0], [0,0,255]]). Vibrant and psychedelic.",
    "arcCount": "Integer between 3 and 7 (number of concentric arcs)",
    "arcThickness": "Number between 5 and 20 (can be float, base thickness)",
    "animationStyle": "string, one of: 'pulsating', 'shimmering', 'breathing', 'drifting_waves'",
    "intensity": "Number between 0.5 and 1.0 (can be float, overall visual intensity)"
  },
  "soundProperties": {
    "soundscapeName": "string (name for the soundscape, e.g., 'Celestial Chimes')",
    "baseFrequency": "Number between 100 and 400 (Hz, can be float, fundamental frequency)",
    "harmonicityRatio": "Number between 1.0 (pure) and 3.0 (complex/dissonant, can be float, richness of harmonics)",
    "oscillatorType": "string, one of: 'sine', 'triangle', 'sawtooth', 'pulse'",
    "durationSeconds": "Integer between 10 and 60 (how long the rainbow and sound persist)",
    "reverbMix": "Number between 0.1 (subtle) and 0.8 (spacious, can be float, amount of reverb)"
  }
}
`;

const USER_PROMPT_RAINBOW = `Generate a specification for a truly psychedelic and awe-inspiring rainbow according to the exact JSON structure defined in the system prompt.
Requirements:
1) The "visualProperties.colors" array should contain 5-7 vibrant, contrasting colors.
2) "visualProperties.animationStyle" should be captivating, like "pulsating" or "drifting_waves".
3) The sound properties should describe a deeply harmonic and ethereal soundscape with noticeable reverb.
4) Ensure all parameters are within their specified ranges and types (integers where specified, floats allowed for others).
5) All RGB color components in "visualProperties.colors" must be integers.
6) "visualProperties.arcCount" and "soundProperties.durationSeconds" must be integers.
7) Adhere strictly to the nested JSON structure: top-level "name", "description", "visualProperties" (object), and "soundProperties" (object).`;

function ensureIntegerLocal(value) {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  } else if (typeof value === "number") {
    return Math.round(value);
  }
  return value;
}

function validateRainbowData(rainbowData) {
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

  // Helper to set potentially nested properties (used for ensureIntegerLocal)
  const setProp = (obj, path, value) => {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {}; // Should not happen if getProp found it
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  };

  function check(fieldPath, type, condition = null, allowFloat = false) {
    const fieldValue = getProp(rainbowData, fieldPath);

    if (fieldValue === undefined || fieldValue === null) {
      errors.push(`${fieldPath} is missing or null.`);
      return;
    }

    let valueToValidate = fieldValue;

    if (type === "number" && !allowFloat) {
      const ensuredInt = ensureIntegerLocal(valueToValidate);
      if (ensuredInt !== valueToValidate) {
        setProp(rainbowData, fieldPath, ensuredInt);
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
      v.length >= 3 &&
      v.length <= 7 &&
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
    "visualProperties.arcCount",
    "number",
    (v) => Number.isInteger(v) && v >= 3 && v <= 7
  );
  check(
    "visualProperties.arcThickness",
    "number",
    (v) => v >= 5 && v <= 20,
    true
  );
  check("visualProperties.animationStyle", "enum", [
    "pulsating",
    "shimmering",
    "breathing",
    "drifting_waves",
  ]);
  check(
    "visualProperties.intensity",
    "number",
    (v) => v >= 0.5 && v <= 1.0,
    true
  );

  // Sound Properties
  check("soundProperties.soundscapeName", "string");
  check(
    "soundProperties.baseFrequency",
    "number",
    (v) => v >= 100 && v <= 400,
    true
  );
  check(
    "soundProperties.harmonicityRatio",
    "number",
    (v) => v >= 1.0 && v <= 3.0,
    true
  );
  check("soundProperties.oscillatorType", "enum", [
    "sine",
    "triangle",
    "sawtooth",
    "pulse",
  ]);
  check(
    "soundProperties.durationSeconds",
    "number",
    (v) => Number.isInteger(v) && v >= 10 && v <= 60
  );
  check(
    "soundProperties.reverbMix",
    "number",
    (v) => v >= 0.1 && v <= 0.8,
    true
  );

  return errors;
}

async function generateRainbow() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Consistent with your plant generator
    const generationConfig = {
      // temperature: 0.7, // Adjust for creativity vs. consistency
      // topP: 0.9,
      // topK: 40,
      responseMimeType: "application/json", // Request JSON directly
    };

    const result = await model.generateContent(
      [{ text: SYSTEM_PROMPT_RAINBOW }, { text: USER_PROMPT_RAINBOW }],
      generationConfig
    );

    // Since we requested JSON, parse directly if the API supports it well.
    // Otherwise, fall back to text parsing.
    let responseText = result.response.text().trim();
    let rainbowData;

    try {
      rainbowData = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Raw AI Response (Rainbow):", responseText);
        throw new Error(
          "No valid JSON found in rainbow AI response after fallback."
        );
      }
      rainbowData = JSON.parse(jsonMatch[0]);
    }

    console.log("Received raw rainbow data from AI:", rainbowData);

    // Flatten the structure before validation if necessary, or validate nested.
    // The updated validateRainbowData handles nesting.

    const validationErrors = validateRainbowData(rainbowData);
    if (validationErrors.length > 0) {
      console.error(
        "Rainbow Data Validation Failed. Errors:",
        validationErrors
      );
      console.error("Problematic Rainbow Data:", rainbowData);
      throw new Error(
        `Validation failed for rainbow data: ${validationErrors.join("; ")}`
      ); //  template literal
    }
 
    return rainbowData; // Return the (potentially nested) validated data
  } catch (error) {
    console.error("Error in generateRainbow:", error.message, error.stack);
    throw error;
  }
}

export { generateRainbow };
