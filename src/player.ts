import type { KAPLAYCtx, Comp, GameObj } from "kaplay";
import { Vec2 } from "kaplay";

// Define player component type
interface PlayerComp extends Comp {
  speed: number;
  health: number;
  maxHealth: number;
  damage(amount: number): void;
  attack(): void;
  update(): void;
}

function player(k: KAPLAYCtx): PlayerComp {
  // Use closed local variable for internal data
  let speed = 500;
  let jumpForce = 600;
  let maxHealth = 100;
  let health = maxHealth;
  let isAttacking = false;
  let isHit = false;
  let sword: GameObj | null = null;
  let arrowPoints: GameObj[] = [];
  let healthBar: GameObj | null = null;
  let healthBarBg: GameObj | null = null;
  const ARROW_SEGMENTS = 8; // Number of segments in the arrow
  const MAX_ATTACK_DISTANCE = 500; // Maximum distance for attacks and kaboom
  let attackRangeCircle: GameObj | null = null; // Visual indicator of attack range

  // Helper function to convert radians to degrees
  const radToDeg = (rad: number) => (rad * 180) / Math.PI;

  // Helper function to create a bezier curve point
  const bezierPoint = (
    t: number,
    p0: number,
    p1: number,
    p2: number,
    p3: number,
  ) => {
    const mt = 1 - t;
    return (
      mt * mt * mt * p0 +
      3 * mt * mt * t * p1 +
      3 * mt * t * t * p2 +
      t * t * t * p3
    );
  };

  // Helper function to clamp a point to a circle
  const clampToCircle = (
    center: { x: number; y: number },
    point: { x: number; y: number },
    radius: number,
  ): Vec2 => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      return k.vec2(point.x, point.y); // Point is already inside circle
    }

    // Calculate the point on the circle's edge
    const ratio = radius / distance;
    return k.vec2(center.x + dx * ratio, center.y + dy * ratio);
  };

  return {
    id: "player",
    require: ["body", "area", "pos"],

    // Exposed properties
    speed,
    health,
    maxHealth,

    // Take damage
    damage(this: GameObj, amount: number) {
      if (isHit) return; // Prevent taking damage too quickly

      health -= amount;

      // Flash red when hit
      isHit = true;
      this.color = k.rgb(255, 0, 0);

      // Reset color after a short time
      k.wait(0.1, () => {
        this.color = k.rgb();
        isHit = false;
      });

      // Update health bar
      if (healthBar) {
        const healthPercent = Math.max(0, health / maxHealth);
        healthBar.width = 60 * healthPercent;
      }

      // Check if player is dead
      if (health <= 0) {
        // Game over logic here
        k.addKaboom(this.pos);
        k.shake(20);
      }
    },

    // Runs when the obj is added to scene
    add(this: GameObj) {
      // Create health bar background (gray)
      healthBarBg = k.add([
        k.rect(60, 8),
        k.pos(this.pos.x - 30, this.pos.y - 40),
        k.color(100, 100, 100),
        k.z(0.9),
      ]);

      // Create health bar (red)
      healthBar = k.add([
        k.rect(60, 8),
        k.pos(this.pos.x - 30, this.pos.y - 40),
        k.color(255, 0, 0),
        k.z(1),
      ]);

      // Create sword attached to player
      sword = k.add([
        k.sprite("sword-o"),
        k.pos(this.pos.x + 30, this.pos.y - 10),
        k.rotate(45), // Hold at 45 degrees
        k.anchor("center"),
        k.scale(0.7),
        k.area(), // Add area for collision detection
        k.z(1), // Make sure sword is in front of player
        "sword", // Add tag for collision detection
        {
          isAttacking: false, // Custom property to track attack state
        },
      ]);

      // Create attack range indicator (semi-transparent circle)
      attackRangeCircle = k.add([
        k.circle(MAX_ATTACK_DISTANCE),
        k.pos(this.pos.x, this.pos.y),
        k.color(255, 255, 255),
        k.opacity(0.1), // Very subtle
        k.z(0.1), // Behind everything
      ]);

      // Create arrow segments
      for (let i = 0; i < ARROW_SEGMENTS; i++) {
        // Create segment with white outline
        const segment = k.add([
          k.circle(3), // Initial size, will be scaled based on distance
          k.pos(this.pos.x, this.pos.y - 30), // Start from player's head
          k.color(255, 0, 0), // Red fill
          k.outline(2, k.rgb(255, 255, 255)), // White outline
          k.z(0.5),
        ]);
        arrowPoints.push(segment);
      }

      // Create arrow head (using a circle for now)
      const arrowHead = k.add([
        k.circle(6), // Larger circle for the arrow head
        k.pos(this.pos.x, this.pos.y - 30),
        k.color(255, 0, 0), // Red fill
        k.outline(2, k.rgb(255, 255, 255)), // White outline
        k.z(0.5),
      ]);
      arrowPoints.push(arrowHead);

      // Jump with space or up arrow
      this.onKeyPress(["space", "up", "w"], () => {
        if (this.isGrounded()) {
          this.jump(jumpForce);
        }
      });

      // Attack with X key
      this.onKeyPress("x", () => {
        this.attack();
      });

      // Attack, kaboom and shake on click
      k.onClick(() => {
        // Attack with sword
        this.attack();

        // Get mouse position and clamp it to the attack range
        const mousePos = k.mousePos();
        const clampedPos = clampToCircle(
          this.pos,
          mousePos,
          MAX_ATTACK_DISTANCE,
        );

        console.log("Creating explosion at", clampedPos.x, clampedPos.y);

        // Create visual explosion effect
        k.addKaboom(clampedPos);

        // Create explosion area for damage
        const explosionRadius = 120;
        const explosion = k.add([
          k.circle(explosionRadius),
          k.pos(clampedPos),
          k.color(255, 0, 0), // Semi-transparent red
          k.area(),
          k.anchor("center"),
          k.opacity(0.3), // Add opacity component
          "explosion",
        ]);

        // Destroy explosion after a short time
        k.wait(0.1, () => {
          explosion.destroy();
        });

        // Manually check for enemies in range
        const enemies = k.get("enemy");
        enemies.forEach((enemy) => {
          const dist = k.vec2(enemy.pos).dist(clampedPos);
          if (dist < explosionRadius) {
            // Normalize distance to 0-1 range
            const normalizedDist = dist / explosionRadius;

            const maxDamage = 80;
            const minDamage = 10;
            const logFalloff = Math.log(10 * normalizedDist) / Math.log(20);
            const damagePercent = 1 - logFalloff;
            const damage = Math.max(
              Math.floor(maxDamage * damagePercent),
              minDamage,
            );

            console.log(
              `Explosion damage to enemy: ${damage}, distance: ${dist}, normalized: ${normalizedDist}, falloff: ${logFalloff}`,
            );
            // Add type assertion to tell TypeScript that enemy has a damage method
            (enemy as any).damage(damage);
          }
        });

        // Shake the screen
        k.shake(10);
      });
    },

    // Attack method
    attack(this: GameObj) {
      if (isAttacking) return;

      isAttacking = true;

      if (sword) {
        // Set sword to attacking state for collision detection
        sword.isAttacking = true;

        // Store original angle
        const originalAngle = this.flipX ? -30 : 30;

        // Animate sword swing
        const direction = this.flipX ? -1 : 1;
        const endAngle = direction > 0 ? 90 : -90;

        // Tween the sword rotation
        k.tween(
          sword.angle,
          endAngle,
          0.15,
          (val) => (sword!.angle = val),
          k.easings.easeInOutQuad,
        );

        // Return sword to original position
        k.wait(0.15, () => {
          if (sword) {
            k.tween(
              sword.angle,
              originalAngle,
              0.15,
              (val) => (sword!.angle = val),
              k.easings.easeOutQuad,
            );
          }
        });

        // End attack state
        k.wait(0.3, () => {
          isAttacking = false;
          if (sword) {
            sword.isAttacking = false;
          }
        });
      }
    },

    // Runs every frame
    update(this: GameObj) {
      // Left movement (left arrow or A key)
      if (k.isKeyDown(["left", "a"])) {
        this.move(-speed, 0);
        this.flipX = true;
      }

      // Right movement (right arrow or D key)
      if (k.isKeyDown(["right", "d"])) {
        this.move(speed, 0);
        this.flipX = false;
      }

      // Update sword position to follow player
      if (sword) {
        const xOffset = this.flipX ? 10 : 60;
        const yOffset = 60; // Slightly above center
        sword.pos.x = this.pos.x + xOffset;
        sword.pos.y = this.pos.y + yOffset;

        // Update sword angle and flip based on player direction (when not attacking)
        if (!isAttacking) {
          sword.flipX = this.flipX;
          sword.angle = this.flipX ? -30 : 30; // Mirror angle when facing left
        }
      }

      // Update health bar position to follow player
      if (healthBar && healthBarBg) {
        healthBarBg.pos.x = this.pos.x + 5;
        healthBarBg.pos.y = this.pos.y - 40;

        healthBar.pos.x = this.pos.x + 5;
        healthBar.pos.y = this.pos.y - 40;
      }

      // Update attack range circle to follow player
      if (attackRangeCircle) {
        attackRangeCircle.pos = this.pos;
      }

      // Update arrow to create an arc from player to mouse
      if (arrowPoints.length > 0) {
        const mousePos = k.mousePos();
        const startPos = { x: this.pos.x + 40, y: this.pos.y }; // Player's head

        // Clamp mouse position to maximum attack range
        const clampedMousePos = clampToCircle(
          this.pos,
          mousePos,
          MAX_ATTACK_DISTANCE,
        );

        // Calculate horizontal distance from player to mouse
        const horizontalDist = clampedMousePos.x - startPos.x;

        // Calculate total distance from player to mouse
        const dist = Math.sqrt(
          Math.pow(clampedMousePos.x - startPos.x, 2) +
            Math.pow(clampedMousePos.y - startPos.y, 2),
        );

        // Determine arc direction based on horizontal position
        // Use a smooth transition near the center
        const centerThreshold = 50; // Distance from center where arc is minimal
        let arcDirection = 0;

        if (Math.abs(horizontalDist) < centerThreshold) {
          // Smooth transition near center
          arcDirection = -(horizontalDist / centerThreshold); // Will be between -1 and 1
        } else {
          // Full curve away from center
          arcDirection = horizontalDist > 0 ? -1 : 1;
        }

        // Calculate arc height based on distance and direction
        // Reduce arc height when close to center
        const maxArcHeight = 100;
        const arcHeightFactor = Math.min(Math.abs(arcDirection), 1); // Between 0 and 1
        const arcHeight = Math.min(dist * 0.5, maxArcHeight) * arcHeightFactor;

        // Calculate perpendicular direction for control points
        const dirX = clampedMousePos.x - startPos.x;
        const dirY = clampedMousePos.y - startPos.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        const perpX = (-dirY / len) * arcDirection;
        const perpY = (dirX / len) * arcDirection;

        // Control points for the bezier curve
        const ctrl1 = {
          x: startPos.x + dirX * 0.25 + perpX * arcHeight,
          y: startPos.y + dirY * 0.25 + perpY * arcHeight,
        };

        const ctrl2 = {
          x: startPos.x + dirX * 0.75 + perpX * arcHeight,
          y: startPos.y + dirY * 0.75 + perpY * arcHeight,
        };

        // Position each segment along the bezier curve
        for (let i = 0; i < ARROW_SEGMENTS; i++) {
          const t = i / (ARROW_SEGMENTS - 1);
          const x = bezierPoint(
            t,
            startPos.x,
            ctrl1.x,
            ctrl2.x,
            clampedMousePos.x,
          );
          const y = bezierPoint(
            t,
            startPos.y,
            ctrl1.y,
            ctrl2.y,
            clampedMousePos.y,
          );

          // Calculate segment position along the curve
          arrowPoints[i].pos.x = x;
          arrowPoints[i].pos.y = y;

          // Scale circle size based on distance from start
          // Segments get progressively larger toward the end
          const segmentDist = i / (ARROW_SEGMENTS - 1); // 0 to 1
          const minSize = 2;
          const maxSize = 5;
          const size = minSize + segmentDist * (maxSize - minSize);

          // Apply scale
          if (arrowPoints[i].scale) {
            arrowPoints[i].scale.x = size / 3; // Divide by default size (3)
            arrowPoints[i].scale.y = size / 3;
          }
        }

        // Position arrow head at the end of the curve and make it larger
        const arrowHead = arrowPoints[arrowPoints.length - 1];
        arrowHead.pos.x = clampedMousePos.x;
        arrowHead.pos.y = clampedMousePos.y;

        // Make arrow head larger
        if (arrowHead.scale) {
          arrowHead.scale.x = 3;
          arrowHead.scale.y = 3;
        }
      }
    },

    // Cleanup when destroyed
    destroy() {
      if (sword) {
        sword.destroy();
      }

      if (attackRangeCircle) {
        attackRangeCircle.destroy();
      }

      if (healthBar) {
        healthBar.destroy();
      }

      if (healthBarBg) {
        healthBarBg.destroy();
      }

      // Destroy all arrow segments
      arrowPoints.forEach((segment) => {
        segment.destroy();
      });
      arrowPoints = [];
    },
  };
}

export default player;
