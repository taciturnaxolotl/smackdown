import type { KAPLAYCtx, GameObj } from "kaplay";

// Extend the KAPLAYCtx type to include our addConfetti method
declare module "kaplay" {
  interface KAPLAYCtx {
    addConfetti?: (pos: { x: number; y: number }) => GameObj[];
  }
}

// Function to create a confetti effect at a position
export function addConfetti(k: KAPLAYCtx, pos: { x: number; y: number }) {
  // Number of confetti particles
  const PARTICLE_COUNT = 50;

  // Confetti colors
  const COLORS = [
    [255, 0, 0], // Red
    [0, 255, 0], // Green
    [0, 0, 255], // Blue
    [255, 255, 0], // Yellow
    [255, 0, 255], // Magenta
    [0, 255, 255], // Cyan
    [255, 165, 0], // Orange
    [128, 0, 128], // Purple
  ] as const;

  // Create particles
  const particles: GameObj[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Random color
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Random size
    const size = Math.random() * 8 + 2; // 2-10 pixels

    // Random shape (circle or rect)
    const isCircle = Math.random() > 0.5;

    // Random velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 400 + 100; // 100-500 pixels per second
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 200; // Initial upward boost

    // Random rotation speed
    const rotSpeed = Math.random() * 10 - 5; // -5 to 5 radians per second

    // Create particle
    const particle = k.add([
      isCircle ? k.circle(size / 2) : k.rect(size, size / 2),
      k.pos(pos.x, pos.y),
      k.color(color[0], color[1], color[2]),
      k.anchor("center"),
      k.rotate(Math.random() * 360), // Random initial rotation
      k.opacity(1),
      k.z(100), // Above most game elements
      {
        // Custom properties for movement
        vx,
        vy,
        rotSpeed,
        gravity: 980, // Gravity effect
        lifespan: Math.random() * 1 + 1, // 1-2 seconds
        fadeStart: 0.7, // When to start fading (0.7 = 70% of lifespan)
      },
    ]);

    // Update function for the particle
    particle.onUpdate(() => {
      // Update position based on velocity
      particle.pos.x += particle.vx * k.dt();
      particle.pos.y += particle.vy * k.dt();

      // Apply gravity
      particle.vy += particle.gravity * k.dt();

      // Apply rotation
      particle.angle += particle.rotSpeed * k.dt() * 60;

      // Update lifespan
      particle.lifespan -= k.dt();

      // Fade out
      if (particle.lifespan < particle.fadeStart) {
        particle.opacity = Math.max(0, particle.lifespan / particle.fadeStart);
      }

      // Destroy when lifespan is over
      if (particle.lifespan <= 0) {
        particle.destroy();
      }
    });

    particles.push(particle);
  }

  return particles;
}

// Component to add confetti method to the game context
export function confettiPlugin(k: KAPLAYCtx) {
  return {
    // Add the confetti function to the game context
    addConfetti(pos: { x: number; y: number }) {
      return addConfetti(k, pos);
    },
  };
}

export default confettiPlugin;
