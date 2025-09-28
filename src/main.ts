import { crew } from "@kaplayjs/crew";
import kaplay from "kaplay";

import player from "./player";
import { makeEnemy } from "./enemy";
import confettiPlugin from "./confetti";

const k = kaplay({ plugins: [crew] });
k.loadRoot("./"); // A good idea for Itch.io publishing later
k.loadCrew("sprite", "glady-o");
k.loadCrew("sprite", "sword-o");
k.loadCrew("sprite", "bean"); // Using bean sprite for enemies

// Add confetti plugin to the game context
const confetti = confettiPlugin(k);
k.addConfetti = confetti.addConfetti;

// Game state
let gameActive = true;
let finalScore = 0;

// Define game scenes
k.scene("main", () => {
  // Reset game state
  gameActive = true;

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

  // Create walls around the edge of the map
  // Left wall
  const leftWall = k.add([
    k.rect(20, k.height()),
    k.pos(-20, 0),
    k.outline(4),
    k.area(),
    k.body({ isStatic: true }),
    k.color(127, 200, 255),
    k.opacity(0.5),
  ]);

  // Right wall
  const rightWall = k.add([
    k.rect(20, k.height()),
    k.pos(k.width(), 0),
    k.outline(4),
    k.area(),
    k.body({ isStatic: true }),
    k.color(127, 200, 255),
    k.opacity(0.5),
  ]);

  // Top wall
  const topWall = k.add([
    k.rect(k.width(), 20),
    k.pos(0, -20),
    k.outline(4),
    k.area(),
    k.body({ isStatic: true }),
    k.color(127, 200, 255),
    k.opacity(0.5),
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

  const scoreText = k.add([k.text(`Score: ${score}`), k.pos(16, 16), "score"]);

  // Difficulty scaling
  function updateDifficulty() {
    if (!gameActive) return;

    gameTime += 1; // Increment game time by 1 second

    // Every 30 seconds, increase difficulty
    if (score != 0 && score % (50 + 5 * difficultyLevel) === 0) {
      difficultyLevel += 1;

      // Increase max enemies (cap at 15)
      maxEnemies = Math.min(initialMaxEnemies + difficultyLevel * 3, 15);

      // Decrease spawn interval (minimum 0.5 seconds)
      spawnInterval = Math.max(
        initialSpawnInterval - difficultyLevel * 0.3,
        0.5,
      );

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
    if (!gameActive) return;

    // Don't spawn if we already have max enemies
    if (enemies.length >= maxEnemies) return;

    // Random position at the edges of the screen
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x = 0,
      y = 0;

    switch (side) {
      case 0: // top
        x = Math.random() * (k.width() - 40) + 20; // Avoid spawning behind side walls
        y = 10; // Just inside the top wall
        break;
      case 1: // right
        x = k.width() - 10; // Just inside the right wall
        y = Math.random() * (k.height() - 48 - 20) + 20; // Avoid spawning behind top wall or inside ground
        break;
      case 2: // bottom
        x = Math.random() * (k.width() - 40) + 20; // Avoid spawning behind side walls
        y = k.height() - 58; // Just above the ground (ground is at height-48 with height 48)
        break;
      case 3: // left
        x = 10; // Just inside the left wall
        y = Math.random() * (k.height() - 48 - 20) + 20; // Avoid spawning behind top wall or inside ground
        break;
    }

    // Create enemy using the makeEnemy function
    const newEnemy = makeEnemy(k, playerObj, x, y);
    enemies.push(newEnemy);

    // Remove from array when destroyed
    newEnemy.on("destroy", () => {
      enemies = enemies.filter((e) => e !== newEnemy);

      // Increase score when enemy is destroyed
      score += Math.round(10 + Math.pow(difficultyLevel, 0.75));

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

  // Listen for game over event
  playerObj.on("death", () => {
    gameActive = false;
    finalScore = score;

    // Stop enemy spawning
    k.cancel("spawnEnemy");

    // Wait a moment before showing game over screen
    k.wait(2, () => {
      k.go("gameOver", finalScore);
    });
  });
});

// Game over scene
k.scene("gameOver", (score: number) => {
  // Background
  k.add([k.rect(k.width(), k.height()), k.color(0, 0, 0), k.opacity(0.7)]);

  // Game over text
  k.add([
    k.text("GAME OVER", { size: 64 }),
    k.pos(k.width() / 2, k.height() / 3),
    k.anchor("center"),
    k.color(255, 50, 50),
  ]);

  // Score display
  k.add([
    k.text(`Final Score: ${score}`, { size: 36 }),
    k.pos(k.width() / 2, k.height() / 2),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  // Restart button
  const restartBtn = k.add([
    k.rect(200, 60),
    k.pos(k.width() / 2, (k.height() * 2) / 3),
    k.anchor("center"),
    k.color(50, 150, 50),
    k.area(),
    "restart-btn",
  ]);

  // Restart text
  k.add([
    k.text("RESTART", { size: 24 }),
    k.pos(k.width() / 2, (k.height() * 2) / 3),
    k.anchor("center"),
    k.color(255, 255, 255),
  ]);

  // Restart on button click
  restartBtn.onClick(() => {
    k.go("main");
  });

  // Restart on key press
  k.onKeyPress("r", () => {
    k.go("main");
  });

  // Restart on enter key
  k.onKeyPress("enter", () => {
    k.go("main");
  });
});

// Start the game
k.go("main");
