# Interactive Sound Garden 🌸

An interactive digital garden that combines visual art, procedural animation, and generative sound. Each flower in the garden responds to user interaction with unique visual effects and musical patterns.

## Features

- **Dynamic Flower Types**: Multiple flower varieties including:
  - 🌹 Roses (Harmonic major scales)
  - 🌷 Tulips (Natural minor scales)
  - 🌻 Daisies (Major triads)
  - 🌺 Orchids (Diminished scales)
  - 🪷 Lotus (Low register harmonics)
  - 🌼 Dandelion (Major scales)
  - 🌿 And more!

- **Interactive Elements**:
  - Mouse proximity affects flower energy
  - Click to energize flowers
  - Each flower type has unique sound patterns
  - Particle effects on interaction
  - Wind simulation affecting plant movement

- **Generative Sound**:
  - Each flower type has its own musical scale
  - Ambient chord progressions
  - Dynamic volume based on interaction intensity
  - Different synthesizer types per flower

- **AI Features**:
  - Toggle AI mode to enable autonomous behavior
  - AI generates new plant behaviors
  - Dynamic sound pattern generation
  - Responsive to user interaction patterns

## Technologies Used

- **P5.js**: For visual rendering and animation
- **Tone.js**: For audio synthesis and musical elements
- **ML5.js**: For AI behavior patterns

## Getting Started

1. Clone or download this repository
2. Ensure you have a local web server running (e.g., MAMP, XAMPP)
3. Open `index.html` in your web browser
4. Click anywhere on the page to initialize audio
5. Start interacting with the garden!

## Controls

- **Mouse Movement**: Hover near flowers to energize them
- **Mouse Click**: Boost flower energy and trigger sound
- **Space Bar**: Toggle AI mode
- **UI Buttons**:
  - Toggle AI Mode: Enable/disable autonomous behavior
  - Reset Garden: Start fresh with new flowers
  - Add Plant: Introduce a new random flower

## Project Structure

```
.
├── index.html          # Main HTML file
├── style.css          # CSS styling
├── sketch.js          # Main P5.js code
└── libraries/         # External libraries
    ├── p5.min.js
    └── p5.sound.min.js
```

## Performance Notes

- For best performance, use a modern browser with Web Audio API support
- Initial audio context requires user interaction (click) to start
- Recommended to limit total flowers to 20 for optimal performance

## Dependencies

- P5.js v1.6.0
- Tone.js v14.8.39
- ML5.js (latest version)

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Inspired by generative art and creative coding practices
- Built as part of the Creative Coding module
- Special thanks to the P5.js, Tone.js, and ML5.js communities

## Future Enhancements

- Additional flower types with unique behaviors
- More complex AI interaction patterns
- Weather effects influencing garden behavior
- Collaborative garden features
- Sound visualization elements
