// World ↔ canvas mapping for the painted ground zone around the table.
// The zone covers x ∈ [-13, 13], z ∈ [-10, 6]; canvas row 0 is the far edge.
export const GROUND_ZONE = { minX: -13, maxX: 13, minZ: -10, maxZ: 6 };
export const GROUND_PPU = 78; // canvas pixels per world unit
export const GROUND_CANVAS_W = (GROUND_ZONE.maxX - GROUND_ZONE.minX) * GROUND_PPU;
export const GROUND_CANVAS_H = (GROUND_ZONE.maxZ - GROUND_ZONE.minZ) * GROUND_PPU;
export const px = (x) => (x - GROUND_ZONE.minX) * GROUND_PPU;
export const pz = (z) => (z - GROUND_ZONE.minZ) * GROUND_PPU;
