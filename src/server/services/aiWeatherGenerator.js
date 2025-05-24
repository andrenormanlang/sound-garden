import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a creative weather AI that generates dynamic weather patterns for a garden environment. Generate weather that can affect plants in interesting ways.

Important: You must respond with ONLY a valid JSON object containing ALL of the following required properties. No explanation text or comments outside the JSON:

Text fields (required strings):
- name: A descriptive name for the weather event (e.g., "Summer Storm", "Morning Mist")
- description: A short description of the weather effect and its impact

Numeric parameters:
- duration: Number between 10 and 60 (seconds the weather effect should last)
- intensity: Number between 0.1 and 1.0 (how strong the effect is)
- temperature: Number between 0 and 40 (degrees Celsius)
- humidity: Number between 0 and 100 (percentage)
- windSpeed: Number between 0 and 50 (km/h)

Required exact string values:
- type: Must be one of: "rain", "wind", "sun", "storm", "fog", "rainbow"
- impact: Must be one of: "harmful", "beneficial", "neutral"

Array parameters:
- colors: Array of 1-3 RGB color arrays for visual effects, each as [R,G,B] (e.g., [[200,200,255]])
- particleCount: Array of exactly 2 numbers for min/max particles [min, max] (e.g., [50,200])

Sound parameters:
- baseFrequency: Number between 100 and 1000 (Hz for weather ambient sound)
- volume: Number between 0.1 and 1.0 (volume of weather effects)
- reverb: Number between 0.0 and 0.9 (echo effect amount)`;

const USER_PROMPT =
  "Generate an interesting weather event that will affect the garden plants. Make it visually striking and environmentally impactful.";

async function generateWeather() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: USER_PROMPT },
    ]);

    const response = result.response.text().trim();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const weatherData = JSON.parse(jsonMatch[0]);

    // Validate the weather data
    validateWeatherData(weatherData);

    return weatherData;
  } catch (error) {
    console.error("Error generating weather:", error);
    throw error;
  }
}

function validateWeatherData(weatherData) {
  const errors = [];

  function check(field, type, condition = null) {
    if (type === "string") {
      if (
        typeof weatherData[field] !== "string" ||
        weatherData[field].length === 0
      ) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "number") {
      if (
        typeof weatherData[field] !== "number" ||
        (condition && !condition(weatherData[field]))
      ) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "array") {
      if (
        !Array.isArray(weatherData[field]) ||
        (condition && !condition(weatherData[field]))
      ) {
        errors.push(`Invalid ${field}`);
      }
    } else if (type === "enum") {
      if (!condition.includes(weatherData[field])) {
        errors.push(`Invalid ${field}`);
      }
    }
  }

  // Basic validations
  check("name", "string");
  check("description", "string");
  check("duration", "number", (v) => v >= 10 && v <= 60);
  check("intensity", "number", (v) => v >= 0.1 && v <= 1.0);
  check("temperature", "number", (v) => v >= 0 && v <= 40);
  check("humidity", "number", (v) => v >= 0 && v <= 100);
  check("windSpeed", "number", (v) => v >= 0 && v <= 50);
  check("type", "enum", ["rain", "wind", "sun", "storm", "fog", "rainbow"]);
  check("impact", "enum", ["harmful", "beneficial", "neutral"]);
  check(
    "colors",
    "array",
    (v) =>
      v.length >= 1 &&
      v.length <= 3 &&
      v.every((color) => Array.isArray(color) && color.length === 3)
  );
  check(
    "particleCount",
    "array",
    (v) => v.length === 2 && v[0] >= 0 && v[1] >= v[0]
  );
  check("baseFrequency", "number", (v) => v >= 100 && v <= 1000);
  check("volume", "number", (v) => v >= 0.1 && v <= 1.0);
  check("reverb", "number", (v) => v >= 0.0 && v <= 0.9);

  if (errors.length > 0) {
    throw new Error(`Weather validation failed: ${errors.join("; ")}`);
  }
}

export { generateWeather };
