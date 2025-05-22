// sketch.js

// FLOWER_TYPES is now globally available from config.js

// Global variables
let plants = [];
let particles = []; // Will hold Particle3D instances
let currentlyHoveredPlant = null; // For hover interaction
let backgroundHue = 220;
let windForce = 0;
let eraserMode = false;
let audioInitialized = false;
let MAX_PLANTS = CONFIG.PLANT_CONFIG.MAX_PLANTS;

// Initialize audio context and setup synth
let initializationAttempts = 0;
const MAX_ATTEMPTS = 5;
let synth;

// Initialize garden function that will be called after user interaction
window.initializeGarden = async function () {
  if (audioInitialized) return;

  try {
    // Start audio context first
    await userStartAudio();

    // Initialize synth after audio context is started
    synth = new p5.PolySynth();
    audioInitialized = true;
    console.log("Audio initialization complete");

    // Add initial plants
    for (let i = 0; i < 3; i++) {
      addRandomPlant();
    }
  } catch (error) {
    console.error("Error initializing garden:", error);
  }
};

window.setup = function () {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100); // HSB with alpha 0-100
  angleMode(RADIANS);

  lights(); // Basic lighting
  ambientLight(60, 60, 60);
  directionalLight(255, 255, 255, 0.5, 1, -1);

  camera(0, -200, height / 2.0 / tan((PI * 30.0) / 180.0), 0, 0, 0, 0, 1, 0);
  console.log("p5.js setup complete");

  // Attempt to initialize audio early if possible, but user interaction is key
  // The main click listener for audio start is inside initializeGarden itself.
  document.addEventListener("click", initializeGarden, { once: true });
  document.addEventListener("touchstart", initializeGarden, { once: true });
};

window.draw = function () {
  background(backgroundHue, 20, 15);
  orbitControl();

  ambientLight(80, 80, 80);
  directionalLight(250, 250, 230, 0.5, 0.8, -1);
  pointLight(150, 150, 200, 0, -height / 2 + 100, 200);

  push();
  translate(0, height / 3 + 50, 0);
  rotateX(HALF_PI);
  noStroke();
  fill(230, 40, 15, 80); // ambientMaterial can be problematic, using fill
  plane(width * 2, width * 2);
  pop();

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  plants.sort((a, b) => a.pos.z - b.pos.z);
  for (let i = plants.length - 1; i >= 0; i--) {
    plants[i].update();
    plants[i].display();
  }

  if (eraserMode) {
    // Eraser HUD (simplified for brevity, use your original if preferred)
    push();
    let cam = p5.instance._renderer._curCamera;
    cam.ortho(
      0,
      width,
      -height,
      0,
      cam.defaultCameraNear,
      cam.defaultCameraFar
    );
    resetMatrix();
    translate(mouseX - width / 2, mouseY - height / 2, 0); // Adjust mouse for ortho
    noFill();
    stroke(0, 100, 100, 80);
    strokeWeight(3);
    ellipse(0, 0, 40, 40);
    line(-10, -10, 10, 10);
    line(-10, 10, 10, -10);
    cam.perspective(
      PI / 3.0,
      width / height,
      cam.defaultCameraNear,
      cam.defaultCameraFar
    );
    pop();
  }

  backgroundHue = (backgroundHue + 0.03) % 360;
  windForce = sin(frameCount * 0.005) * 0.6;
};

window.generateExoticPlant = async function () {
  if (!audioInitialized) await initializeGarden();
  if (!audioInitialized) {
    console.warn("Audio not initialized, cannot generate AI plant yet.");
    return;
  }
  try {
    const response = await fetch("/api/generate-plant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const plantData = await response.json();
    console.log("Received AI plant data:", plantData);
    if (plants.length < MAX_PLANTS) {
      const x = random(-width / 3, width / 3);
      const z = random(-width / 3, width / 3); // Use width for z range too for squarish area
      const plant = new Plant3D(
        x,
        0,
        z,
        plantData.name || "AI Plant",
        plantData
      );
      plants.push(plant);
      console.log(`Added new AI plant: ${plant.type}`);
    } else {
      alert("Garden is full! Remove some plants first.");
    }
  } catch (error) {
    console.error("Error generating AI plant:", error);
    alert("Failed to generate AI plant. Check console for details.");
  }
};

window.resetGarden = function () {
  plants.forEach((plant) => {
    if (plant.synth) plant.synth.dispose();
  });
  plants = [];
  particles = [];
  console.log("Garden cleared");
};

window.addRandomPlant = function () {
  if (!audioInitialized && plants.length > 0) {
    // Allow initial plants before audio is fully on
    // This case is tricky. For now, let's assume audio should be on for new plants.
  } else if (!audioInitialized) {
    initializeGarden().then(() => {
      // Try to init audio then add
      if (audioInitialized) _addRandomPlantInternal();
    });
    return; // Exit, will be called again by the promise if audio starts
  }
  _addRandomPlantInternal();
};

window.generateExoticPlant = generateExoticPlant;
window.resetGarden = resetGarden;
window.addRandomPlant = addRandomPlant;

function _addRandomPlantInternal() {
  if (plants.length >= CONFIG.PLANT_CONFIG.MAX_PLANTS) {
    alert("Garden is full! Remove some plants first.");
    return;
  }
  const types = Object.keys(CONFIG.FLOWER_TYPES);
  const randomType = types[floor(random(types.length))];
  const x = random(-width / 3, width / 3);
  const z = random(-width / 3, width / 3);
  const plant = new Plant3D(
    x,
    0,
    z,
    randomType,
    CONFIG.FLOWER_TYPES[randomType]
  );
  plants.push(plant);
  console.log(`Added random plant: ${randomType}`);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  camera(0, -200, height / 2.0 / tan((PI * 30.0) / 180.0), 0, 0, 0, 0, 1, 0); // Re-apply camera
}

function getPlantUnderMouse() {
  let closestPlant = null;
  let minDistSq = Infinity;
  const clickRadius = 35; // Pixel radius for interaction
  const clickRadiusSq = clickRadius * clickRadius;

  for (let plant of plants) {
    // Project plant's flower head center to screen space
    // Flower head is at plant.pos.y - plant.stem.height + some offset for flower size
    let flowerHeadWorldY =
      plant.pos.y -
      plant.stem.height +
      (plant.flowerHead ? plant.flowerHead.size * 0.1 : 0);
    let plantScreenVec = createVector(
      screenX(plant.pos.x, flowerHeadWorldY, plant.pos.z),
      screenY(plant.pos.x, flowerHeadWorldY, plant.pos.z)
    );

    // Check if projection is valid (on screen)
    if (
      plantScreenVec.x < -width ||
      plantScreenVec.x > width * 2 ||
      plantScreenVec.y < -height ||
      plantScreenVec.y > height * 2
    ) {
      // More lenient check
      continue;
    }

    let dSq =
      pow(mouseX - plantScreenVec.x, 2) + pow(mouseY - plantScreenVec.y, 2);

    if (dSq < clickRadiusSq && dSq < minDistSq) {
      minDistSq = dSq;
      closestPlant = plant;
    }
  }
  return closestPlant;
}

function mouseMoved() {
  if (!audioInitialized || eraserMode || plants.length === 0) {
    if (currentlyHoveredPlant) {
      // Optional: visual feedback for de-hover
      currentlyHoveredPlant = null;
    }
    return;
  }

  let plantUnderMouse = getPlantUnderMouse();

  if (plantUnderMouse) {
    if (plantUnderMouse !== currentlyHoveredPlant) {
      if (plantUnderMouse.playNote) plantUnderMouse.playNote();
      // Add visual hover effect here if desired, e.g., plantUnderMouse.isHovered = true;
    }
    currentlyHoveredPlant = plantUnderMouse;
  } else {
    if (currentlyHoveredPlant) {
      // Optional: visual feedback for de-hover
      // currentlyHoveredPlant.isHovered = false;
      currentlyHoveredPlant = null;
    }
  }
  return false; // Prevent default browser actions on mouse move
}

function mousePressed() {
  if (!audioInitialized) {
    initializeGarden(); // This also handles the overlay
    return false;
  }

  let clickedPlant = getPlantUnderMouse();

  if (eraserMode) {
    if (clickedPlant) {
      console.log("Erasing plant:", clickedPlant.type);
      if (clickedPlant.synth) {
        clickedPlant.synth.dispose();
      }
      plants = plants.filter((p) => p !== clickedPlant);
      if (clickedPlant === currentlyHoveredPlant) currentlyHoveredPlant = null;
    }
    return false;
  }

  if (clickedPlant) {
    console.log("Clicked on plant:", clickedPlant.type);
    if (clickedPlant.playNote) clickedPlant.playNote(); // Or a different interaction/sound

    if (
      clickedPlant.flowerHead &&
      clickedPlant.data.colors &&
      clickedPlant.data.colors[0]
    ) {
      const particleOriginY = clickedPlant.pos.y - clickedPlant.stem.height;
      const particleColor = clickedPlant.data.colors[0];
      for (let i = 0; i < 15; i++) {
        particles.push(
          new Particle3D(
            clickedPlant.pos.x,
            particleOriginY,
            clickedPlant.pos.z,
            particleColor
          )
        );
      }
    }
  }
  return false; // Prevent default browser actions
}

function keyPressed() {
  if (key === "e" || key === "E") {
    eraserMode = !eraserMode;
    console.log(eraserMode ? "Eraser mode enabled" : "Eraser mode disabled");
    if (!eraserMode && currentlyHoveredPlant) currentlyHoveredPlant = null; // Reset hover if exiting eraser
  } else if (key === "c" || key === "C") {
    resetGarden();
  }
}

// --- Plant3D Class ---
class Plant3D {
  constructor(x, y, z, type, data = {}) {
    this.pos = createVector(x, y, z);
    this.type = type || "Unknown Plant";
    this.data = data;

    this.age = 0;
    this.maxAge = random(200, 300);
    this.synth = null;
    this.isPlaying = false;
    this.hasAudio = false;

    // Ensure essential data properties exist with defaults
    this.data.height = this.data.height || [50, 100];
    this.data.stemRadius =
      typeof this.data.stemRadius === "number" ? this.data.stemRadius : 3;
    this.data.stemStyle = this.data.stemStyle || "straight";
    this.data.size = this.data.size || [20, 40];
    this.data.petals =
      typeof this.data.petals === "number" && this.data.petals > 0
        ? this.data.petals
        : 8;
    this.data.layerCount =
      typeof this.data.layerCount === "number" && this.data.layerCount > 0
        ? this.data.layerCount
        : 1;
    this.data.petalThickness =
      typeof this.data.petalThickness === "number" &&
      this.data.petalThickness > 0
        ? this.data.petalThickness
        : 1.5;
    this.data.petalShape3D = this.data.petalShape3D || "curved_plane";
    this.data.colors =
      this.data.colors && this.data.colors.length > 0
        ? this.data.colors
        : [[random(360), 70, 80]];
    this.data.centerDetail = this.data.centerDetail || "simple_sphere";
    this.data.oscillator = this.data.oscillator || "sine";
    this.data.scale =
      this.data.scale && this.data.scale.length > 0
        ? this.data.scale
        : [60, 64, 67];
    this.data.isLuminous =
      typeof this.data.isLuminous === "boolean" ? this.data.isLuminous : false;
    this.data.luminosityColor = this.data.luminosityColor || [[0, 0, 0]];

    this.setup3D();
  }

  setup3D() {
    this.createStructure();
  }

  playNote() {
    if (!audioInitialized || this.isPlaying) return;

    try {
      const scale =
        this.data.scale && this.data.scale.length > 0
          ? this.data.scale
          : [60, 62, 64];
      const noteToPlay = scale[floor(random(scale.length))];
      const freq = midiToFreq(noteToPlay);
      const waveform = this.data.oscillator || "sine";

      synth.setType(waveform);
      synth.play(freq, 0.3, 0, 0.5);

      this.isPlaying = true;
      setTimeout(() => (this.isPlaying = false), 300);
    } catch (error) {
      console.warn(`Error playing note for ${this.type}:`, error);
    }
  }

  createStructure() {
    this.stem = {
      height: random(this.data.height[0], this.data.height[1]),
      radius: Math.max(0.5, this.data.stemRadius),
      style: this.data.stemStyle,
      controlPoints: [],
    };

    if (this.stem.style === "curved") {
      const segments = 10;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const noiseSeedX = this.pos.x * 0.01 + t * 2;
        const noiseSeedZ = this.pos.z * 0.01 + t * 3;
        const angle =
          noise(noiseSeedX, frameCount * 0.001) * HALF_PI - QUARTER_PI;
        const offsetMagnitude =
          map(noise(noiseSeedZ, frameCount * 0.001), 0, 1, 5, 20) * t;
        this.stem.controlPoints.push({
          x: cos(angle) * offsetMagnitude,
          y: -this.stem.height * t,
          z: sin(angle) * offsetMagnitude,
        });
      }
      if (this.stem.controlPoints.length === 0) {
        this.stem.controlPoints.push({ x: 0, y: 0, z: 0 });
        this.stem.controlPoints.push({ x: 0, y: -this.stem.height, z: 0 });
      }
    }

    this.flowerHead = {
      size: random(this.data.size[0], this.data.size[1]),
      petals: [],
      center: {
        size: Math.max(1, random(this.data.size[0], this.data.size[1]) * 0.15),
        detail: this.data.centerDetail,
      },
    };

    const numPetalsPerLayer = this.data.petals;
    const numLayers = this.data.layerCount;

    for (let layer = 0; layer < numLayers; layer++) {
      const layerPetals = [];
      const layerProgress = numLayers > 1 ? layer / (numLayers - 1) : 0;
      const orbitRadiusForLayer =
        this.flowerHead.size * 0.15 + layer * this.flowerHead.size * 0.08;
      let petalOwnSize = (this.flowerHead.size * 0.3) / (1 + layer * 0.5);
      petalOwnSize = Math.max(2, petalOwnSize);

      for (let i = 0; i < numPetalsPerLayer; i++) {
        const angle =
          (TWO_PI * i) / numPetalsPerLayer +
          (layer % 2 === 1 ? PI / numPetalsPerLayer : 0);
        layerPetals.push({
          angle: angle,
          radius: orbitRadiusForLayer * random(0.9, 1.1),
          size: petalOwnSize * random(0.7, 1.3),
          thickness: Math.max(0.5, this.data.petalThickness),
          rotationX: PI / 5 - (layerProgress * PI) / 8 + random(-0.1, 0.1),
          rotationY: angle,
          rotationZ: random(-0.15, 0.15),
        });
      }
      this.flowerHead.petals.push(layerPetals);
    }
  }

  display() {
    if (!this.pos || !this.stem) return;

    push();
    translate(this.pos.x, this.pos.y, this.pos.z);

    const windAngleX =
      noise(frameCount * 0.01 + this.pos.x * 0.05) * windForce * 0.1;
    const windAngleZ =
      noise(frameCount * 0.01 + this.pos.z * 0.05) * windForce * 0.1;
    rotateX(windAngleX);
    rotateZ(windAngleZ);

    this.drawStem();
    translate(0, -this.stem.height, 0);
    rotateX(-windAngleX * 0.5);
    rotateZ(-windAngleZ * 0.5);

    this.drawFlowerHead();
    pop();
  }

  drawStem() {
    push();
    const stemColor = this.data.colors[0]
      ? color(
          this.data.colors[0][0],
          this.data.colors[0][1] * 0.7,
          this.data.colors[0][2] * 0.5
        )
      : color(120, 60, 40);
    fill(stemColor);
    noStroke();

    if (this.stem.style === "curved" && this.stem.controlPoints.length > 1) {
      beginShape(TRIANGLE_STRIP);
      for (let i = 0; i < this.stem.controlPoints.length; i++) {
        const point = this.stem.controlPoints[i];
        const radius = Math.max(
          0.5,
          this.stem.radius *
            (1 - (i / (this.stem.controlPoints.length - 1)) * 0.6)
        );
        vertex(point.x - radius, point.y, point.z);
        vertex(point.x + radius, point.y, point.z);
      }
      endShape(CLOSE);
    } else {
      cylinder(Math.max(0.5, this.stem.radius), Math.max(1, this.stem.height));
    }
    pop();
  }

  drawFlowerHead() {
    push();
    const colors = this.data.colors || [[120, 80, 80]];

    // Draw flower center
    fill(colors[0][0], colors[0][1] * 0.7, colors[0][2] * 0.7);
    sphere(this.flowerHead.center.size);

    // Draw petals for each layer
    this.flowerHead.petals.forEach((layer, layerIndex) => {
      layer.forEach((petal) => {
        push();
        const petalColor = colors[layerIndex % colors.length];
        fill(petalColor[0], petalColor[1], petalColor[2], 90);
        noStroke();

        rotateX(petal.rotationX);
        rotateY(petal.rotationY);
        rotateZ(petal.rotationZ);
        translate(0, -petal.radius, 0);

        scale(1, petal.size, petal.thickness);

        switch (this.data.petalShape3D) {
          case "spherical_cap":
          case "ellipsoid":
            sphere(0.5);
            break;
          case "cone":
            cone(0.3, 1);
            break;
          default:
            box(1, 0.2, 0.6);
        }
        pop();
      });
    });

    if (this.data.isLuminous && this.data.luminosityColor?.[0]?.length === 3) {
      const lumColor = this.data.luminosityColor[0];
      pointLight(lumColor[0], lumColor[1], lumColor[2], 0, 0, 0);
    }
    pop();
  }

  update() {
    this.age++;
    if (this.stem.style === "curved" && this.stem.controlPoints?.length > 1) {
      const segments = this.stem.controlPoints.length - 1;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const timeOffset = frameCount * 0.015;
        const windEffectMagnitude =
          windForce * (1 - t) * 5 * (noise(this.pos.x * 0.1 + t) + 0.5);

        this.stem.controlPoints[i].x =
          this.stem.controlPoints[i].x * 0.95 +
          cos(t * PI + timeOffset + this.pos.z * 0.1) *
            windEffectMagnitude *
            0.1;
        this.stem.controlPoints[i].z =
          this.stem.controlPoints[i].z * 0.95 +
          sin(t * PI + timeOffset + this.pos.x * 0.1) *
            windEffectMagnitude *
            0.1;
      }
    }
  }
}

// --- Particle3D Class ---
class Particle3D {
  constructor(x, y, z, pColorArray) {
    this.pos = createVector(x, y, z);
    this.vel = p5.Vector.random3D().mult(random(0.8, 2.5));
    this.lifespan = random(70, 120);
    this.initialLifespan = this.lifespan;
    this.size = random(3, 7);
    this.pColor = pColorArray || [random(360), 80, 90]; // Default particle color
  }

  update() {
    this.pos.add(this.vel);
    this.vel.mult(0.97); // Damping
    this.vel.y -= 0.02; // Slight gravity
    this.lifespan -= 1.5;
  }

  isDead() {
    return this.lifespan < 0;
  }

  draw() {
    if (this.isDead()) return;
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    noStroke();
    let currentAlpha = map(this.lifespan, 0, this.initialLifespan, 0, 80);
    fill(this.pColor[0], this.pColor[1], this.pColor[2], currentAlpha);
    sphere(this.size * (this.lifespan / this.initialLifespan));
    pop();
  }
}

// (PLANT_CONFIG is not strictly used in this version but can be kept for reference)
const PLANT_CONFIG = {
  MAX_PLANTS: 20, // Already a global const
  MIN_DISTANCE: 50,
  GROUND_Y: 0,
  WIND_EFFECT: 0.1,
};

// Helper function to convert MIDI note to frequency
function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}
