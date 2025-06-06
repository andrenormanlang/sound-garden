// Global variables
let plants = [];
let particles = [];
let synths = {};
let lastInteraction = 0;
let backgroundHue = 220;
let windForce = 0;
let ambientSynth;
let eraserMode = false;
let creatorMode = false; // Toggle for creation mode
let plantType = "random"; // Type of plant to create (random or ai)
let activeRainbows = []; // Array to store active rainbow data and objects
let activeAuroras = []; // Array to store active aurora data and objects

// UI elements
let aiPlantBtn;
let aiInfo;
let rainbowPlantBtn; // Button for generating rainbows
let auroraPlantBtn; // Button for generating aurora borealis

// Initialize UI elements after window loads
window.addEventListener("load", () => {
  aiPlantBtn = document.querySelector(".controls .btn:nth-child(3)"); // The AI Plant button
  aiInfo = document.querySelector(".ai-info");
  // Assuming the rainbow button will be the 4th button in the main controls div
  rainbowPlantBtn = document.querySelector(".controls .btn:nth-child(4)");
  // Assuming the aurora button will be the 5th button in the main controls div
  auroraPlantBtn = document.querySelector(".controls .btn:nth-child(5)");
});

// Helper function for loading state
function setLoadingState(button, isLoading) {
  if (!button) return;
  const spinner = button.querySelector(".spinner");
  if (spinner) {
    spinner.style.display = isLoading ? "inline-block" : "none";
  }
  button.disabled = isLoading;
}

// Sound toggle functionality
let soundEnabled = true; // Global sound toggle state

// Ground and environment variables
const GROUND_HEIGHT = 250; // Increased ground height significantly
let grassHeight = [];
let grassWind = 0;

// Plant lifecycle states
const LIFECYCLE_STATES = {
  SEED: "seed",
  GROWING: "growing",
  MATURE: "mature",
  DECAYING: "decaying",
  DEAD: "dead",
};

// Initialize audio context and setup ambient synth
async function initializeAudio() {
  // Start audio context
  await Tone.start();
  console.log("Audio context started");

  // Create and configure ambient synth
  ambientSynth = new Tone.PolySynth(Tone.FMSynth).toDestination();
  ambientSynth.set({
    envelope: {
      attack: 0.5,
      decay: 0.5,
      sustain: 0.5,
      release: 1,
    },
  });
  ambientSynth.volume.value = -20;
  console.log("Ambient synth initialized");
}

// Sound toggle functionality
function toggleSound() {
  soundEnabled = !soundEnabled;

  // Save preference to localStorage
  localStorage.setItem("soundGardenSoundEnabled", JSON.stringify(soundEnabled));

  // Update button visual state
  updateSoundButtonState();

  // If sound is disabled, fade out and stop all currently playing sounds
  if (!soundEnabled) {
    // Stop all plant synths with a short fade-out
    Object.values(synths).forEach((synth) => {
      if (synth && synth.dispose) {
        if (synth.volume) {
          synth.volume.rampTo(-Infinity, 0.1);
        }
        setTimeout(() => {
          synth.releaseAll();
        }, 100);
      }
    });

    // Stop ambient synth with fade-out
    if (ambientSynth) {
      if (ambientSynth.volume) {
        ambientSynth.volume.rampTo(-Infinity, 0.1);
      }
      setTimeout(() => {
        ambientSynth.releaseAll();
      }, 100);
    }

    // Stop weather sounds with fade-out
    if (currentWeather && currentWeather.noise) {
      if (currentWeather.noise.volume) {
        currentWeather.noise.volume.rampTo(-Infinity, 0.1);
      }
      setTimeout(() => {
        if (currentWeather.noise) {
          currentWeather.noise.stop();
        }
      }, 100);
    }
  } else {
    // Re-enable sounds

    // Restart weather sounds if weather is active
    if (currentWeather && currentWeather.active && !currentWeather.noise) {
      currentWeather.initializeSound(currentWeather);
    }

    // Reset ambient synth volume
    if (ambientSynth) {
      ambientSynth.volume.value = -20;
    }

    // Reset any existing plant synth volumes
    Object.values(synths).forEach((synth) => {
      if (synth && synth.volume) {
        synth.volume.value = -12;
      }
    });
  }

  console.log(`Sound ${soundEnabled ? "enabled" : "disabled"}`);
}

function updateSoundButtonState() {
  const soundButton = document.querySelector(".sound-toggle-btn");
  if (soundButton) {
    const icon = soundButton.querySelector(".sound-icon");
    const text = soundButton.querySelector(".sound-text");

    if (soundEnabled) {
      icon.textContent = "🔊";
      text.textContent = "Sound On";
      soundButton.classList.remove("muted");
    } else {
      icon.textContent = "🔇";
      text.textContent = "Sound Off";
      soundButton.classList.add("muted");
    }
  }
}

// Wait for the page to load before initializing
window.onload = async () => {
  try {
    // Load sound preference from localStorage
    const savedSoundState = localStorage.getItem("soundGardenSoundEnabled");
    if (savedSoundState !== null) {
      soundEnabled = JSON.parse(savedSoundState);
    }

    // Initialize audio
    await initializeAudio();

    // Update sound button state on load
    updateSoundButtonState();
  } catch (error) {
    console.error("Error initializing audio:", error);
  }
};

// Make generateExoticPlant function globally accessible
window.generateExoticPlant = async function () {
  // Ensure audio context is running
  if (Tone.context.state !== "running") {
    await Tone.start();
  }

  try {
    const response = await fetch("/api/generate-plant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: 1 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        alert(
          `Rate limit exceeded. Please wait ${errorData.retryAfter} seconds.`
        );
      } else {
        throw new Error(errorData.error || "Failed to generate plant");
      }
      return null;
    }

    const responseData = await response.json();
    // If it's a single plant response
    const plantsToAdd = responseData.plants || [responseData];

    if (plantsToAdd.length === 0) {
      alert("No plants were generated. Please try again.");
      return null;
    }

    // Track successfully added plants for the info panel
    let addedPlants = [];

    // Process each plant in the response
    plantsToAdd.forEach((plantData) => {
      if (!plantData || !plantData.name) {
        console.error("Invalid plant data received:", plantData);
        return;
      }

      const plantType = plantData.name.toLowerCase();

      // Add the new flower type to FLOWER_TYPES if it doesn't exist
      if (!FLOWER_TYPES[plantType]) {
        FLOWER_TYPES[plantType] = {
          colors: plantData.colors,
          petals: plantData.petals,
          size: plantData.size,
          height: plantData.height,
          scale: plantData.scale,
          oscillator: plantData.oscillator,
          layerCount: plantData.layerCount,
          growthPattern: plantData.growthPattern,
          depthOffset: plantData.depthOffset,
          stemStyle: plantData.stemStyle,
          stemRadius: plantData.stemRadius,
          petalShape: plantData.petalShape,
          leafPattern: plantData.leafPattern,
          flowerType: plantData.flowerType,
          seasonalBehavior: plantData.seasonalBehavior,
          pollinatorAttractant: plantData.pollinatorAttractant,
        };
      }

      // Try to add the plant if there's room
      if (plants.length < 1000) {
        // Define safe margins for plant placement
        const marginX = 50;
        const marginY = 100;

        // Generate a random position within safe margins
        let x = random(marginX, width - marginX);
        let y = height - marginY + random(-30, 30); // Keep plants near ground level with some variation

        // Check if position is far enough from existing plants
        const minDistance = 50; // Minimum distance between plants
        let validPosition = true;

        // Try to find a spot that's not too close to other plants
        const plantsToCheck = Math.min(plants.length, 20);
        for (let i = 0; i < plantsToCheck; i++) {
          const randomIndex = Math.floor(random(plants.length));
          const existingPlant = plants[randomIndex];
          const d = dist(x, y, existingPlant.x, existingPlant.y);
          if (d < minDistance) {
            validPosition = false;
            break;
          }
        }

        // If position is not valid, adjust it
        if (!validPosition && plants.length > 10) {
          x = random(marginX, width - marginX);
          y = height - marginY + random(-40, 40);
        }

        // Create the plant with the full AI data
        plants.push(new Plant(x, y, null, plantData));
        addedPlants.push(plantData);
      }
    });

    if (addedPlants.length === 0) {
      alert("Garden is full! Remove some plants first.");
    } else {
      // Update AI info panel with descriptions of added plants
      const infoHTML = `
        <h4>🤖 AI Generated Plants</h4>
        ${addedPlants
          .map(
            (plant) => `
          <div class="plant-info">
            <p><strong>New Plant Generated:</strong> ${plant.name}</p>
            <p>${plant.description}</p>
          </div>
        `
          )
          .join("")}
      `;
      document.querySelector(".ai-info").innerHTML = infoHTML;
    }

    return plantsToAdd[0]; // Return the first plant for backwards compatibility
  } catch (error) {
    console.error("Error generating exotic plant:", error);
    alert("Error generating plant. Please try again.");
    return null;
  } finally {
    setLoadingState(aiPlantBtn, false);
    aiInfo.classList.remove("loading");
  }
};

// Function to generate and display a psychedelic rainbow
window.generatePsychedelicRainbow = async function () {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }
  if (!rainbowPlantBtn) {
    console.error("Rainbow button not initialized!");
    return;
  }
  setLoadingState(rainbowPlantBtn, true);

  try {
    const response = await fetch("/api/generate-rainbow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error || "Failed to generate rainbow");
      return;
    }

    const rainbowData = await response.json();
    console.log("Psychedelic Rainbow Data:", rainbowData);
    // Ensure visualProperties and its nested properties exist before accessing
    if (rainbowData.visualProperties && rainbowData.visualProperties.colors) {
      console.log(
        "Rainbow Colors from AI:",
        rainbowData.visualProperties.colors
      );
    } else {
      console.warn(
        "Visual properties or colors missing in rainbowData:",
        rainbowData
      );
      // Provide default colors or handle error appropriately
      // For now, let's ensure rainbowData.visualProperties.colors is an empty array if missing
      if (!rainbowData.visualProperties) rainbowData.visualProperties = {};
      if (!rainbowData.visualProperties.colors)
        rainbowData.visualProperties.colors = [];
    }
    activeRainbows.push(new PsychedelicRainbow(rainbowData));

    // Update UI or info panel if needed
    const infoHTML = `
      <h4>🌈 Psychedelic Rainbow Generated!</h4>
      <div class="rainbow-info">
        <p><strong>Name:</strong> ${rainbowData.name || "N/A"}</p>
        <p>${rainbowData.description || "No description."}</p>
        <p><strong>Soundscape:</strong> ${
          rainbowData.soundProperties
            ? rainbowData.soundProperties.soundscapeName
            : "N/A"
        }</p>
      </div>
    `;
    // Prepend to aiInfo or a dedicated rainbow info panel
    const currentInfo = document.querySelector(".ai-info").innerHTML;
    document.querySelector(".ai-info").innerHTML = infoHTML + currentInfo;
  } catch (error) {
    console.error("Error generating psychedelic rainbow:", error);
    alert("Error generating rainbow. Please check console.");
  } finally {
    setLoadingState(rainbowPlantBtn, false);
  }
};

// Function to generate and display a psychedelic aurora borealis
window.generatePsychedelicAurora = async function () {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }
  if (!auroraPlantBtn) {
    console.error("Aurora button not initialized!");
    return;
  }
  setLoadingState(auroraPlantBtn, true);

  try {
    console.log("Fetching aurora data...");
    const response = await fetch("/api/generate-aurora", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error || "Failed to generate aurora");
      return;
    }

    const auroraData = await response.json();
    console.log("Psychedelic Aurora Data:", auroraData);

    // Ensure visualProperties and its nested properties exist before accessing
    if (auroraData.visualProperties && auroraData.visualProperties.colors) {
      console.log("Aurora Colors from AI:", auroraData.visualProperties.colors);
    } else {
      console.warn(
        "Visual properties or colors missing in auroraData:",
        auroraData
      );
      // Provide default colors or handle error appropriately
      if (!auroraData.visualProperties) auroraData.visualProperties = {};
      if (!auroraData.visualProperties.colors)
        auroraData.visualProperties.colors = [];
    }

    activeAuroras.push(new PsychedelicAurora(auroraData));

    // Update UI or info panel if needed
    const infoHTML = `
      <h4>🌌 Psychedelic Aurora Generated!</h4>
      <div class="aurora-info">
        <p><strong>Name:</strong> ${auroraData.name || "N/A"}</p>
        <p>${auroraData.description || "No description."}</p>
        <p><strong>Soundscape:</strong> ${
          auroraData.soundProperties
            ? auroraData.soundProperties.soundscapeName
            : "N/A"
        }</p>
      </div>
    `;
    // Prepend to aiInfo or a dedicated aurora info panel
    const currentInfo = document.querySelector(".ai-info").innerHTML;
    document.querySelector(".ai-info").innerHTML = infoHTML + currentInfo;
  } catch (error) {
    console.error("Error generating psychedelic aurora:", error);
    alert("Error generating aurora. Please check console.");
  } finally {
    setLoadingState(auroraPlantBtn, false);
  }
};

class PsychedelicRainbow {
  constructor(data) {
    this.data = data; // Contains visualProperties and soundProperties
    this.startTime = millis();
    this.alive = true;
    this.isHovered = false;
    this.soundPlaying = false;

    // Define traditional rainbow colors (ROYGBIV) as default - softer tones for ethereal effect
    this.defaultRainbowColors = [
      [240, 80, 80], // Softer Red
      [240, 150, 60], // Softer Orange
      [240, 240, 80], // Softer Yellow
      [80, 240, 80], // Softer Green
      [80, 80, 240], // Softer Blue
      [120, 60, 180], // Softer Indigo
      [180, 80, 220], // Softer Violet
    ];

    // Rainbow position and size properties
    this.centerX = width / 2;
    this.centerY = height - GROUND_HEIGHT - 30;

    // Generate random width and height variations for each rainbow
    const widthVariation = random(0.7, 1.3); // Width can vary from 70% to 130% of base
    const heightVariation = random(0.6, 1.2); // Height can vary from 60% to 120% of base

    // Apply variations to base dimensions
    this.maxRadius = (width / 3) * widthVariation;
    this.minRadius = (width / 6) * widthVariation;

    // Apply height variation by adjusting center Y position
    const baseY = height - GROUND_HEIGHT - 30;
    this.centerY = baseY + this.maxRadius * (1 - heightVariation) * 0.3;

    // Initialize sound
    // Ensure soundProperties and its nested properties exist
    const validOscillatorTypes = ["sine", "triangle", "square", "sawtooth"];
    let requestedOscillatorType =
      this.data.soundProperties && this.data.soundProperties.oscillatorType
        ? this.data.soundProperties.oscillatorType
        : "sine";

    // Validate oscillator type and fallback to sine if invalid
    const oscillatorType = validOscillatorTypes.includes(
      requestedOscillatorType
    )
      ? requestedOscillatorType
      : "sine";

    if (requestedOscillatorType !== oscillatorType) {
      console.warn(
        `Invalid oscillator type '${requestedOscillatorType}', using 'sine' instead`
      );
    }
    const durationSeconds =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds
        : 10;
    const reverbMix =
      this.data.soundProperties && this.data.soundProperties.reverbMix
        ? this.data.soundProperties.reverbMix
        : 0.5;

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: oscillatorType,
      },
      envelope: {
        attack: 0.5,
        decay: 1.0,
        sustain: 0.8,
        release: 2.0,
      },
      volume: -12,
    });

    this.reverb = new Tone.Reverb(durationSeconds * 0.5).toDestination();
    this.reverb.wet.value = reverbMix;
    this.synth.connect(this.reverb);

    // Don't play sound automatically - only on hover
  }

  // Check if mouse is hovering over the rainbow
  isMouseOver(mouseX, mouseY) {
    // Check if mouse is within the rainbow arc area
    const dx = mouseX - this.centerX;
    const dy = mouseY - this.centerY;
    const distance = sqrt(dx * dx + dy * dy);

    // Check if mouse is within rainbow radius range and above the ground
    const withinRadius =
      distance >= this.minRadius && distance <= this.maxRadius;
    const aboveGround = mouseY <= this.centerY;

    // Check if mouse is in the upper semicircle (rainbow arc area)
    const angle = atan2(dy, dx);
    const inArcArea = angle >= PI * 0.05 && angle <= PI * 0.95; // Expanded range for better detection

    return withinRadius && aboveGround && inArcArea;
  }

  // Start playing sound on hover
  startHoverSound() {
    if (!soundEnabled || this.soundPlaying) return;
    this.soundPlaying = true;
    this.playHarmonicSound();
  }

  // Stop sound when hover ends
  stopHoverSound() {
    if (this.synth && this.soundPlaying) {
      this.synth.releaseAll();
      this.soundPlaying = false;
    }
  }

  // Update hover state
  updateHover(mouseX, mouseY) {
    const wasHovered = this.isHovered;
    this.isHovered = this.isMouseOver(mouseX, mouseY);

    if (this.isHovered && !wasHovered) {
      this.startHoverSound();
    } else if (!this.isHovered && wasHovered) {
      this.stopHoverSound();
    }
  }

  playHarmonicSound() {
    if (!soundEnabled) return;
    const now = Tone.now();

    // Ensure soundProperties and its nested properties exist
    const fundamental =
      this.data.soundProperties && this.data.soundProperties.baseFrequency
        ? this.data.soundProperties.baseFrequency
        : 220;
    const harmonicity =
      this.data.soundProperties && this.data.soundProperties.harmonicityRatio
        ? this.data.soundProperties.harmonicityRatio
        : 1.5;
    const duration =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds * 0.75
        : 7.5;

    const harmonicIntervals = [1, 2, 1.5, 3, 4, 1.25, 5, 1.75];

    const numBaseHarmonics = 3;
    const additionalHarmonics = Math.floor((harmonicity - 1.0) * 2.5);
    const totalHarmonicsToConsider = Math.min(
      harmonicIntervals.length,
      numBaseHarmonics + additionalHarmonics
    );

    const frequenciesToPlay = [];
    for (let i = 0; i < totalHarmonicsToConsider; i++) {
      frequenciesToPlay.push(fundamental * harmonicIntervals[i]);
    }

    const uniqueFrequencies = [...new Set(frequenciesToPlay)].sort(
      (a, b) => a - b
    );

    uniqueFrequencies.forEach((freq, index) => {
      const detuneFactor = 0.0005 + ((harmonicity - 1.0) / 2.0) * 0.0195;
      const randomDetune = (Math.random() - 0.5) * 2 * detuneFactor;
      const finalFreq = freq * (1 + randomDetune);
      let velocity = Math.max(0.1, 0.85 - index * 0.12);
      if (harmonicity < 1.5) {
        velocity *= 0.7 + (harmonicity - 1.0) * 0.6;
      }
      this.synth.triggerAttackRelease(
        finalFreq,
        duration,
        now + index * (0.04 + Math.random() * 0.06),
        velocity
      );
    });
  }

  update() {
    const durationSeconds =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds
        : 10;
    if (millis() - this.startTime > durationSeconds * 1000) {
      this.alive = false;
      this.disposeSound();
    }
  }

  display() {
    if (!this.alive) return;

    const durationSeconds =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds
        : 30;

    const elapsedTime = (millis() - this.startTime) / 1000;
    const progress = elapsedTime / durationSeconds;
    if (progress > 1) return;

    // Use AI-generated colors or default aurora colors
    const colors =
      this.data.visualProperties &&
      this.data.visualProperties.colors &&
      this.data.visualProperties.colors.length > 0
        ? this.data.visualProperties.colors
        : this.defaultAuroraColors;

    // Base alpha with gradual fade
    const baseAlpha = 150 * (1 - progress * 0.4) * this.intensity;

    push();

    // Apply flow pattern transformations
    if (this.flowPattern === "breathing_veils") {
      const breath = 0.95 + sin(elapsedTime * PI * 0.3) * 0.05;
      scale(1, breath);
    } else if (this.flowPattern === "spiral_vortex") {
      translate(width / 2, height / 2);
      rotate(elapsedTime * 0.1);
      translate(-width / 2, -height / 2);
    }

    // Draw aurora waves
    for (let waveIndex = 0; waveIndex < this.waves.length; waveIndex++) {
      const wave = this.waves[waveIndex];
      const colorIndex = waveIndex % colors.length;
      const color = colors[colorIndex];

      let currentAlpha = baseAlpha;

      // Apply shimmer effects
      if (this.flowPattern === "rippling_sheets") {
        currentAlpha *= 0.7 + noise(elapsedTime * 2 + waveIndex * 0.5) * 0.3;
      } else if (this.flowPattern === "dancing_curtains") {
        currentAlpha *=
          0.8 +
          sin(elapsedTime * PI * this.shimmerSpeed + waveIndex * 0.6) * 0.2;
      }

      // Enhance on hover
      if (this.isHovered) {
        currentAlpha *= 1.2;
      }

      // Set stroke color
      noFill();
      if (Array.isArray(color) && color.length >= 3) {
        stroke(color[0], color[1], color[2], max(0, currentAlpha));
      } else {
        stroke(0, 255, 100, max(0, currentAlpha)); // Default to green
      }
      strokeWeight(3 + waveIndex * 0.5);

      // Draw flowing wave using beginShape/endShape for smooth curves
      beginShape();
      noFill();

      for (let x = 0; x <= width; x += 10) {
        // Create flowing wave pattern
        let y = wave.yOffset;

        // Add primary wave motion
        y += sin(x * wave.frequency + wave.phase) * wave.amplitude;

        // Add secondary motion for more organic feel
        y +=
          sin(x * wave.frequency * 2 + wave.phase * 1.5) *
          (wave.amplitude * 0.3);

        // Add shimmer effect
        y += sin(x * 0.01 + elapsedTime * this.shimmerSpeed) * 10;

        // Apply flow pattern-specific modifications
        if (this.flowPattern === "flowing_waves") {
          y += sin(x * 0.005 + elapsedTime * 0.5) * 15;
        } else if (this.flowPattern === "dancing_curtains") {
          y += cos(x * 0.008 + elapsedTime + waveIndex) * 20;
        }

        vertex(x, y);
      }
      endShape();

      // Add complementary wave below for fullness
      if (waveIndex < 3) {
        stroke(color[0], color[1], color[2], max(0, currentAlpha * 0.6));
        strokeWeight(2);
        beginShape();
        noFill();
        for (let x = 0; x <= width; x += 15) {
          let y = wave.yOffset + 20;
          y +=
            sin(x * wave.frequency + wave.phase + PI) * (wave.amplitude * 0.7);
          y += sin(x * 0.008 + elapsedTime * this.shimmerSpeed * 0.8) * 8;
          vertex(x, y);
        }
        endShape();
      }
    }

    // Add particle effects for extra magic
    if (this.isHovered) {
      this.drawAuroraParticles(elapsedTime);
    }

    pop();
  }

  // Draw floating particles for magical aurora effect
  drawAuroraParticles(elapsedTime) {
    const colors =
      this.data.visualProperties?.colors || this.defaultAuroraColors;

    push();
    for (let i = 0; i < 12; i++) {
      const x = noise(elapsedTime * 0.3 + i * 0.1) * width;
      const y =
        this.baseY + noise(elapsedTime * 0.2 + i * 0.15) * this.waveHeight;

      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      const particleAlpha = 100 + sin(elapsedTime * 3 + i) * 50;

      if (Array.isArray(color) && color.length >= 3) {
        fill(color[0], color[1], color[2], max(0, particleAlpha));
      } else {
        fill(0, 255, 100, max(0, particleAlpha));
      }
      noStroke();

      const size = 2 + sin(elapsedTime * 2 + i) * 1;
      ellipse(x, y, size);
    }
    pop();
  }

  disposeSound() {
    if (this.synth) {
      this.synth.releaseAll();
      this.synth.dispose();
      this.synth = null;
    }
    if (this.reverb) {
      this.reverb.dispose();
      this.reverb = null;
    }
  }
}

// Flower definitions with unique characteristics
const FLOWER_TYPES = {
  rose: {
    colors: [
      [350, 80, 90],
      [10, 70, 85],
      [320, 60, 80],
    ],
    petals: 12,
    size: [40, 70],
    height: [80, 120],
    scale: [60, 64, 67, 72, 76, 79], // Major with 6th
    oscillator: "sine",
  },
  lily: {
    colors: [
      [40, 30, 95],
      [50, 40, 90],
      [35, 25, 88],
    ],
    petals: 6,
    size: [50, 80],
    height: [90, 140],
    scale: [60, 62, 67, 69, 74, 76], // Pentatonic extended
    oscillator: "triangle",
  },
  tulip: {
    colors: [
      [15, 90, 85],
      [300, 80, 75],
      [270, 70, 80],
    ],
    petals: 6,
    size: [35, 60],
    height: [60, 100],
    scale: [60, 62, 64, 67, 69, 71], // Natural minor
    oscillator: "sawtooth",
  },
  daisy: {
    colors: [
      [60, 20, 95],
      [55, 30, 90],
    ],
    petals: 16,
    size: [30, 50],
    height: [40, 80],
    scale: [60, 64, 67, 72, 76], // Major triad
    oscillator: "square",
  },
  orchid: {
    colors: [
      [280, 60, 85],
      [290, 70, 80],
      [270, 50, 90],
    ],
    petals: 5,
    size: [45, 75],
    height: [70, 110],
    scale: [60, 63, 66, 70, 73, 77], // Diminished
    oscillator: "sine",
  },
  lotus: {
    colors: [
      [340, 40, 90],
      [350, 30, 95],
      [10, 20, 88],
    ],
    petals: 8,
    size: [70, 100],
    height: [40, 80],
    scale: [48, 52, 55, 60, 64, 67], // Low register
    oscillator: "triangle",
  },
  dandelion: {
    colors: [
      [50, 90, 90],
      [45, 80, 85],
    ],
    petals: 20,
    size: [30, 50],
    height: [20, 50],
    scale: [60, 64, 67, 72, 76, 79, 83], // Major scale
    oscillator: "square",
  },
  marigold: {
    colors: [
      [35, 90, 85],
      [25, 80, 90],
      [15, 85, 80],
    ],
    petals: 10,
    size: [40, 65],
    height: [50, 90],
    scale: [60, 62, 65, 67, 70], // Pentatonic
    oscillator: "sawtooth",
  },
  // Houseplants
  rubber_plant: {
    colors: [
      [120, 60, 40], // Dark green leaves
    ],
    petals: 8,
    size: [60, 90],
    height: [120, 200],
    scale: [48, 52, 55, 59], // Lower register for a deep, grounding sound
    oscillator: "sine",
    layerCount: 1,
    growthPattern: "symmetrical",
    leafPattern: "alternate",
  },
  creeping_fig: {
    colors: [
      [100, 70, 60], // Bright green
      [90, 65, 55],
    ],
    petals: 12,
    size: [40, 60],
    height: [30, 60],
    scale: [60, 64, 67, 71], // Light, airy melody
    oscillator: "triangle",
    layerCount: 2,
    growthPattern: "cascading",
    leafPattern: "alternate",
  },
  dracaena: {
    colors: [
      [120, 40, 50], // Deep green
      [120, 30, 60],
    ],
    petals: 15,
    size: [50, 80],
    height: [100, 180],
    scale: [55, 59, 62, 67], // Mid-range mysterious sound
    oscillator: "triangle",
    layerCount: 1,
    growthPattern: "spiral",
    leafPattern: "whorled",
  },
  peace_lily: {
    colors: [
      [120, 30, 85], // Green leaves
      [0, 0, 100], // White flowers
    ],
    petals: 1,
    size: [30, 50],
    height: [40, 80],
    scale: [72, 76, 79, 83], // High, peaceful notes
    oscillator: "sine",
    layerCount: 1,
    growthPattern: "symmetrical",
    leafPattern: "basal",
  },
  snake_plant: {
    colors: [
      [120, 50, 60], // Green with
      [120, 70, 40], // pattern variations
    ],
    petals: 6,
    size: [40, 70],
    height: [60, 120],
    scale: [48, 55, 60, 67], // Strong bass notes
    oscillator: "sawtooth",
    layerCount: 1,
    growthPattern: "symmetrical",
    leafPattern: "basal",
  },
  boston_fern: {
    colors: [
      [100, 60, 70], // Bright green
      [120, 50, 60],
    ],
    petals: 20,
    size: [70, 100],
    height: [50, 90],
    scale: [64, 67, 71, 74], // Gentle mid-range
    oscillator: "triangle",
    layerCount: 3,
    growthPattern: "cascading",
    leafPattern: "opposite",
  },
  spider_plant: {
    colors: [
      [90, 30, 90], // Light green
      [120, 20, 95],
    ],
    petals: 15,
    size: [50, 80],
    height: [30, 60],
    scale: [69, 72, 76, 79], // High, tinkling notes
    oscillator: "sine",
    layerCount: 2,
    growthPattern: "cascading",
    leafPattern: "basal",
  },
  aloe_vera: {
    colors: [
      [120, 40, 70], // Pale green
      [120, 50, 60],
    ],
    petals: 8,
    size: [40, 60],
    height: [30, 50],
    scale: [60, 64, 67, 71], // Healing frequencies
    oscillator: "triangle",
    layerCount: 1,
    growthPattern: "symmetrical",
    leafPattern: "basal",
  },
};

// Plant class with improved drawing methods
class Plant {
  constructor(x, y, flowerType = null, plantData = null) {
    this.x = x;
    this.groundLevel = y;
    this.energy = 0;
    this.maxEnergy = 100;
    this.lastSoundTime = 0;

    // Select random flower type if no data provided
    if (!plantData) {
      const flowerKeys = Object.keys(FLOWER_TYPES);
      this.flowerType =
        flowerType || flowerKeys[Math.floor(Math.random() * flowerKeys.length)];
      this.flowerData = FLOWER_TYPES[this.flowerType];
    } else {
      // Use AI-generated data
      this.flowerType = plantData.name.toLowerCase();
      this.flowerData = {
        colors: plantData.colors,
        petals: plantData.petals,
        size: plantData.size,
        height: plantData.height,
        scale: plantData.scale,
        oscillator: plantData.oscillator,
        layerCount: plantData.layerCount,
        growthPattern: plantData.growthPattern,
        depthOffset: plantData.depthOffset,
        stemStyle: plantData.stemStyle,
        stemRadius: plantData.stemRadius,
        petalShape: plantData.petalShape,
        leafPattern: plantData.leafPattern,
        flowerType: plantData.flowerType,
        seasonalBehavior: plantData.seasonalBehavior,
        pollinatorAttractant: plantData.pollinatorAttractant,
      };
    }

    // Use flower-specific properties
    this.size = random(this.flowerData.size[0], this.flowerData.size[1]);
    this.height = random(this.flowerData.height[0], this.flowerData.height[1]);
    this.petals = this.flowerData.petals;

    // Select random color from flower's palette
    const colorChoice =
      this.flowerData.colors[
        Math.floor(Math.random() * this.flowerData.colors.length)
      ];
    this.color = color(colorChoice[0], colorChoice[1], colorChoice[2]);

    this.oscillation = random(0, TWO_PI);
    this.frequency = random(0.01, 0.03);
    this.soundScale = this.flowerData.scale;
    this.oscillatorType = this.flowerData.oscillator;

    // New properties for enhanced visuals
    this.layerCount = this.flowerData.layerCount || 1;
    this.growthPattern = this.flowerData.growthPattern || "symmetrical";
    this.depthOffset = this.flowerData.depthOffset || 0;

    // Adjust size based on depth
    this.depthScale = map(this.depthOffset, 0, 100, 1.5, 0.5);
    this.size *= this.depthScale;
    this.height *= this.depthScale;

    // Calculate y position based on ground level and depth offset
    this.y = this.groundLevel - this.depthOffset / 2;

    // Enhanced animation properties
    this.petalRotations = Array(this.layerCount).fill(0);
    this.petalSpeeds = Array(this.layerCount)
      .fill(0)
      .map(() => random(-0.002, 0.002));
    this.bloomPhases = Array(this.layerCount).fill(0);

    // Lifecycle properties - convert AI values from seconds to milliseconds
    this.birthTime = millis();
    if (plantData) {
      this.lifespan = plantData.lifespan * 1000; // Convert seconds to milliseconds
      this.maturityAge = plantData.maturityAge * 1000;
      this.growthRate = plantData.growthRate;
      this.resilience = plantData.resilience;
    } else {
      this.lifespan = random(60000, 180000); // Default 1-3 minutes lifespan
      this.maturityAge = random(10000, 30000); // Default 10-30 seconds to mature
      this.growthRate = random(0.5, 1.5);
      this.resilience = random(3, 8);
    }

    this.health = 100;
    this.state = LIFECYCLE_STATES.SEED;
    this.scale = 0.1; // Start as a small seed

    // Create initial branches
    this.branches = [];
    this.createBranches();
  }

  // Methods for Plant class
  update() {
    // Calculate distance to mouse
    let d = dist(mouseX, mouseY, this.x, this.y);
    let maxDistance = 150;

    if (d < maxDistance) {
      this.energy = map(d, 0, maxDistance, this.maxEnergy, 0);
      this.interact();
    } else {
      this.energy *= 0.95; // Gradual decay
    }

    this.oscillation += this.frequency;

    // Update petal animations
    this.petalRotations = this.petalRotations.map(
      (rotation, i) => rotation + this.petalSpeeds[i] * (this.energy / 50)
    );

    // Update lifecycle
    const currentTime = millis();
    this.age = currentTime - this.birthTime;

    // Check for dead plant first based on health or age
    if (this.health <= 0 || this.age >= this.lifespan) {
      this.state = LIFECYCLE_STATES.DEAD;
      this.health = min(this.health, 0); // Ensure health is 0 or negative for dead plants
    }
    // Update other lifecycle states for living plants
    else if (this.age < 2000) {
      this.state = LIFECYCLE_STATES.SEED;
    } else if (this.age < this.maturityAge) {
      this.state = LIFECYCLE_STATES.GROWING;
      this.growthProgress = map(this.age, 2000, this.maturityAge, 0, 1);
      this.scale = map(this.growthProgress, 0, 1, 0.1, 1) * this.growthRate;
    } else if (this.age < this.lifespan * 0.8) {
      this.state = LIFECYCLE_STATES.MATURE;
      this.scale = this.growthRate; // Full size
    } else if (this.age < this.lifespan) {
      this.state = LIFECYCLE_STATES.DECAYING;
      const decayProgress = map(
        this.age,
        this.lifespan * 0.8,
        this.lifespan,
        0,
        1
      );
      // Decrease health as plant decays
      this.health = max(0.1, this.health - (0.1 + decayProgress * 0.2));
    }

    // Environmental effects
    if (
      this.state !== LIFECYCLE_STATES.SEED &&
      this.state !== LIFECYCLE_STATES.DEAD
    ) {
      // Wind damage
      if (windForce > 0.5) {
        this.health -= ((windForce - 0.5) / this.resilience) * 0.5;
      }

      // Recovery when conditions are good
      if (
        this.health < 100 &&
        windForce < 0.3 &&
        this.state !== LIFECYCLE_STATES.DECAYING
      ) {
        this.health += 0.05 * this.resilience;
      }

      // Health affects energy capacity
      this.maxEnergy = map(this.health, 0, 100, 30, 100);
      this.energy = min(this.energy, this.maxEnergy);

      // Constrain health
      this.health = constrain(this.health, 0, 100);
    }
  }

  async interact() {
    if (millis() - this.lastSoundTime > 300) {
      try {
        await this.playSound();
        this.createParticles();
        this.lastSoundTime = millis();

        // Occasionally play ambient chord when plants are very active
        if (this.energy > 80 && random() < 0.1) {
          await this.playAmbientChord();
        }
      } catch (error) {
        console.error("Error in plant interaction:", error);
      }
    }
  }

  createBranches() {
    let numBranches = int(random(2, 5));
    for (let i = 0; i < numBranches; i++) {
      this.branches.push({
        angle: random(-PI / 3, PI / 3),
        length: random(15, 35),
        thickness: random(2, 5),
        leafCount: int(random(2, 6)),
      });
    }
  }

  drawBranches(sway) {
    for (let branch of this.branches) {
      push();
      translate(sway * 3, -this.height * 0.6);
      rotate(branch.angle + sway * 0.1);

      stroke(100, 50, 60);
      strokeWeight(branch.thickness);
      line(0, 0, branch.length, 0);

      this.drawLeaves(branch);
      pop();
    }
  }

  drawLeaves(branch) {
    for (let i = 0; i < branch.leafCount; i++) {
      let leafX = (branch.length / branch.leafCount) * i;
      let leafY = sin(this.oscillation + i) * 3;

      push();
      translate(leafX, leafY);

      fill(120, 60, 70, 80);
      noStroke();
      ellipse(0, 0, 8, 12);

      stroke(120, 40, 50, 60);
      strokeWeight(1);
      line(0, -6, 0, 6);
      pop();
    }
  }

  drawPetals(energyGlow) {
    // Draw multiple layers of petals
    for (let layer = 0; layer < this.layerCount; layer++) {
      const layerSize = this.size * (1 - layer * 0.15);
      const layerPetals = this.petals - layer * 2;

      for (let i = 0; i < layerPetals; i++) {
        let angle;
        switch (this.growthPattern) {
          case "spiral":
            angle = (TWO_PI / layerPetals) * i + layer * 0.5;
            break;
          case "cascading":
            angle =
              (TWO_PI / layerPetals) * i + sin(this.oscillation + layer) * 0.3;
            break;
          case "random":
            angle =
              (TWO_PI / layerPetals) * i +
              noise(i * 0.5, layer * 0.5, frameCount * 0.01) * PI;
            break;
          default: // symmetrical
            angle = (TWO_PI / layerPetals) * i;
        }

        push();
        rotate(angle + this.petalRotations[layer]);

        // Add some wave motion to petals
        let waveOffset = sin(this.oscillation + i * 0.5) * (this.energy * 0.05);

        // Create more interesting petal shapes
        beginShape();
        let petalWidth = layerSize / 4;
        let petalLength = layerSize / 2;
        vertex(-petalWidth / 2, 0);
        bezierVertex(
          -petalWidth / 2,
          -petalLength / 2,
          0,
          -petalLength + waveOffset,
          petalWidth / 2,
          -petalLength / 2
        );
        bezierVertex(petalWidth / 2, 0, petalWidth / 2, 0, 0, 0);
        endShape(CLOSE);

        pop();
      }
    }
  }

  draw() {
    push();
    translate(this.x, this.y);

    // Apply depth and lifecycle effects
    let depthAlpha = map(this.depthOffset, 0, 100, 100, 60);
    let lifecycleAlpha =
      this.state === LIFECYCLE_STATES.DECAYING
        ? map(this.health, 0, 100, 30, 100)
        : 100;

    let sway =
      sin(this.oscillation) * (this.energy / 20) + windForce * this.depthScale;

    // Draw based on plant lifecycle state
    if (this.state === LIFECYCLE_STATES.SEED) {
      noStroke();
      fill(120, 30, 30, lifecycleAlpha);
      ellipse(0, 0, 10 * this.scale);
      pop();
      return;
    } else if (this.state === LIFECYCLE_STATES.DEAD) {
      // Draw a withered plant when dead
      noStroke();
      fill(30, 30, 30, map(this.health, 0, -10, 40, 0)); // Fade out as health decreases below 0
      ellipse(0, 0, 5);

      // Draw a withered stem
      stroke(30, 30, 30, map(this.health, 0, -10, 40, 0));
      strokeWeight(1);
      line(0, 0, 0, -this.height * 0.3);
      pop();
      return;
    }

    // Scale based on growth progress
    scale(this.scale);

    // Draw stem with enhanced thickness and lifecycle effects
    stroke(120, 60, 40, (depthAlpha * lifecycleAlpha) / 100);
    strokeWeight(map(this.height, 30, 400, 3, 12) * this.depthScale);
    line(0, 0, sway * 8, -this.height);

    // Draw branches and leaves with lifecycle effects
    if (this.state !== LIFECYCLE_STATES.SEED) {
      this.drawBranches(sway);
    }

    // Draw flower head
    push();
    translate(sway * 8, -this.height);

    let energyGlow = map(this.energy, 0, this.maxEnergy, 0, 100);

    // Add shadow for depth
    noStroke();
    fill(0, 0, 0, (20 * lifecycleAlpha) / 100);
    ellipse(5, 5, this.size * 0.8);

    // Adjust color based on lifecycle
    let currentColor = color(
      hue(this.color),
      this.state === LIFECYCLE_STATES.DECAYING
        ? saturation(this.color) * 0.5
        : saturation(this.color),
      this.state === LIFECYCLE_STATES.DECAYING
        ? brightness(this.color) * 0.7
        : brightness(this.color),
      70 + energyGlow
    );

    fill(
      hue(currentColor),
      saturation(currentColor),
      brightness(currentColor),
      lifecycleAlpha
    );
    noStroke();

    // Draw enhanced petals
    this.drawPetals(energyGlow);

    // Draw center with lifecycle effects
    let centerSize = this.size / 3;
    fill(hue(currentColor) + 20, 80, 80, (energyGlow * lifecycleAlpha) / 100);
    ellipse(0, 0, centerSize);

    // Add center detail with lifecycle effects
    fill(hue(currentColor) + 40, 90, 90, (energyGlow * lifecycleAlpha) / 100);
    for (let i = 0; i < 12; i++) {
      let angle = (TWO_PI / 12) * i;
      let x = cos(angle) * centerSize * 0.2;
      let y = sin(angle) * centerSize * 0.2;
      ellipse(x, y, centerSize * 0.1);
    }

    pop();

    // Show health indicator when decaying
    if (this.state === LIFECYCLE_STATES.DECAYING) {
      push();
      translate(0, -this.height - 40);
      noStroke();
      fill(0, 80, 100, 30);
      rect(-20, -3, 40, 6, 3);
      fill(0, 80, 100);
      rect(-20, -3, map(this.health, 0, 100, 0, 40), 6, 3);
      pop();
    }

    // Enhanced energy indicator
    if (this.energy > 10) {
      push();
      translate(0, -this.height - 30);

      // Add glow effect
      for (let i = 3; i > 0; i--) {
        fill(60, 100, 100, (((this.energy * 2) / i) * lifecycleAlpha) / 100);
        ellipse(0, 0, (this.energy / 5) * i);
      }
      pop();
    }

    pop();
  }

  createParticles() {
    for (let i = 0; i < 5; i++) {
      particles.push(
        new Particle(
          this.x + random(-20, 20),
          this.y - this.height + random(-10, 10),
          this.color
        )
      );
    }
  }

  async playSound() {
    // Check if sound is enabled
    if (!soundEnabled) return;

    try {
      // Ensure Tone.js is running
      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      // Initialize synth if it doesn't exist
      if (!synths[this.flowerType]) {
        synths[this.flowerType] = new Tone.PolySynth(
          Tone.Synth
        ).toDestination();
        synths[this.flowerType].set({
          oscillator: { type: this.oscillatorType },
          envelope: { attack: 0.1, decay: 0.4, sustain: 0.1, release: 0.8 },
        });
      }

      // Play the sound
      let note =
        this.soundScale[Math.floor(this.energy / 20) % this.soundScale.length];
      let freq = Tone.Frequency(note, "midi").toFrequency();
      let volume = map(this.energy, 0, this.maxEnergy, -35, -15);

      synths[this.flowerType].volume.value = volume;
      await synths[this.flowerType].triggerAttackRelease(freq, "8n");
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  playAmbientChord() {
    // Check if sound is enabled
    if (!soundEnabled) return;

    if (ambientSynth) {
      const chords = [
        ["C4", "E4", "G4"],
        ["A3", "C4", "E4"],
        ["F3", "A3", "C4"],
        ["G3", "B3", "D4"],
      ];
      const chord = chords[Math.floor(random(chords.length))];
      ambientSynth.triggerAttackRelease(chord, "2n");
    }
  }

  isMouseOver() {
    let d = dist(mouseX, mouseY, this.x, this.y - this.height);
    return d < this.size;
  }

  isDead() {
    return this.state === LIFECYCLE_STATES.DEAD || this.health <= 0;
  }
}

// Particle class for visual effects
class Particle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-3, -1);
    this.life = 255;
    this.color = col;
    this.size = random(3, 8);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // gravity
    this.life -= 3;
  }

  draw() {
    push();
    fill(
      hue(this.color),
      saturation(this.color),
      brightness(this.color),
      this.life
    );
    noStroke();
    ellipse(this.x, this.y, this.size);
    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

// Global variables for weather
let currentWeather = null;
let weatherParticles = [];
let weatherSound;
let weatherReverb;

// Weather class to handle weather effects
class Weather {
  constructor(weatherData) {
    this.name = weatherData.name;
    this.type = weatherData.type;
    this.intensity = weatherData.intensity;
    this.colors = weatherData.colors;
    this.particleCount = weatherData.particleCount;
    this.duration = weatherData.duration * 1000; // Convert to milliseconds
    this.startTime = millis();
    this.active = true;
    this.windSpeed = weatherData.windSpeed;

    // Initialize weather sound
    this.initializeSound(weatherData);
  }

  async initializeSound(weatherData) {
    // Check if sound is enabled before creating weather sounds
    if (!soundEnabled) return;

    // Clean up existing sounds first
    if (this.noise) {
      this.noise.stop().dispose();
    }
    if (this.noiseFilter) {
      this.noiseFilter.dispose();
    }
    if (this.reverb) {
      this.reverb.dispose();
    }
    if (this.tremolo) {
      this.tremolo.dispose();
    }

    // Create noise source for weather ambience
    this.noise = new Tone.Noise("pink").start();

    // Create filter and effects
    this.noiseFilter = new Tone.Filter({
      type: "lowpass",
      frequency: 800,
      Q: 1,
    });

    this.reverb = new Tone.Reverb({
      decay: 2,
      wet: 0.5,
    });

    this.tremolo = new Tone.Tremolo({
      frequency: 0.5,
      depth: 0.5,
    }).start();

    // Set up effects chain
    this.noise.chain(
      this.noiseFilter,
      this.reverb,
      this.tremolo,
      Tone.Destination
    );

    // Configure based on weather type
    switch (weatherData.type) {
      case "rain":
        this.noise.type = "pink";
        this.noiseFilter.frequency.value = 2000;
        this.tremolo.frequency.value = 4;
        this.tremolo.depth.value = 0.2;
        break;

      case "wind":
        this.noise.type = "white";
        this.noiseFilter.frequency.value = 400;
        this.tremolo.frequency.value = 0.2;
        this.tremolo.depth.value = 0.8;
        break;

      case "storm":
        this.noise.type = "brown";
        this.noiseFilter.frequency.value = 600;
        this.tremolo.frequency.value = 1;
        this.tremolo.depth.value = 0.9;

        // Add thunder sounds
        this.thunder = new Tone.NoiseSynth({
          noise: {
            type: "brown",
          },
          envelope: {
            attack: 0.5,
            decay: 1.5,
            sustain: 0.5,
            release: 3,
          },
        }).toDestination();

        // Schedule random thunder
        this.thunderInterval = setInterval(() => {
          if (Math.random() < 0.3 && soundEnabled) {
            // 30% chance each interval and sound enabled
            this.thunder.triggerAttackRelease("4n");
          }
        }, 5000);
        break;

      case "fog":
        this.noise.type = "pink";
        this.noiseFilter.frequency.value = 200;
        this.tremolo.frequency.value = 0.1;
        this.tremolo.depth.value = 0.3;
        break;

      default:
        this.noise.type = "pink";
        break;
    }

    // Set initial volume and fade in
    this.noise.volume.value = -40;
    this.noise.volume.rampTo(weatherData.intensity * -20, 1);
  }

  update() {
    if (!this.active) return;

    // Check if weather effect should end
    if (millis() - this.startTime > this.duration) {
      this.end();
      return;
    }

    // Create new particles based on type and intensity
    const particlesToCreate = map(
      this.intensity,
      0.1,
      1,
      this.particleCount[0],
      this.particleCount[1]
    );

    for (let i = 0; i < particlesToCreate / 10; i++) {
      this.createParticle();
    }

    // Update global wind force based on weather
    windForce = map(this.windSpeed, 0, 50, 0, 2);
  }

  createParticle() {
    const color = random(this.colors);
    let particle;

    switch (this.type) {
      case "rain":
        particle = new WeatherParticle(
          random(width),
          random(-20, 0),
          color,
          2,
          10,
          0,
          random(10, 15) * this.intensity
        );
        break;
      case "snow":
        particle = new WeatherParticle(
          random(width),
          random(-20, 0),
          color,
          4,
          8,
          random(-1, 1) * this.intensity,
          random(2, 4)
        );
        break;
      case "wind":
        particle = new WeatherParticle(
          random(-20, 0),
          random(height),
          color,
          1,
          15,
          random(5, 10) * this.intensity,
          random(-1, 1)
        );
        break;
      default:
        particle = new WeatherParticle(
          random(width),
          random(-20, 0),
          color,
          3,
          6,
          random(-2, 2),
          random(2, 5)
        );
    }

    weatherParticles.push(particle);
  }

  end() {
    this.active = false;

    // Clear weather info
    document.querySelector(".weather-info").innerHTML = "";

    // Fade out noise
    if (this.noise) {
      this.noise.volume.rampTo(-Infinity, 1);
      setTimeout(() => {
        this.noise.stop();
        this.noiseFilter.dispose();
        this.reverb.dispose();
        this.tremolo.dispose();
        if (this.thunder) {
          clearInterval(this.thunderInterval);
          this.thunder.dispose();
        }
      }, 1100);
    }
  }
}

// Weather particle class
class WeatherParticle {
  constructor(x, y, color, size, life, vx, vy) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.vx = vx;
    this.vy = vy;
  }

  update() {
    this.x += this.vx + windForce;
    this.y += this.vy;
    this.life -= 0.1;
  }

  draw() {
    const alpha = map(this.life, 0, this.maxLife, 0, 255);
    fill(this.color[0], this.color[1], this.color[2], alpha);
    noStroke();
    ellipse(this.x, this.y, this.size);
  }

  isDead() {
    return this.life <= 0 || this.x < 0 || this.x > width || this.y > height;
  }
}

// Add to the draw function to render weather
function drawWeather() {
  if (currentWeather && currentWeather.active) {
    currentWeather.update();

    // Update and draw weather particles
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
      weatherParticles[i].update();
      weatherParticles[i].draw();
      if (weatherParticles[i].isDead()) {
        weatherParticles.splice(i, 1);
      }
    }
  }
}

// Function to trigger weather events
async function generateWeatherEvent() {
  const weatherBtn = document.querySelector(".weather-btn");
  const weatherInfoContainer = document.querySelector(
    ".weather-info-container"
  );
  const weatherInfoContent = document.querySelector("#weather-info-content");

  try {
    setLoadingState(weatherBtn, true);
    if (weatherInfoContent) {
      weatherInfoContent.classList.add("loading");
    }

    // Show the weather info panel
    if (weatherInfoContainer) {
      weatherInfoContainer.classList.remove("hidden");
    }

    const response = await fetch("/api/generate-weather", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to generate weather");
    }

    const weatherData = await response.json();

    // End current weather if it exists
    if (currentWeather && currentWeather.active) {
      currentWeather.end();
    }

    // Create new weather effect
    currentWeather = new Weather(weatherData);

    // Update info panel with weather description
    const infoHTML = `
      <h4>🌦️ Current Weather</h4>
      <div class="weather-details">
        <p><strong>${weatherData.name}</strong></p>
        <p>${weatherData.description}</p>
        <p>Impact: ${weatherData.impact}</p>
        <p>Duration: ${weatherData.duration} seconds</p>
      </div>
    `;
    if (weatherInfoContent) {
      weatherInfoContent.innerHTML = infoHTML;
    }
  } catch (error) {
    console.error("Error generating weather:", error);
    alert("Error generating weather. Please try again.");
  } finally {
    setLoadingState(weatherBtn, false);
    if (weatherInfoContent) {
      weatherInfoContent.classList.remove("loading");
    }
  }
}

// Function to generate an exotic plant using AI
async function generateExoticPlant() {
  const aiPlantBtn = document.querySelector(
    'button[onclick="generateExoticPlant()"]'
  );
  const aiInfo = document.querySelector(".ai-info");

  try {
    setLoadingState(aiPlantBtn, true);
    aiInfo.classList.add("loading");

    const response = await fetch("/api/generate-plant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        console.log(
          "Rate limit exceeded, falling back to random plant generation"
        );
        // Show a notification in the AI info panel
        const infoHTML = `
          <h4>🌺 AI Plant Generation Limited</h4>
          <div class="plant-info">
            <p>AI generation is temporarily unavailable (rate limit reached). Creating a random garden flower instead.</p>
            <p>Please try AI generation again in ${Math.ceil(
              errorData.retryAfter || 60
            )} seconds.</p>
          </div>
        `;
        document.querySelector(".ai-info").innerHTML = infoHTML;

        // Create a basic random plant instead
        const flowerTypes = Object.keys(FLOWER_TYPES);
        const randomType = flowerTypes[Math.floor(random(flowerTypes.length))];
        const randomFlower = FLOWER_TYPES[randomType];
        return {
          name: randomType,
          colors: randomFlower.colors,
          petals: randomFlower.petals,
          size: randomFlower.size,
          height: randomFlower.height,
          scale: randomFlower.scale,
          oscillator: randomFlower.oscillator,
          layerCount: randomFlower.layerCount || 1,
          growthPattern: randomFlower.growthPattern || "symmetrical",
          description:
            "A beautiful garden flower (using existing flower type while AI is unavailable)",
          lifespan: 120,
          maturityAge: 30,
          growthRate: 1.0,
          resilience: 5,
        };
      }
      throw new Error("Failed to generate plant");
    }

    const plantData = await response.json();
    // If it's a single plant response
    const plantsToAdd = plantData.plants || [plantData];

    if (plantsToAdd.length === 0) {
      alert("No plants were generated. Please try again.");
      return null;
    }

    // Track successfully added plants for the info panel
    let addedPlants = [];

    // Process each plant in the response
    plantsToAdd.forEach((plantData) => {
      if (!plantData || !plantData.name) {
        console.error("Invalid plant data received:", plantData);
        return;
      }

      const plantType = plantData.name.toLowerCase();

      // Add the new flower type to FLOWER_TYPES if it doesn't exist
      if (!FLOWER_TYPES[plantType]) {
        FLOWER_TYPES[plantType] = {
          colors: plantData.colors,
          petals: plantData.petals,
          size: plantData.size,
          height: plantData.height,
          scale: plantData.scale,
          oscillator: plantData.oscillator,
          layerCount: plantData.layerCount,
          growthPattern: plantData.growthPattern,
          depthOffset: plantData.depthOffset,
          stemStyle: plantData.stemStyle,
          stemRadius: plantData.stemRadius,
          petalShape: plantData.petalShape,
          leafPattern: plantData.leafPattern,
          flowerType: plantData.flowerType,
          seasonalBehavior: plantData.seasonalBehavior,
          pollinatorAttractant: plantData.pollinatorAttractant,
        };
      }

      // Try to add the plant if there's room
      if (plants.length < 1000) {
        // Define safe margins for plant placement
        const marginX = 50;
        const marginY = 100;

        // Generate a random position within safe margins
        let x = random(marginX, width - marginX);
        let y = height - marginY + random(-30, 30); // Keep plants near ground level with some variation

        // Check if position is far enough from existing plants
        const minDistance = 50; // Minimum distance between plants
        let validPosition = true;

        // Try to find a spot that's not too close to other plants
        const plantsToCheck = Math.min(plants.length, 20);
        for (let i = 0; i < plantsToCheck; i++) {
          const randomIndex = Math.floor(random(plants.length));
          const existingPlant = plants[randomIndex];
          const d = dist(x, y, existingPlant.x, existingPlant.y);
          if (d < minDistance) {
            validPosition = false;
            break;
          }
        }

        // If position is not valid, adjust it
        if (!validPosition && plants.length > 10) {
          x = random(marginX, width - marginX);
          y = height - marginY + random(-40, 40);
        }

        // Create the plant with the full AI data
        plants.push(new Plant(x, y, null, plantData));
        addedPlants.push(plantData);
      }
    });

    if (addedPlants.length === 0) {
      alert("Garden is full! Remove some plants first.");
    } else {
      // Update AI info panel with descriptions of added plants
      const infoHTML = `
        <h4>🤖 AI Generated Plants</h4>
        ${addedPlants
          .map(
            (plant) => `
          <div class="plant-info">
            <p><strong>New Plant Generated:</strong> ${plant.name}</p>
            <p>${plant.description}</p>
          </div>
        `
          )
          .join("")}
      `;
      document.querySelector(".ai-info").innerHTML = infoHTML;
    }

    const result = plantsToAdd[0]; // Store the first plant for backwards compatibility

    // Always clean up loading state
    if (aiPlantBtn) setLoadingState(aiPlantBtn, false);
    if (aiInfo) aiInfo.classList.remove("loading");

    return result;
  } catch (error) {
    console.error("Error generating exotic plant:", error);
    alert("Error generating plant. Please try again.");
  } finally {
    // Double-check cleanup of loading states
    if (aiPlantBtn) setLoadingState(aiPlantBtn, false);
    if (aiInfo) aiInfo.classList.remove("loading");
  }
}

// Function to generate and display a psychedelic rainbow
window.generatePsychedelicRainbow = async function () {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }
  if (!rainbowPlantBtn) {
    console.error("Rainbow button not initialized!");
    return;
  }
  setLoadingState(rainbowPlantBtn, true);

  try {
    const response = await fetch("/api/generate-rainbow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error || "Failed to generate rainbow");
      return;
    }

    const rainbowData = await response.json();
    console.log("Psychedelic Rainbow Data:", rainbowData);
    // Ensure visualProperties and its nested properties exist before accessing
    if (rainbowData.visualProperties && rainbowData.visualProperties.colors) {
      console.log(
        "Rainbow Colors from AI:",
        rainbowData.visualProperties.colors
      );
    } else {
      console.warn(
        "Visual properties or colors missing in rainbowData:",
        rainbowData
      );
      // Provide default colors or handle error appropriately
      // For now, let's ensure rainbowData.visualProperties.colors is an empty array if missing
      if (!rainbowData.visualProperties) rainbowData.visualProperties = {};
      if (!rainbowData.visualProperties.colors)
        rainbowData.visualProperties.colors = [];
    }
    activeRainbows.push(new PsychedelicRainbow(rainbowData));

    // Update UI or info panel if needed
    const infoHTML = `
      <h4>🌈 Psychedelic Rainbow Generated!</h4>
      <div class="rainbow-info">
        <p><strong>Name:</strong> ${rainbowData.name || "N/A"}</p>
        <p>${rainbowData.description || "No description."}</p>
        <p><strong>Soundscape:</strong> ${
          rainbowData.soundProperties
            ? rainbowData.soundProperties.soundscapeName
            : "N/A"
        }</p>
      </div>
    `;
    // Prepend to aiInfo or a dedicated rainbow info panel
    const currentInfo = document.querySelector(".ai-info").innerHTML;
    document.querySelector(".ai-info").innerHTML = infoHTML + currentInfo;
  } catch (error) {
    console.error("Error generating psychedelic rainbow:", error);
    alert("Error generating rainbow. Please check console.");
  } finally {
    setLoadingState(rainbowPlantBtn, false);
  }
};

// Function to generate and display a psychedelic aurora borealis
window.generatePsychedelicAurora = async function () {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }
  if (!auroraPlantBtn) {
    console.error("Aurora button not initialized!");
    return;
  }
  setLoadingState(auroraPlantBtn, true);

  try {
    console.log("Fetching aurora data...");
    const response = await fetch("/api/generate-aurora", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error || "Failed to generate aurora");
      return;
    }

    const auroraData = await response.json();
    console.log("Psychedelic Aurora Data:", auroraData);

    // Ensure visualProperties and its nested properties exist before accessing
    if (auroraData.visualProperties && auroraData.visualProperties.colors) {
      console.log("Aurora Colors from AI:", auroraData.visualProperties.colors);
    } else {
      console.warn(
        "Visual properties or colors missing in auroraData:",
        auroraData
      );
      // Provide default colors or handle error appropriately
      if (!auroraData.visualProperties) auroraData.visualProperties = {};
      if (!auroraData.visualProperties.colors)
        auroraData.visualProperties.colors = [];
    }

    activeAuroras.push(new PsychedelicAurora(auroraData));

    // Update UI or info panel if needed
    const infoHTML = `
      <h4>🌌 Psychedelic Aurora Generated!</h4>
      <div class="aurora-info">
        <p><strong>Name:</strong> ${auroraData.name || "N/A"}</p>
        <p>${auroraData.description || "No description."}</p>
        <p><strong>Soundscape:</strong> ${
          auroraData.soundProperties
            ? auroraData.soundProperties.soundscapeName
            : "N/A"
        }</p>
      </div>
    `;
    // Prepend to aiInfo or a dedicated aurora info panel
    const currentInfo = document.querySelector(".ai-info").innerHTML;
    document.querySelector(".ai-info").innerHTML = infoHTML + currentInfo;
  } catch (error) {
    console.error("Error generating psychedelic aurora:", error);
    alert("Error generating aurora. Please check console.");
  } finally {
    setLoadingState(auroraPlantBtn, false);
  }
};

class PsychedelicAurora {
  constructor(data) {
    this.data = data; // Contains visualProperties and soundProperties
    this.startTime = millis();
    this.alive = true;
    this.isHovered = false;
    this.soundPlaying = false;

    // Define default aurora colors - typical aurora borealis colors
    this.defaultAuroraColors = [
      [80, 255, 120], // Bright Green (most common aurora color)
      [120, 255, 180], // Cyan-Green
      [180, 120, 255], // Purple
      [255, 80, 180], // Magenta
      [80, 180, 255], // Blue
      [255, 255, 80], // Yellow (rare but spectacular)
      [255, 120, 80], // Red (high altitude aurora)
    ];

    // Aurora-specific visual properties
    this.waveCount = this.data.visualProperties?.waveCount || 5;
    this.waveHeight = (this.data.visualProperties?.waveHeight || 0.6) * height;
    this.flowPattern =
      this.data.visualProperties?.flowPattern || "flowing_waves";
    this.intensity = this.data.visualProperties?.intensity || 0.8;
    this.shimmerSpeed = this.data.visualProperties?.shimmerSpeed || 1.5;

    // Position aurora in upper portion of sky
    this.baseY = height * 0.2; // Start in upper 20% of screen
    this.maxY = height * 0.7; // Extend down to 70% of screen

    // Create flowing wave patterns for aurora
    this.waves = [];
    for (let i = 0; i < this.waveCount; i++) {
      this.waves.push({
        yOffset: this.baseY + (i * this.waveHeight) / this.waveCount,
        frequency: 0.003 + i * 0.001,
        amplitude: 20 + i * 15,
        phase: i * PI * 0.3,
      });
    }

    // Initialize sound
    const validOscillatorTypes = ["sine", "triangle", "square", "sawtooth"];
    let requestedOscillatorType =
      this.data.soundProperties && this.data.soundProperties.oscillatorType
        ? this.data.soundProperties.oscillatorType
        : "sine";

    // Validate oscillator type and fallback to sine if invalid
    const oscillatorType = validOscillatorTypes.includes(
      requestedOscillatorType
    )
      ? requestedOscillatorType
      : "sine";

    if (requestedOscillatorType !== oscillatorType) {
      console.warn(
        `Invalid oscillator type '${requestedOscillatorType}', using 'sine' instead`
      );
    }
    const durationSeconds =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds
        : 30;
    const reverbMix =
      this.data.soundProperties && this.data.soundProperties.reverbMix
        ? this.data.soundProperties.reverbMix
        : 0.7;

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: oscillatorType,
      },
      envelope: {
        attack: 1.0,
        decay: 2.0,
        sustain: 0.6,
        release: 3.0,
      },
      volume: -15,
    });

    this.reverb = new Tone.Reverb(durationSeconds * 0.6).toDestination();
    this.reverb.wet.value = reverbMix;
    this.synth.connect(this.reverb);

    // Don't play sound automatically - only on hover
  }

  // Check if mouse is hovering over the aurora
  isMouseOver(mouseX, mouseY) {
    // Aurora covers the upper portion of the screen
    return mouseY >= this.baseY && mouseY <= this.maxY;
  }

  // Start playing sound on hover
  startHoverSound() {
    if (!soundEnabled || this.soundPlaying) return;
    this.soundPlaying = true;
    this.playEtherealSound();
  }

  // Stop sound when hover ends
  stopHoverSound() {
    if (this.synth && this.soundPlaying) {
      this.synth.releaseAll();
      this.soundPlaying = false;
    }
  }

  // Update hover state
  updateHover(mouseX, mouseY) {
    const wasHovered = this.isHovered;
    this.isHovered = this.isMouseOver(mouseX, mouseY);

    if (this.isHovered && !wasHovered) {
      this.startHoverSound();
    } else if (!this.isHovered && wasHovered) {
      this.stopHoverSound();
    }
  }

  playEtherealSound() {
    if (!soundEnabled) return;
    const now = Tone.now();

    // Ensure soundProperties and its nested properties exist
    const baseFrequency =
      this.data.soundProperties && this.data.soundProperties.baseFrequency
        ? this.data.soundProperties.baseFrequency
        : 150;
    const harmonicComplexity =
      this.data.soundProperties && this.data.soundProperties.harmonicComplexity
        ? this.data.soundProperties.harmonicComplexity
        : 2.5;
    const durationSeconds =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds * 0.8
        : 24;

    // Create ethereal, spacious aurora soundscape
    const etherealIntervals = [1, 1.5, 2, 2.5, 3, 4, 5, 6];
    const numTones = Math.min(6, Math.floor(harmonicComplexity * 2));

    for (let i = 0; i < numTones; i++) {
      const intervalIndex = i % etherealIntervals.length;
      const freq = baseFrequency * etherealIntervals[intervalIndex];

      // Add subtle detuning for organic feel
      const detune = (Math.random() - 0.5) * 0.02;
      const finalFreq = freq * (1 + detune);

      // Velocity decreases with each harmonic
      const velocity = Math.max(0.05, 0.3 - i * 0.04);

      // Stagger timing for flowing effect
      const delay = i * (0.1 + Math.random() * 0.15);

      this.synth.triggerAttackRelease(
        finalFreq,
        durationSeconds,
        now + delay,
        velocity
      );
    }
  }

  update() {
    const durationSeconds =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds
        : 30;
    if (millis() - this.startTime > durationSeconds * 1000) {
      this.alive = false;
      this.disposeSound();
    }
  }

  display() {
    if (!this.alive) return;

    const durationSeconds =
      this.data.soundProperties && this.data.soundProperties.durationSeconds
        ? this.data.soundProperties.durationSeconds
        : 30;

    const elapsedTime = (millis() - this.startTime) / 1000;
    const progress = elapsedTime / durationSeconds;
    if (progress > 1) return;

    // Use AI-generated colors or default aurora colors
    const colors =
      this.data.visualProperties &&
      this.data.visualProperties.colors &&
      this.data.visualProperties.colors.length > 0
        ? this.data.visualProperties.colors
        : this.defaultAuroraColors;

    // Base alpha with gradual fade
    const baseAlpha = 150 * (1 - progress * 0.4) * this.intensity;

    push();

    // Apply flow pattern transformations
    if (this.flowPattern === "breathing_veils") {
      const breath = 0.95 + sin(elapsedTime * PI * 0.3) * 0.05;
      scale(1, breath);
    } else if (this.flowPattern === "spiral_vortex") {
      translate(width / 2, height / 2);
      rotate(elapsedTime * 0.1);
      translate(-width / 2, -height / 2);
    }

    // Draw aurora waves
    for (let waveIndex = 0; waveIndex < this.waves.length; waveIndex++) {
      const wave = this.waves[waveIndex];
      const colorIndex = waveIndex % colors.length;
      const color = colors[colorIndex];

      let currentAlpha = baseAlpha;

      // Apply shimmer effects
      if (this.flowPattern === "rippling_sheets") {
        currentAlpha *= 0.7 + noise(elapsedTime * 2 + waveIndex * 0.5) * 0.3;
      } else if (this.flowPattern === "dancing_curtains") {
        currentAlpha *=
          0.8 +
          sin(elapsedTime * PI * this.shimmerSpeed + waveIndex * 0.6) * 0.2;
      }

      // Enhance on hover
      if (this.isHovered) {
        currentAlpha *= 1.2;
      }

      // Set stroke color
      noFill();
      if (Array.isArray(color) && color.length >= 3) {
        stroke(color[0], color[1], color[2], max(0, currentAlpha));
      } else {
        stroke(0, 255, 100, max(0, currentAlpha)); // Default to green
      }
      strokeWeight(3 + waveIndex * 0.5);

      // Draw flowing wave using beginShape/endShape for smooth curves
      beginShape();
      noFill();

      for (let x = 0; x <= width; x += 10) {
        // Create flowing wave pattern
        let y = wave.yOffset;

        // Add primary wave motion
        y += sin(x * wave.frequency + wave.phase) * wave.amplitude;

        // Add secondary motion for more organic feel
        y +=
          sin(x * wave.frequency * 2 + wave.phase * 1.5) *
          (wave.amplitude * 0.3);

        // Add shimmer effect
        y += sin(x * 0.01 + elapsedTime * this.shimmerSpeed) * 10;

        // Apply flow pattern-specific modifications
        if (this.flowPattern === "flowing_waves") {
          y += sin(x * 0.005 + elapsedTime * 0.5) * 15;
        } else if (this.flowPattern === "dancing_curtains") {
          y += cos(x * 0.008 + elapsedTime + waveIndex) * 20;
        }

        vertex(x, y);
      }
      endShape();

      // Add complementary wave below for fullness
      if (waveIndex < 3) {
        stroke(color[0], color[1], color[2], max(0, currentAlpha * 0.6));
        strokeWeight(2);
        beginShape();
        noFill();
        for (let x = 0; x <= width; x += 15) {
          let y = wave.yOffset + 20;
          y +=
            sin(x * wave.frequency + wave.phase + PI) * (wave.amplitude * 0.7);
          y += sin(x * 0.008 + elapsedTime * this.shimmerSpeed * 0.8) * 8;
          vertex(x, y);
        }
        endShape();
      }
    }

    // Add particle effects for extra magic
    if (this.isHovered) {
      this.drawAuroraParticles(elapsedTime);
    }

    pop();
  }

  // Draw floating particles for magical aurora effect
  drawAuroraParticles(elapsedTime) {
    const colors =
      this.data.visualProperties?.colors || this.defaultAuroraColors;

    push();
    for (let i = 0; i < 12; i++) {
      const x = noise(elapsedTime * 0.3 + i * 0.1) * width;
      const y =
        this.baseY + noise(elapsedTime * 0.2 + i * 0.15) * this.waveHeight;

      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      const particleAlpha = 100 + sin(elapsedTime * 3 + i) * 50;

      if (Array.isArray(color) && color.length >= 3) {
        fill(color[0], color[1], color[2], max(0, particleAlpha));
      } else {
        fill(0, 255, 100, max(0, particleAlpha));
      }
      noStroke();

      const size = 2 + sin(elapsedTime * 2 + i) * 1;
      ellipse(x, y, size);
    }
    pop();
  }

  disposeSound() {
    if (this.synth) {
      this.synth.releaseAll();
      this.synth.dispose();
      this.synth = null;
    }
    if (this.reverb) {
      this.reverb.dispose();
      this.reverb = null;
    }
  }
}
