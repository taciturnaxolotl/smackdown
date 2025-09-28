import type { KAPLAYCtx, Comp, GameObj } from "kaplay";

// Define enemy component type
export interface EnemyComp extends Comp {
  health: number;
  maxHealth: number;
  speed: number;
  damage(amount: number): void;
  update(): void;
}

export function enemy(k: KAPLAYCtx, target: GameObj) {
  // Use closed local variables for internal data
  let maxHealth = 100;
  let health = maxHealth;
  let speed = 100;
  let isHit = false;
  let isDying = false;
  let healthBar: GameObj | null = null;
  let healthBarBg: GameObj | null = null;
  let lastDamageTime = 0;
  const DAMAGE_COOLDOWN = 0.5; // seconds

  return {
    id: "enemy",
    require: ["pos", "sprite", "area", "body"],

    // Exposed properties
    health,
    maxHealth,
    speed,

    // Damage the enemy
    damage(this: GameObj, amount: number) {
      if (isDying) return;

      health -= amount;
      console.log(`Enemy damaged: ${amount}, health: ${health}`);

      // Play hit sound
      if (typeof (window as any).gameSound !== 'undefined') {
        (window as any).gameSound.playSfx('hit', { volume: 0.3, detune: 200 });
      }

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
        healthBar.width = 40 * healthPercent;
      }

      // Check if enemy is dead
      if (health <= 0 && !isDying) {
        isDying = true;
        this.die();
      }
    },

    // Enemy death
    die(this: GameObj) {
      // Play death sound
      if (typeof (window as any).gameSound !== 'undefined') {
        (window as any).gameSound.playSfx('death', { volume: 0.4, detune: -100 });
      }

      // Add confetti effect only (no kaboom)
      if (k.addConfetti) {
        k.addConfetti(this.pos);
      }

      // Remove health bar
      if (healthBarBg) healthBarBg.destroy();
      if (healthBar) healthBar.destroy();

      // Scale down and fade out
      k.tween(
        this.scale.x,
        0,
        0.5,
        (v) => {
          this.scale.x = v;
          this.scale.y = v;
        },
        k.easings.easeInQuad,
      );

      k.tween(
        1,
        0,
        0.5,
        (v) => {
          this.opacity = v;
        },
        k.easings.easeInQuad,
      );

      // Destroy after animation completes
      k.wait(0.5, () => {
        this.destroy();
      });
    },

    // Add method runs when the component is added to a game object
    add(this: GameObj) {
      // Create health bar background (gray)
      healthBarBg = k.add([
        k.rect(40, 5),
        k.pos(this.pos.x - 20, this.pos.y - 30),
        k.color(100, 100, 100),
        k.z(0.9),
      ]);

      // Create health bar (red)
      healthBar = k.add([
        k.rect(40, 5),
        k.pos(this.pos.x - 20, this.pos.y - 30),
        k.color(255, 0, 0),
        k.z(1),
      ]);

      // Handle collisions with sword
      this.onCollide("sword", (sword) => {
        if (sword.isAttacking && !isHit) {
          // Sword does 35 damage (35% of enemy health)
          this.damage(35);
        }
      });
    },

    // Runs every frame
    update(this: GameObj) {
      if (isDying) return;

      // Move toward target
      const dir = k.vec2(target.pos.x - this.pos.x, target.pos.y - this.pos.y);

      // Normalize direction vector
      const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y);

      // Only move if not too close to target
      if (dist > 50) {
        const normalizedDir = {
          x: dir.x / dist,
          y: dir.y / dist,
        };

        // Move toward target
        this.move(normalizedDir.x * speed, normalizedDir.y * speed);

        // Flip sprite based on movement direction
        if (normalizedDir.x !== 0) {
          this.flipX = normalizedDir.x < 0;
        }
      }

      // Check for collision with player and apply damage if in contact
      // Only apply damage if cooldown has passed
      if (k.time() - lastDamageTime > DAMAGE_COOLDOWN) {
        const playerObj = k.get("player")[0];
        if (playerObj && this.isColliding(playerObj)) {
          lastDamageTime = k.time();

          // Damage player
          if (playerObj.damage) {
            // Get current difficulty level to scale damage
            const difficultyLevel = k.get("game-score-tracker")[0]?.difficultyLevel || 1;
            
            // Base damage is 5, increases with difficulty
            const baseDamage = 5;
            const scaledDamage = Math.round(baseDamage + (difficultyLevel - 1) * 2);
            
            playerObj.damage(scaledDamage);
          }

          // Knockback effect
          const knockback = 200;
          const knockbackDir = k
            .vec2(playerObj.pos.x - this.pos.x, playerObj.pos.y - this.pos.y)
            .unit();

          playerObj.move(
            knockbackDir.x * knockback,
            knockbackDir.y * knockback,
          );
        }
      }

      // Update health bar position to follow enemy
      if (healthBar && healthBarBg) {
        healthBarBg.pos.x = this.pos.x - 20;
        healthBarBg.pos.y = this.pos.y - 30;

        healthBar.pos.x = this.pos.x - 20;
        healthBar.pos.y = this.pos.y - 30;
      }
    },

    // Cleanup when destroyed
    destroy() {
      if (healthBar) healthBar.destroy();
      if (healthBarBg) healthBarBg.destroy();
    },
  };
}

// Function to create an enemy
export function makeEnemy(k: KAPLAYCtx, target: GameObj, x: number, y: number) {
  // Create enemy
  const newEnemy = k.add([
    k.sprite("bean"),
    k.pos(x, y),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.body(),
    enemy(k, target),
    "enemy", // Add tag for collision detection
  ]);

  return newEnemy;
}

export default enemy;
