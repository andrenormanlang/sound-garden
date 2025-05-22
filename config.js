// Base prompt for generating exotic plants
const PLANT_GENERATION_PROMPT = `Create a unique exotic flower with the following properties in JSON format:
{
    "name": "exotic flower name",
    "colors": [[hue (0-360), saturation (0-100), brightness (0-100)]],
    "petals": number of petals (5-30),
    "size": [min size, max size],
    "height": [min height, max height],
    "scale": [array of MIDI notes for the flower's sound],
    "oscillator": "sine/triangle/sawtooth/square",
    "description": "brief description of the flower"
}`;
