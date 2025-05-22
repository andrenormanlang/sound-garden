import express from 'express';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
app.use('/libraries', express.static(join(__dirname, 'libraries')));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// API endpoint for generating exotic plants
app.post('/api/generate-plant', async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a creative botanical AI that generates unique and exotic plant species with musical properties. Respond with a valid JSON object containing: name (string), description (string), colors (array of [hue, saturation, brightness]), petals (number), size (array of [min, max]), height (array of [min, max]), scale (array of numbers), oscillator (string)."
        },
        {
          role: "user",
          content: "Generate a unique exotic plant with visual and musical characteristics."
        }
      ],
      temperature: 0.8
    });

    let plantData;
    try {
      plantData = JSON.parse(completion.choices[0].message.content);
      
      // Validate required properties
      if (!plantData.name || !plantData.description || !Array.isArray(plantData.colors) || 
          !plantData.petals || !Array.isArray(plantData.size) || !Array.isArray(plantData.height) ||
          !Array.isArray(plantData.scale) || !plantData.oscillator) {
        throw new Error('Missing required plant properties');
      }
      
      // Ensure the plant data matches the FLOWER_TYPES structure from sketch.js
      plantData = {
        name: plantData.name,
        description: plantData.description,
        colors: plantData.colors,
        petals: plantData.petals,
        size: plantData.size,
        height: plantData.height,
        scale: plantData.scale,
        oscillator: plantData.oscillator
      };
      
      res.json(plantData);
    } catch (parseError) {
      console.error('Error parsing plant data:', parseError);
      res.status(500).json({ error: 'Invalid plant data format' });
    }
  } catch (error) {
    console.error('Error generating plant:', error);
    res.status(500).json({ error: 'Failed to generate plant' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
