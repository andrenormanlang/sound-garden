// Global variables
let plants = [];
let particles = [];
let synths = {};
let aiMode = false;
let aiPatterns = [];
let lastInteraction = 0;
let backgroundHue = 220;
let windForce = 0;
let ambientSynth;

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

    this.branches = [];
    this.createBranches();

    // Animation properties
    this.petalRotation = 0;
    this.bloomPhase = 0;
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

    // AI behavior
    if (aiMode && this.energy > 50) {
      this.generateAIBehavior();
    }

    this.oscillation += this.frequency;
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

  draw() {
    push();
    translate(this.x, this.y);

    // Plant stem with wind effect
    let sway = sin(this.oscillation) * (this.energy / 20) + windForce;

    // Draw stem
    stroke(120, 60, 40);
    strokeWeight(map(this.height, 30, 150, 3, 8));
    line(0, 0, sway * 8, -this.height);

    // Draw branches and leaves
    this.drawBranches(sway);

    // Draw flower head
    push();
    translate(sway * 8, -this.height);

    let energyGlow = map(this.energy, 0, this.maxEnergy, 0, 100);
    fill(
      hue(this.color),
      saturation(this.color),
      brightness(this.color),
      70 + energyGlow
    );
    noStroke();

    // Draw petals
    for (let i = 0; i < this.petals; i++) {
      let angle = (TWO_PI / this.petals) * i;
      push();
      rotate(angle + this.petalRotation);
      ellipse(0, -this.size / 3, this.size / 4, this.size / 2);
      pop();
    }

    // Draw center
    fill(hue(this.color) + 20, 80, 80, energyGlow);
    ellipse(0, 0, this.size / 3);
    pop();

    // Energy indicator
    if (this.energy > 10) {
      push();
      translate(0, -this.height - 30);
      fill(60, 100, 100, this.energy * 2);
      noStroke();
      ellipse(0, 0, this.energy / 5);
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

  generateAIBehavior() {
    if (random() < 0.1) {
      let harmonicNote =
        this.soundScale[Math.floor(random(this.soundScale.length))];
      let harmony = new Tone.Oscillator(
        Tone.Frequency(harmonicNote, "midi").toFrequency(),
        "triangle"
      );
      harmony.toDestination();
      harmony.start();
      harmony.stop("+0.5");
    }
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

  // Create initial plants
  const flowerTypes = Object.keys(FLOWER_TYPES);
  for (let i = 0; i < 12; i++) {
    let x = random(100, width - 100);
    let y = height - 50;
    let randomType = flowerTypes[Math.floor(random(flowerTypes.length))];
    plants.push(new Plant(x, y, randomType));
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

  // Update background and wind
  backgroundHue = (backgroundHue + 0.1) % 360;
  windForce = sin(frameCount * 0.01) * 0.5;
}

function mousePressed() {
  // Initialize audio context on first click
  if (Tone.context.state !== "running") {
    Tone.start();
  }

  // Add energy to nearby plants on click
  for (let plant of plants) {
    let d = dist(mouseX, mouseY, plant.x, plant.y);
    if (d < 100) {
      plant.energy = plant.maxEnergy;
      plant.interact();
    }
  }
}

function toggleAI() {
  aiMode = !aiMode;
  document.getElementById("ai-status").textContent = `AI Mode: ${
    aiMode ? "ON" : "OFF"
  }`;
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

function addRandomPlant() {
  if (plants.length < 20) {
    const flowerTypes = Object.keys(FLOWER_TYPES);
    let x = random(100, width - 100);
    let y = height - 50;
    let randomType = flowerTypes[Math.floor(random(flowerTypes.length))];
    plants.push(new Plant(x, y, randomType));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
