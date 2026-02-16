
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
    HUB: { x: 50 * TILE_SIZE, y: 60 * TILE_SIZE },
    INTERSECTIONS: {
        TOP_LEFT: { x: 25 * TILE_SIZE, y: 40 * TILE_SIZE },
        TOP_RIGHT: { x: 75 * TILE_SIZE, y: 40 * TILE_SIZE },
        JUNGLE: { x: 50 * TILE_SIZE, y: 50 * TILE_SIZE },
        BASE: { x: 50 * TILE_SIZE, y: 92 * TILE_SIZE }
    },
    LANES: {
        LEFT: [
            { x: 15 * TILE_SIZE, y: 25 * TILE_SIZE },
            { x: 25 * TILE_SIZE, y: 40 * TILE_SIZE },
            { x: 15 * TILE_SIZE, y: 60 * TILE_SIZE },
            { x: 30 * TILE_SIZE, y: 80 * TILE_SIZE },
            { x: 50 * TILE_SIZE, y: 92 * TILE_SIZE }
        ],
        RIGHT: [
            { x: 85 * TILE_SIZE, y: 25 * TILE_SIZE },
            { x: 75 * TILE_SIZE, y: 40 * TILE_SIZE },
            { x: 85 * TILE_SIZE, y: 60 * TILE_SIZE },
            { x: 70 * TILE_SIZE, y: 80 * TILE_SIZE },
            { x: 50 * TILE_SIZE, y: 92 * TILE_SIZE }
        ]
    }
};

export const COLORS = {
    GOLD: '#ffd700',
    RED: '#ef4444',
    BLUE: '#3b82f6',
    GREEN: '#22c55e',
    DARK_BG: '#1a1a1a',
};
