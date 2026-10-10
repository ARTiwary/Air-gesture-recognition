export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const MODEL_URL =
  import.meta.env.VITE_MODEL_URL || "https://teachablemachine.withgoogle.com/models/sG3DX3BM_/model.json";

export const ACTIONS = ["grab", "drop"]; // any other class from the model (e.g. "background") counts as idle
export const CONFIDENCE = 0.85;          // minimum confidence to count a frame
export const HOLD_MS = 700;              // how long a gesture must be held to trigger
export const INTERVAL_MS = 120;          // classification rate, gentler on battery than every frame

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_BYTES = 5 * 1024 * 1024;
