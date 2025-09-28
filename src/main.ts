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

  // Add a hidden score tracker that can be accessed by other components
  const scoreTracker = k.add([
    k.pos(0, 0),
    "game-score-tracker",
    {
      score: score,
      difficultyLevel: difficultyLevel,
      updateScore(newScore: number) {
        this.score = newScore;
        score = newScore; // Update the main score variable
      },
      updateDifficulty(newLevel: number) {
        this.difficultyLevel = newLevel;
      },
    },
  ]);

  // Difficulty scaling
  function updateDifficulty() {
    if (!gameActive) return;

    gameTime += 1; // Increment game time by 1 second

    // Check if it's time to increase difficulty based on score
    // Use a formula that scales with difficulty level
    const scoreThreshold = 50 * difficultyLevel;

    if (score >= scoreThreshold && score % scoreThreshold < 10) {
      // Only trigger once when crossing the threshold
      if (!k.get("level-up-text").length) {
        difficultyLevel += 1;

        // Update difficulty in tracker
        const tracker = k.get("game-score-tracker")[0];
        if (tracker) {
          tracker.updateDifficulty(difficultyLevel);
        }

        // Increase max enemies (cap at 15)
        maxEnemies = Math.min(initialMaxEnemies + difficultyLevel, 15);

        // Decrease spawn interval (minimum 0.5 seconds)
        spawnInterval = Math.max(
          initialSpawnInterval - difficultyLevel * 0.2,
          0.5,
        );

        console.log(
          `Difficulty increased to level ${difficultyLevel}. Max enemies: ${maxEnemies}, Spawn interval: ${spawnInterval}s`,
        );

        // Cancel previous spawn loop and start a new one with updated interval
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
          "level-up-text",
        ]);

        // Fade out and destroy the text
        k.tween(
          1,
          0,
          2,
          (v) => {
            if (levelText.exists()) {
              levelText.opacity = v;
            }
          },
          k.easings.easeInQuad,
        );

        k.wait(2, () => {
          if (levelText.exists()) levelText.destroy();
        });
      }
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
    // As difficulty increases, add chance to spawn in center
    let spawnSide;

    // Calculate center spawn chance based on difficulty level
    // 0% at level 1-2, increasing to 30% at level 10+
    const centerSpawnChance =
      difficultyLevel <= 2 ? 0 : Math.min((difficultyLevel - 2) * 0.04, 0.3);

    // Determine spawn location
    if (Math.random() < centerSpawnChance) {
      // Center spawn
      spawnSide = 2; // Center
    } else {
      // Side spawn (left or right)
      spawnSide = Math.floor(Math.random() * 2); // 0: left, 1: right
    }

    let x = 0,
      y = 0;

    switch (spawnSide) {
      case 0: // left
        x = 10; // Just inside the left wall
        y = Math.random() * (k.height() - 48 - 20) + 20; // Avoid spawning behind top wall or inside ground
        break;
      case 1: // right
        x = k.width() - 10; // Just inside the right wall
        y = Math.random() * (k.height() - 48 - 20) + 20; // Avoid spawning behind top wall or inside ground
        break;
      case 2: // center (mid-air)
        // Random position in the middle area of the screen
        x = k.width() * (0.3 + Math.random() * 0.4); // 30-70% of screen width
        y = k.height() * (0.2 + Math.random() * 0.5); // 20-70% of screen height
        break;
    }

    // Create enemy using the makeEnemy function
    const newEnemy = makeEnemy(k, playerObj, x, y);
    enemies.push(newEnemy);

    // Remove from array when destroyed
    newEnemy.on("destroy", () => {
      enemies = enemies.filter((e) => e !== newEnemy);

      // Increase score when enemy is destroyed
      const pointsEarned = Math.round(10 + Math.pow(difficultyLevel, 0.75));
      score += pointsEarned;

      // Update score display
      scoreText.text = `Score: ${score}`;

      // Update score tracker
      const tracker = k.get("game-score-tracker")[0];
      if (tracker) {
        tracker.score = score;
      }

      // Heal player when killing an enemy
      const player = k.get("player")[0];
      if (player && player.heal) {
        // Heal amount is 5 health points
        const healAmount = 5;
        player.heal(healAmount);

        // Show healing effect
        const healText = k.add([
          k.text(`+${healAmount} HP`, { size: 16 }),
          k.pos(player.pos.x, player.pos.y - 60),
          k.anchor("center"),
          k.color(0, 255, 0),
          k.z(100),
          k.opacity(1),
        ]);

        // Float upward and fade out
        k.tween(
          1,
          0,
          0.8,
          (v) => {
            if (healText.exists()) {
              healText.opacity = v;
              healText.pos.y -= 0.5;
            }
          },
          k.easings.easeOutQuad,
        );

        k.wait(0.8, () => {
          if (healText.exists()) healText.destroy();
        });
      }

      if (Math.random() < 0.2 * Math.pow(difficultyLevel, 0.75)) spawnEnemy();
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

    // Get final score from tracker
    const tracker = k.get("game-score-tracker")[0];
    if (tracker) {
      finalScore = tracker.score;
    } else {
      finalScore = score;
    }

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
