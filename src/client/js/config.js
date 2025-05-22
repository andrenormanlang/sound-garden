// Initialize global configuration object
window.CONFIG = {};

// Base flower types and configurations
CONFIG.FLOWER_TYPES = {
  rose: {
    colors: [[0, 80, 90]], // Red
    petals: 20,
    size: [30, 50],
    height: [100, 150],
    scale: [60, 64, 67, 71],
    oscillator: "sine",
    layerCount: 3,
    growthPattern: "spiral",
    stemStyle: "curved",
    stemRadius: 3,
    petalShape3D: "curved_plane",
    petalThickness: 2,
    petalArrangement: "upright_cup",
    leafShape3D: "ellipsoid_flat",
    leafArrangement: "spiral_stem",
    centerDetail: "anthers_stamens",
    textureHint: "velvet",
    isLuminous: false,
    luminosityColor: [[0, 0, 0]],
    hasBranches: true,
    branchCount: 2,
    secondaryStructures: ["thorns"],
  },

  tulip: {
    colors: [[30, 80, 90]], // Orange
    petals: 6,
    size: [20, 35],
    height: [80, 120],
    scale: [62, 65, 69, 72],
    oscillator: "triangle",
    layerCount: 1,
    growthPattern: "symmetrical",
    stemStyle: "straight",
    stemRadius: 2,
    petalShape3D: "curved_plane",
    petalThickness: 1,
    petalArrangement: "upright_cup",
    leafShape3D: "lanceolate",
    leafArrangement: "spiral_stem",
    centerDetail: "anthers_stamens",
    textureHint: "smooth",
    isLuminous: false,
    luminosityColor: [[0, 0, 0]],
    hasBranches: false,
    branchCount: 0,
    secondaryStructures: [],
  },
};

// Plant generation configurations
CONFIG.PLANT_CONFIG = {
  MAX_PLANTS: 20,
  MIN_DISTANCE: 50,
  GROUND_Y: 0,
  WIND_EFFECT: 0.1,
};
