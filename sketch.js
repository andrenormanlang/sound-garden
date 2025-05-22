// Global variables
let plants = [];
let particles = [];
let synths = {};
let lastInteraction = 0;
let backgroundHue = 220;
let windForce = 0;
let ambientSynth;
let eraserMode = false;

// Initialize Tone.js and setup ambient synth
window.onload = () => {
  ambientSynth = new Tone.PolySynth({
    voice: Tone.FMSynth,
    options: {
      envelope: {
        attack: 0.5,
        decay: 0.5,
        sustain: 0.5,
        release: 1,
      },
    },
  }).toDestination();
  ambientSynth.volume.value = -20;
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
    });

    if (!response.ok) {
      throw new Error("Failed to generate plant");
    }

    const plantData = await response.json();
    const plantType = plantData.name.toLowerCase();

    // Add the new flower type to FLOWER_TYPES
    FLOWER_TYPES[plantType] = {
      colors: plantData.colors.map((color) => color), // Copy the color array
      petals: plantData.petals,
      size: plantData.size,
      height: plantData.height,
      scale: plantData.scale,
      oscillator: plantData.oscillator,
      layerCount: plantData.layerCount,
      growthPattern: plantData.growthPattern,
      depthOffset: plantData.depthOffset,
    };

    // Create a new plant with the exotic type
    if (plants.length < 20) {
      let x = random(100, width - 100);
      let y = height - 50;
      plants.push(new Plant(x, y, plantData.name.toLowerCase()));

      // Update AI info panel with description
      document.querySelector(".ai-info").innerHTML = `
        <h4>🤖 AI Generated Plants</h4>
        <p><strong>New Plant Generated:</strong> ${plantData.name}</p>
        <p>${plantData.description}</p>
      `;
    } else {
      alert("Garden is full! Remove some plants first.");
    }

    return plantData;
  } catch (error) {
    console.error("Error generating exotic plant:", error);
    alert("Error generating plant. Please try again.");
    return null;
  }
};

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
};

// Plant class with improved drawing methods
class Plant {
  constructor(x, y, flowerType = null) {
    this.x = x;
    this.y = y;
    this.energy = 0;
    this.maxEnergy = 100;
    this.lastSoundTime = 0;

    // Select random flower type if not specified
    const flowerKeys = Object.keys(FLOWER_TYPES);
    this.flowerType =
      flowerType || flowerKeys[Math.floor(Math.random() * flowerKeys.length)];
    this.flowerData = FLOWER_TYPES[this.flowerType];

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

    // Adjusted y position for depth
    this.y = y + this.depthOffset * 2;

    // Enhanced animation properties
    this.petalRotations = Array(this.layerCount).fill(0);
    this.petalSpeeds = Array(this.layerCount)
      .fill(0)
      .map(() => random(-0.002, 0.002));
    this.bloomPhases = Array(this.layerCount).fill(0);

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
  }

  interact() {
    if (millis() - this.lastSoundTime > 300) {
      this.playSound();
      this.createParticles();
      this.lastSoundTime = millis();

      // Occasionally play ambient chord when plants are very active
      if (this.energy > 80 && random() < 0.1) {
        this.playAmbientChord();
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

    // Apply depth effects
    let depthAlpha = map(this.depthOffset, 0, 100, 100, 60);
    let sway =
      sin(this.oscillation) * (this.energy / 20) + windForce * this.depthScale;

    // Draw stem with enhanced thickness
    stroke(120, 60, 40, depthAlpha);
    strokeWeight(map(this.height, 30, 400, 3, 12) * this.depthScale);
    line(0, 0, sway * 8, -this.height);

    // Draw branches and leaves
    this.drawBranches(sway);

    // Draw flower head
    push();
    translate(sway * 8, -this.height);

    let energyGlow = map(this.energy, 0, this.maxEnergy, 0, 100);

    // Add shadow for depth
    noStroke();
    fill(0, 0, 0, 20);
    ellipse(5, 5, this.size * 0.8);

    fill(
      hue(this.color),
      saturation(this.color),
      brightness(this.color),
      70 + energyGlow
    );
    noStroke();

    // Draw enhanced petals
    this.drawPetals(energyGlow);

    // Draw center with more detail
    let centerSize = this.size / 3;
    fill(hue(this.color) + 20, 80, 80, energyGlow);
    ellipse(0, 0, centerSize);

    // Add center detail
    fill(hue(this.color) + 40, 90, 90, energyGlow);
    for (let i = 0; i < 12; i++) {
      let angle = (TWO_PI / 12) * i;
      let x = cos(angle) * centerSize * 0.2;
      let y = sin(angle) * centerSize * 0.2;
      ellipse(x, y, centerSize * 0.1);
    }

    pop();

    // Enhanced energy indicator
    if (this.energy > 10) {
      push();
      translate(0, -this.height - 30);

      // Add glow effect
      for (let i = 3; i > 0; i--) {
        fill(60, 100, 100, (this.energy * 2) / i);
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

  playSound() {
    if (!synths[this.flowerType]) {
      synths[this.flowerType] = new Tone.PolySynth({
        voice: Tone.Synth,
        options: {
          oscillator: { type: this.oscillatorType },
          envelope: { attack: 0.1, decay: 0.4, sustain: 0.1, release: 0.8 },
        },
      }).toDestination();
    }

    let note =
      this.soundScale[Math.floor(this.energy / 20) % this.soundScale.length];
    let freq = Tone.Frequency(note, "midi").toFrequency();
    let volume = map(this.energy, 0, this.maxEnergy, -35, -15);

    synths[this.flowerType].volume.value = volume;
    synths[this.flowerType].triggerAttackRelease(freq, "8n");
  }

  playAmbientChord() {
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

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // Initialize plants after first user interaction
  document.addEventListener("click", initializeAudioAndPlants, { once: true });
}

function initializeAudioAndPlants() {
  // Start Tone.js
  Tone.start();

  // Initialize ambient synth
  ambientSynth = new Tone.PolySynth(Tone.Synth).toDestination();
  ambientSynth.volume.value = -20;

  // Create initial plants with depth
  const flowerTypes = Object.keys(FLOWER_TYPES);

  // Create plants in layers for depth
  for (let layer = 0; layer < 4; layer++) {
    let plantsInLayer = map(layer, 0, 3, 6, 2); // More plants in front, fewer in back

    for (let i = 0; i < plantsInLayer; i++) {
      let x = random(50, width - 50);
      let y = height - 50;
      let randomType = flowerTypes[Math.floor(random(flowerTypes.length))];
      let plant = new Plant(x, y, randomType);

      // Add depth offset based on layer
      plant.depthOffset = layer * 25; // 0-75 depth range
      plants.push(plant);
    }
  }
}

function draw() {
  background(backgroundHue, 20, 15);

  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i] && typeof particles[i].update === "function") {
      particles[i].update();
      particles[i].draw();
      if (particles[i].isDead()) {
        particles.splice(i, 1);
      }
    }
  }

  // Update and draw plants
  for (let plant of plants) {
    plant.update();
    plant.draw();
  }

  // Draw eraser mode indicator
  if (eraserMode) {
    push();
    noFill();
    stroke(0, 100, 100, 80);
    strokeWeight(2);
    let size = 30;
    translate(mouseX, mouseY);
    line(-size / 2, -size / 2, size / 2, size / 2);
    line(-size / 2, size / 2, size / 2, -size / 2);
    ellipse(0, 0, size, size);
    pop();
  }

  // Update background and wind
  backgroundHue = (backgroundHue + 0.1) % 360;
  windForce = sin(frameCount * 0.01) * 0.5;
}

function mousePressed() {
  // Initialize audio context on first click
  if (Tone.context.state !== "running") {
    Tone.start();
  }

  if (eraserMode) {
    // Remove plant if clicking on it in eraser mode
    for (let i = plants.length - 1; i >= 0; i--) {
      if (plants[i].isMouseOver()) {
        plants.splice(i, 1);
        break;
      }
    }
  } else {
    // Add energy to nearby plants on click (existing behavior)
    for (let plant of plants) {
      let d = dist(mouseX, mouseY, plant.x, plant.y);
      if (d < 100) {
        plant.energy = plant.maxEnergy;
        plant.interact();
      }
    }
  }
}

function keyPressed() {
  if (key === "e" || key === "E") {
    // Toggle eraser mode
    eraserMode = !eraserMode;
    document.body.style.cursor = eraserMode ? "crosshair" : "default";
  } else if (key === "c" || key === "C") {
    // Clear all plants
    plants = [];
    particles = [];
  }
}

// Simplify addRandomPlant function
function addRandomPlant() {
  if (plants.length < 20) {
    const flowerTypes = Object.keys(FLOWER_TYPES);
    let x = random(100, width - 100);
    let y = height - 50;
    let randomType = flowerTypes[Math.floor(random(flowerTypes.length))];
    plants.push(new Plant(x, y, randomType));
  }
}

function resetGarden() {
  plants = [];
  particles = [];

  const flowerTypes = Object.keys(FLOWER_TYPES);
  for (let i = 0; i < 12; i++) {
    let x = random(100, width - 100);
    let y = height - 50;
    let randomType = flowerTypes[Math.floor(random(flowerTypes.length))];
    plants.push(new Plant(x, y, randomType));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
