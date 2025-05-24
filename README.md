# Interactive Sound Garden 🌸

An interactive digital garden that combines visual art, procedural animation, and generative sound.

## Features

- **AI-Generated Plants**:
  - Unique visual characteristics for each plant
  - Procedurally generated shapes and colors
  - Various growth patterns and behaviors
  - Dynamic stem and petal configurations

- **Interactive Elements**:
  - Mouse proximity affects plant behavior
  - Click interaction with individual plants
  - Each plant has unique sound patterns
  - Real-time sound synthesis
  - Dynamic visual responses

- **Generative Sound**:
  - Unique musical scales per plant
  - Multiple oscillator types
  - Dynamic audio parameters
  - Responsive sound design
  - Layered sound composition

- **AI Integration**:
  - OpenAI-powered plant generation
  - Intelligent plant characteristic mapping
  - Dynamic behavior patterns
  - Unique plant personalities

## Technologies Used

- **Frontend**:
  - P5.js (v2.0.2): Visual rendering and animation
  - Tone.js (v15.1.22): Audio synthesis and music generation
  - ML5.js (v1.2.1): Machine learning features

- **Backend**:
  - Bun.js: Runtime environment
  - Express.js (v5.1.0): Web server
  - OpenAI API (v4.102.0): AI plant generation

## Project Structure

```text
.
├── public/               # Static files
│   └── index.html       # Main HTML file
├── src/
│   ├── client/          # Frontend code
│   │   ├── assets/      # Static assets
│   │   │   └── libs/    # Client-side libraries
│   │   ├── js/          # Client JavaScript
│   │   │   ├── config.js
│   │   │   └── sketch.js
│   │   └── styles/      # CSS styling
│   └── server/          # Backend code
│       ├── app.js       # Express server
│       └── services/    # Server services
│           └── aiPlantGenerator.js
├── package.json         # Project configuration
└── README.md           # Documentation
```

## Getting Started

1. Clone the repository

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env` file with your OpenAI API key:

   ```env
   OPENAI_API_KEY=your-api-key-here
   ```

4. Start the development server:

   ```bash
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

- **POST /api/generate-plant**
  - Generates new AI-powered plants
  - Rate limited to 50 requests per minute
  - Supports batch generation (max 100 plants per request)

## Environment Requirements

- Bun runtime
- Modern web browser with Web Audio API support
- Active internet connection for AI features
- OpenAI API key

## Development Scripts

- `bun start`: Start the production server
- `bun dev`: Start development server with hot reload

## Dependencies

```json
{
  "dotenv": "^16.5.0",
  "express": "^5.1.0",
  "ml5": "^1.2.1",
  "openai": "^4.102.0",
  "p5": "^2.0.2",
  "tone": "^15.1.22"
}
```

## Performance Notes

- Initial audio context requires user interaction
- Rate limiting applies to plant generation
- Batch processing implemented for multiple plant generation
- Error handling and validation for all plant generation

## Future Enhancements

- Enhanced plant variety and behaviors
- Advanced sound synthesis patterns
- Collaborative garden features
- Weather and environmental effects
- Extended AI capabilities
- Plant lifecycle simulation

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with Bun and modern web technologies
- Powered by OpenAI's API
- Special thanks to the P5.js and Tone.js communities
