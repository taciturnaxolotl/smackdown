import { crew } from "@kaplayjs/crew";
import kaplay from "kaplay";

import player from "./player";
import { makeEnemy, type EnemyComp } from "./enemy";
import confettiPlugin, { addConfetti } from "./confetti";

const k = kaplay({ plugins: [crew] });
k.loadRoot("./"); // A good idea for Itch.io publishing later
k.loadCrew("sprite", "glady-o");
k.loadCrew("sprite", "sword-o");
k.loadCrew("sprite", "bean"); // Using bean sprite for enemies

// Add confetti plugin to the game context
const confetti = confettiPlugin(k);
k.addConfetti = confetti.addConfetti;

k.setGravity(1600);

// Create ground
const ground = k.add([
  k.rect(k.width(), 48),
  k.pos(0, k.height() - 48),
  k.outline(4),
  k.area(),
  k.body({ isStatic: true }),
  k.color(127, 200, 255),
]);

// Create player object with components
const playerObj = k.add([
  k.pos(120, 500),
  k.sprite("glady-o"),
  k.body(),
  k.area(),
  player(k),
  "player", // Add tag for collision detection
]);

// Enemy spawning variables
let enemies: any[] = [];
let initialMaxEnemies = 5;
let maxEnemies = initialMaxEnemies;
let initialSpawnInterval = 3; // seconds
let spawnInterval = initialSpawnInterval;
let gameTime = 0; // Track game time in seconds
let difficultyLevel = 1;
let score = 0;

const scoreText = k.add([k.text(`Score: ${score}`), k.pos(16, 16)]);

// Difficulty scaling
function updateDifficulty() {
  gameTime += 1; // Increment game time by 1 second

  // Every 30 seconds, increase difficulty
  if (score != 0 && score % (50 * difficultyLevel) === 0) {
    difficultyLevel += 1;

    // Increase max enemies (cap at 15)
    maxEnemies = Math.min(initialMaxEnemies + difficultyLevel * 3, 15);

    // Decrease spawn interval (minimum 0.5 seconds)
    spawnInterval = Math.max(initialSpawnInterval - difficultyLevel * 0.3, 0.5);

    console.log(
      `Difficulty increased to level ${difficultyLevel}. Max enemies: ${maxEnemies}, Spawn interval: ${spawnInterval}s`,
    );

    // Cancel previous spawn loop and start a new one with updated interval
    k.cancel();
    k.loop(spawnInterval, spawnEnemy);

    // Visual feedback for difficulty increase
    const screenCenter = k.vec2(k.width() / 2, k.height() / 2);
    if (k.addConfetti) {
      k.addConfetti(screenCenter);
    }

    // Add difficulty level text
    const levelText = k.add([
      k.text(`Difficulty Level ${difficultyLevel}!`, { size: 32 }),
      k.pos(screenCenter),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.outline(2, k.rgb(0, 0, 0)),
      k.z(100),
      k.opacity(1),
    ]);

    // Fade out and destroy the text
    k.tween(
      1,
      0,
      2,
      (v) => {
        levelText.opacity = v;
      },
      k.easings.easeInQuad,
    );

    k.wait(2, () => {
      levelText.destroy();
    });
  }
}

// Start difficulty scaling
k.loop(1, updateDifficulty);

// Spawn an enemy at a random position
function spawnEnemy() {
  // Don't spawn if we already have max enemies
  if (enemies.length >= maxEnemies) return;

  // Random position at the edges of the screen
  const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let x = 0,
    y = 0;

  switch (side) {
    case 0: // top
      x = Math.random() * k.width();
      y = -50;
      break;
    case 1: // right
      x = k.width() + 50;
      y = Math.random() * k.height();
      break;
    case 2: // bottom
      x = Math.random() * k.width();
      y = k.height() + 50;
      break;
    case 3: // left
      x = -50;
      y = Math.random() * k.height();
      break;
  }

  // Create enemy using the makeEnemy function
  const newEnemy = makeEnemy(k, playerObj, x, y);
  enemies.push(newEnemy);

  // Remove from array when destroyed
  newEnemy.on("destroy", () => {
    enemies = enemies.filter((e) => e !== newEnemy);

    // Increase score when enemy is destroyed
    score += 10 + Math.pow(difficultyLevel, 0.75);

    // Update score display
    scoreText.text = `Score: ${score}`;

    if (Math.random() < 0.5) spawnEnemy();
  });
}

// Start spawning enemies
k.loop(spawnInterval, spawnEnemy);

// Game loop
k.onUpdate(() => {
  // Update enemy list (remove destroyed enemies)
  enemies = enemies.filter((enemy) => enemy.exists());
});

console.log(typeof k);
