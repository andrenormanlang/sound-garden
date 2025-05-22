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

// API endpoint for generating exotic plants
app.post("/api/generate-plant", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            'You are a creative botanical AI that generates unique and exotic plant species with musical properties. Create highly diverse plants that vary dramatically in size, shape, and behavior. You must respond with ONLY a valid JSON object in this exact format: { "name": string, "description": string, "colors": [[hue, saturation, brightness]], "petals": number, "size": [min, max], "height": [min, max], "scale": [numbers], "oscillator": string, "layerCount": number 1-4, "growthPattern": "spiral"|"symmetrical"|"cascading"|"random", "depthOffset": number 0-100 }',
        },
        {
          role: "user",
          content:
            "Generate a unique exotic plant with these constraints: size max 200, height max 400, oscillator must be one of: sine, square, triangle, sawtooth",
        },
      ],
      temperature: 0.8,
    });

    let plantData;
    try {
      const response = completion.choices[0].message.content.trim();
      console.log("Raw response:", response); // Debug log
      plantData = JSON.parse(response);

      // Validate required properties and their types
      if (typeof plantData.name !== "string" || plantData.name.length === 0)
        throw new Error("Invalid name");
      if (
        typeof plantData.description !== "string" ||
        plantData.description.length === 0
      )
        throw new Error("Invalid description");
      if (!Array.isArray(plantData.colors) || plantData.colors.length === 0)
        throw new Error("Invalid colors");
      if (!Number.isInteger(plantData.petals) || plantData.petals < 1)
        throw new Error("Invalid petals");
      if (!Array.isArray(plantData.size) || plantData.size.length !== 2)
        throw new Error("Invalid size");
      if (!Array.isArray(plantData.height) || plantData.height.length !== 2)
        throw new Error("Invalid height");
      if (!Array.isArray(plantData.scale) || plantData.scale.length === 0)
        throw new Error("Invalid scale");
      if (
        !["sine", "square", "triangle", "sawtooth"].includes(
          plantData.oscillator
        )
      )
        throw new Error("Invalid oscillator");
      if (
        !Number.isInteger(plantData.layerCount) ||
        plantData.layerCount < 1 ||
        plantData.layerCount > 4
      )
        throw new Error("Invalid layerCount");
      if (
        !["spiral", "symmetrical", "cascading", "random"].includes(
          plantData.growthPattern
        )
      )
        throw new Error("Invalid growthPattern");
      if (
        typeof plantData.depthOffset !== "number" ||
        plantData.depthOffset < 0 ||
        plantData.depthOffset > 100
      )
        throw new Error("Invalid depthOffset");

      // Ensure values are within bounds
      if (Math.max(...plantData.size) > 200) throw new Error("Size too large");
      if (Math.max(...plantData.height) > 400)
        throw new Error("Height too large");

      // Return all properties needed for the plant
      const validatedPlantData = {
        name: plantData.name,
        description: plantData.description,
        colors: plantData.colors,
        petals: plantData.petals,
        size: plantData.size,
        height: plantData.height,
        scale: plantData.scale,
        oscillator: plantData.oscillator,
        layerCount: plantData.layerCount,
        growthPattern: plantData.growthPattern,
        depthOffset: plantData.depthOffset,
      };

      console.log("Sending plant data:", validatedPlantData); // Debug log
      res.json(validatedPlantData);
    } catch (parseError) {
      console.error("Error parsing plant data:", parseError);
      res
        .status(500)
        .json({ error: "Invalid plant data format: " + parseError.message });
    }
  } catch (error) {
    console.error("Error generating plant:", error);
    res.status(500).json({ error: "Failed to generate plant" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
