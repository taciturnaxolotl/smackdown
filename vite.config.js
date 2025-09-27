import { defineConfig } from "vite";

const kaplayCongrats = () => {
  return {
    name: "vite-plugin-kaplay-hello",
    buildEnd() {
      const line = "---------------------------------------------------------";
      const msg = `💝 feel free to hack on this and open a pr!`;

      process.stdout.write(`\n${line}\n${msg}\n${line}\n`);
    },
  };
};

export default defineConfig({
  // index.html out file will start with a relative path for script
  base: "./",
  server: {
    port: 3001,
  },
  build: {
    // disable this for low bundle sizes
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          kaplay: ["kaplay"],
        },
      },
    },
  },
  plugins: [kaplayCongrats()],
});

