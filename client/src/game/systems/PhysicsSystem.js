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
    static resolveEntityCollision(entity, entities, pushDistance = 20) {
        // PERFORMANCE: Only do 1 iteration instead of 2
        for (let p = 0; p < 1; p++) {
            for (const other of entities) {
                if (entity === other || entity.id === other.id) continue;

                const dx = other.x - entity.x;
                const dy = other.y - entity.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // PERFORMANCE: Skip if too far away
                if (dist > pushDistance * 3) continue;

                if (dist < pushDistance && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const offset = (pushDistance - dist) / 2;
                    entity.x -= nx * offset;
                    entity.y -= ny * offset;
                    if (other.x !== undefined) {
                        other.x += nx * offset;
                        other.y += ny * offset;
                    }
                }
            }
        }
    }
    /**
     * Forces an entity to stay within map bounds
     */
    static clampToMap(entity, mapWidth, mapHeight) {
        entity.x = Math.max(0, Math.min(mapWidth * TILE_SIZE, entity.x));
        entity.y = Math.max(0, Math.min(mapHeight * TILE_SIZE, entity.y));
    }
}
