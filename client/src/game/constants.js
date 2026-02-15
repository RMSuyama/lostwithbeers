
export const TILE_SIZE = 32;
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;

export const TILE_TYPES = {
    GRASS: 0,
    COBBLESTONE: 1,
    MURKY_WATER: 2,
    STONE_WALL: 3,
    FORT_WOOD: 4,
    CARGO_CRATE: 5,
};

export const POSITIONS = {
    BASE: { x: 50 * TILE_SIZE, y: 92 * TILE_SIZE },
    SPAWN_L: { x: 15 * TILE_SIZE, y: 10 * TILE_SIZE },
    SPAWN_R: { x: 85 * TILE_SIZE, y: 10 * TILE_SIZE },
    HUB: { x: 50 * TILE_SIZE, y: 60 * TILE_SIZE }
};

export const COLORS = {
    GOLD: '#ffd700',
    RED: '#ef4444',
    BLUE: '#3b82f6',
    GREEN: '#22c55e',
    DARK_BG: '#1a1a1a',
};
