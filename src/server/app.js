// src/server/app.js
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

// Serve static files with proper MIME types
app.use(
  "/js",
  express.static(join(__dirname, "../client/js"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    },
  })
);

app.use(
  "/styles",
  express.static(join(__dirname, "../client/styles"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

// Serve public directory and assets
app.use(express.static(join(__dirname, "../../public")));
app.use("/assets", express.static(join(__dirname, "../client/assets")));

// Serve node_modules for Tone.js
app.use(
  "/node_modules",
  express.static(join(__dirname, "../../node_modules"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    },
  })
);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API endpoint for generating exotic plants
app.post("/api/generate-plant", async (req, res) => {
  try {
    const systemPromptContent = `You are a creative botanical AI. Generate unique and exotic plant species with musical and detailed 3D visual properties.
Respond with ONLY a valid JSON object in this exact format:
{
  "name": "string (Exotic Plant Name)",
  "description": "string (Brief, evocative description)",
  "colors": [[hue (0-360), saturation (0-100), brightness (0-100)], [hue, sat, bri]],
  "petals": "number (5-30, total petals if single layer, or per layer if multi-layer)",
  "size": "[min_overall_size_radius (10-80), max_overall_size_radius (20-100)]",
  "height": "[min_stem_height (20-150), max_stem_height (50-250)]",
  "scale": "[array of 3-7 MIDI note numbers (e.g., 60, 64, 67)]",
  "oscillator": "string ('sine'|'square'|'triangle'|'sawtooth')",
  "layerCount": "number (1-4, for petal layers)",
  "growthPattern": "string ('spiral'|'symmetrical'|'cascading'|'random', for petal arrangement within a layer)",
  "depthOffset": "number (0-100, hint for perceived depth, client uses it for initial Z placement variety)",
  "stemStyle": "string ('straight'|'curved'|'segmented'|'submerged'|'straight_bushy')",
  "stemRadius": "number (1-10, base radius of the stem)",
  "petalShape3D": "string ('ellipsoid'|'cone'|'box_thin'|'curved_plane'|'spherical_cap'|'thin_ray'|'ruffled_edge')",
  "petalThickness": "number (1-8, thickness of petals)",
  "petalArrangement": "string ('flat_disc'|'spherical'|'upright_cup'|'drooping_bell'|'random', overall flower head shape)",
  "leafShape3D": "string ('ellipsoid_flat'|'box_thin'|'lanceolate'|'large_round_flat'|'jagged_basal'|'pinnate')",
  "leafArrangement": "string ('spiral_stem'|'on_branches'|'basal_rosette'|'floating')",
  "centerDetail": "string ('simple_sphere'|'torus_ring'|'spiky_cluster'|'anthers_stamens'|'seed_pod'|'fluffy_sphere'|'dense_cluster'|'complex_lip')",
  "textureHint": "string ('smooth'|'veined'|'bumpy'|'velvet'|'waxy'|'delicate')",
  "isLuminous": "boolean (true or false)",
  "luminosityColor": "[[hue (0-360), saturation (0-100), brightness (0-100)]] (only if isLuminous is true, otherwise can be empty array or null)",
  "hasBranches": "boolean (true or false)",
  "branchCount": "number (0-5, only if hasBranches is true, otherwise 0)",
  "secondaryStructures": "array of strings (e.g., ['tendrils', 'glowing_orbs', 'thorns'], can be empty array)"
}
Ensure all string options are chosen from the provided lists. Make the plant visually interesting and distinct.
Size and height arrays should contain numbers. Colors and luminosityColor are arrays of HSB arrays. Scale is an array of MIDI numbers.`;

    const userPromptContent = `Generate a new exotic plant.
Constraints: Max overall size approx 80-100. Max stem height approx 200-250.
Be creative with the 3D shapes, arrangements, and luminosity.
Example structure for "colors": [[30, 80, 90]] or [[30,80,90], [45,70,85]].
Example for "scale": [60, 62, 65, 67, 70].
If "isLuminous" is false, "luminosityColor" can be [[0,0,0]] or an empty array.
If "hasBranches" is false, "branchCount" should be 0.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125", // Or gpt-4 if available and preferred
      messages: [
        { role: "system", content: systemPromptContent },
        { role: "user", content: userPromptContent },
      ],
      temperature: 0.85, // Slightly higher for more creativity
      response_format: { type: "json_object" }, // Request JSON output directly
    });

    let plantData;
    try {
      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error("OpenAI returned an empty response.");
      }
      console.log("Raw OpenAI response:", responseContent);
      plantData = JSON.parse(responseContent);

      // --- Comprehensive Validation ---
      const errors = [];
      const check = (field, type, condition, values) => {
        const val = plantData[field];
        if (val === undefined || val === null) {
          if (
            field !== "luminosityColor" &&
            field !== "secondaryStructures" &&
            field !== "branchCount"
          )
            // these can be optional or defaulted
            errors.push(`${field} is missing.`);
          return;
        }
        if (type === "string" && typeof val !== "string")
          errors.push(`${field} should be a string.`);
        if (
          type === "string_option" &&
          (typeof val !== "string" || (values && !values.includes(val)))
        )
          errors.push(
            `${field} has invalid value '${val}'. Expected one of: ${values.join(
              ", "
            )}`
          );
        if (type === "number" && typeof val !== "number")
          errors.push(`${field} should be a number.`);
        if (type === "integer" && !Number.isInteger(val))
          errors.push(`${field} should be an integer.`);
        if (type === "boolean" && typeof val !== "boolean")
          errors.push(`${field} should be a boolean.`);
        if (type === "array" && !Array.isArray(val))
          errors.push(`${field} should be an array.`);
        if (condition && !condition(val))
          errors.push(`${field} failed condition: ${val}`);
      };

      check("name", "string", (v) => v.length > 0);
      check("description", "string", (v) => v.length > 0);
      check(
        "colors",
        "array",
        (v) =>
          v.length > 0 &&
          v.every(
            (c) =>
              Array.isArray(c) &&
              c.length === 3 &&
              c.every((n) => typeof n === "number")
          )
      );
      check("petals", "integer", (v) => v >= 1 && v <= 50); // Allow more petals for dense flowers
      check(
        "size",
        "array",
        (v) =>
          v.length === 2 &&
          v.every((n) => typeof n === "number" && n >= 5 && n <= 150) &&
          v[0] <= v[1]
      );
      check(
        "height",
        "array",
        (v) =>
          v.length === 2 &&
          v.every((n) => typeof n === "number" && n >= 10 && n <= 300) &&
          v[0] <= v[1]
      );
      check(
        "scale",
        "array",
        (v) =>
          v.length >= 2 &&
          v.length <= 7 &&
          v.every((n) => Number.isInteger(n) && n >= 20 && n <= 100)
      );
      check("oscillator", "string_option", null, [
        "sine",
        "square",
        "triangle",
        "sawtooth",
      ]);
      check("layerCount", "integer", (v) => v >= 1 && v <= 5);
      check("growthPattern", "string_option", null, [
        "spiral",
        "symmetrical",
        "cascading",
        "random",
      ]);
      check("depthOffset", "number", (v) => v >= 0 && v <= 100);

      // 3D fields
      check("stemStyle", "string_option", null, [
        "straight",
        "curved",
        "segmented",
        "submerged",
        "straight_bushy",
      ]);
      check("stemRadius", "number", (v) => v >= 1 && v <= 15);
      check("petalShape3D", "string_option", null, [
        "ellipsoid",
        "cone",
        "box_thin",
        "curved_plane",
        "spherical_cap",
        "thin_ray",
        "ruffled_edge",
      ]);
      check("petalThickness", "number", (v) => v >= 0.5 && v <= 10);
      check("petalArrangement", "string_option", null, [
        "flat_disc",
        "spherical",
        "upright_cup",
        "drooping_bell",
        "random",
      ]);
      check("leafShape3D", "string_option", null, [
        "ellipsoid_flat",
        "box_thin",
        "lanceolate",
        "large_round_flat",
        "jagged_basal",
        "pinnate",
      ]);
      check("leafArrangement", "string_option", null, [
        "spiral_stem",
        "on_branches",
        "basal_rosette",
        "floating",
      ]);
      check("centerDetail", "string_option", null, [
        "simple_sphere",
        "torus_ring",
        "spiky_cluster",
        "anthers_stamens",
        "seed_pod",
        "fluffy_sphere",
        "dense_cluster",
        "complex_lip",
      ]);
      check("textureHint", "string_option", null, [
        "smooth",
        "veined",
        "bumpy",
        "velvet",
        "waxy",
        "delicate",
      ]);
      check("isLuminous", "boolean");
      if (plantData.isLuminous) {
        check(
          "luminosityColor",
          "array",
          (v) =>
            v.length > 0 &&
            v.every(
              (c) =>
                Array.isArray(c) &&
                c.length === 3 &&
                c.every((n) => typeof n === "number")
            )
        );
      } else {
        plantData.luminosityColor = [[0, 0, 0]]; // Default if not luminous
      }
      check("hasBranches", "boolean");
      if (plantData.hasBranches) {
        check("branchCount", "integer", (v) => v >= 0 && v <= 8); // Allow more branches
      } else {
        plantData.branchCount = 0; // Ensure 0 if no branches
      }
      if (
        plantData.secondaryStructures === undefined ||
        !Array.isArray(plantData.secondaryStructures)
      ) {
        plantData.secondaryStructures = []; // Default to empty array
      } else {
        check("secondaryStructures", "array", (v) =>
          v.every((s) => typeof s === "string")
        );
      }

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join("; ")}`);
      }

      // Construct the object to send to the client with all validated (and potentially defaulted) fields
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
        depthOffset: plantData.depthOffset, // Client uses this for initial Z placement variety
        // 3D specific fields
        stemStyle: plantData.stemStyle,
        stemRadius: plantData.stemRadius,
        petalShape3D: plantData.petalShape3D,
        petalThickness: plantData.petalThickness,
        petalArrangement: plantData.petalArrangement,
        leafShape3D: plantData.leafShape3D,
        leafArrangement: plantData.leafArrangement,
        centerDetail: plantData.centerDetail,
        textureHint: plantData.textureHint,
        isLuminous: plantData.isLuminous,
        luminosityColor: plantData.luminosityColor,
        hasBranches: plantData.hasBranches,
        branchCount: plantData.branchCount,
        secondaryStructures: plantData.secondaryStructures,
      };

      console.log("Sending validated plant data:", validatedPlantData);
      res.json(validatedPlantData);
    } catch (parseOrValidationError) {
      console.error(
        "Error parsing or validating plant data:",
        parseOrValidationError.message
      );
      console.error(
        "Problematic OpenAI response was:",
        completion.choices[0].message.content
      );
      res.status(500).json({
        error: "Invalid plant data from AI: " + parseOrValidationError.message,
      });
    }
  } catch (error) {
    console.error("OpenAI API or other error:", error);
    res.status(500).json({
      error:
        "Failed to generate plant from OpenAI: " +
        (error.message || "Unknown error"),
    });
  }
});

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 💮🌺🌻💐🌹`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});
