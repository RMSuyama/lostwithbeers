import { TILE_SIZE } from '../constants';

export const COL_TYPES = {
    GROUND: 0,      // Passable by all
    OBJECT_LOW: 1,  // Passable by dash & skills
    OBJECT_HIGH: 2, // Passable by specific skins/skills only (dash fails)
    WALL: 3         // Impassable (Water, Abyss, Platform Walls)
};

export class PhysicsSystem {
    /**
     * Checks if a point is walkable (Type 0)
     */
    static canMove(x, y, mapData) {
        if (!mapData) return true;
        const gX = Math.floor(x / TILE_SIZE);
        const gY = Math.floor(y / TILE_SIZE);

        // Defaults to ground if out of bounds (or strict wall)
        if (gY < 0 || gY >= mapData.scales.length || gX < 0 || gX >= mapData.scales[0].length) {
            return false;
        }

        const type = mapData.scales[gY][gX];
        return type === COL_TYPES.GROUND;
    }

    /**
     * Checks if a move (dash/skill) can pass through a specific point
     * @param {number} x Target X
     * @param {number} y Target Y
     * @param {string} moveType 'dash' | 'skill'
     * @param {object} mapData 
     */
    static canPass(x, y, moveType, mapData) {
        if (!mapData) return true;
        const gX = Math.floor(x / TILE_SIZE);
        const gY = Math.floor(y / TILE_SIZE);

        if (gY < 0 || gY >= mapData.scales.length || gX < 0 || gX >= mapData.scales[0].length) {
            return false;
        }

        const type = mapData.scales[gY][gX];

        if (type === COL_TYPES.GROUND) return true;
        if (type === COL_TYPES.OBJECT_LOW) return true; // Dash and Skill pass 1
        if (type === COL_TYPES.OBJECT_HIGH) {
            return moveType === 'skill'; // Only skills pass 2
        }
        if (type === COL_TYPES.WALL) return false; // Rule 3: Impassable

        return false;
    }

    /**
     * Simple circle collision to prevent stacking
     */
    static resolveEntityCollision(entity, others, radius = 25) {
        others.forEach(other => {
            if (entity.id === other.id) return;

            const dx = entity.x - other.x;
            const dy = entity.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radius * 2;

            if (dist < minDist && dist > 0) {
                // Push away
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                entity.x += nx * overlap * 0.5;
                entity.y += ny * overlap * 0.5;
            }
        });
    }

    /**
     * Forces an entity to stay within map bounds
     */
    static clampToMap(entity, mapWidth, mapHeight) {
        entity.x = Math.max(0, Math.min(mapWidth * TILE_SIZE, entity.x));
        entity.y = Math.max(0, Math.min(mapHeight * TILE_SIZE, entity.y));
    }
}
