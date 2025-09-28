import type { KAPLAYCtx } from "kaplay";

// Sound effects and music system
export function setupSoundSystem(k: KAPLAYCtx) {
  // Available music tracks
  const musicTracks = [
    "pixel-song-3.mp3",
    "pixel-song-18.mp3",
    "pixel-song-19.mp3",
    "pixel-song-21.mp3",
  ];

  // Sound effects
  const soundEffects = {
    coin: [
      "coin-1.wav",
      "coin-2.wav",
      "coin-3.wav",
      "coin-4.wav",
      "coin-5.wav",
    ],
    explosion: ["pixel-explosion.mp3"],
    jump: ["coin-1.wav"],
    hit: ["ouch.mp3"],
    heal: ["coin-3.wav"],
    death: ["large-underwater-explosion.mp3"],
    levelUp: ["smb_powerup.wav"],
    windup: ["windup.mp3"],
  };

  // Keep track of last played music to avoid repeats
  let lastPlayedMusic = "";
  let currentMusic: any = null;
  let musicVolume = 0.8; // Increased from 0.5 to 0.8
  let sfxVolume = 0.7;
  let musicEnabled = true;
  let sfxEnabled = true;

  // Preload all sounds
  function preloadSounds() {
    // Preload music
    musicTracks.forEach((track) => {
      k.loadSound(track, `music/${track}`);
    });

    // Preload sound effects
    Object.values(soundEffects)
      .flat()
      .forEach((sfx) => {
        k.loadSound(sfx, `sfx/${sfx}`);
      });
  }

  // Play a random music track (avoiding the last played one)
  function playRandomMusic() {
    if (!musicEnabled) return;

    // Stop current music if playing
    if (currentMusic) {
      currentMusic.stop();
    }

    // Filter out the last played track to avoid repeats
    const availableTracks = musicTracks.filter(
      (track) => track !== lastPlayedMusic,
    );

    // Select a random track from available tracks
    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    const selectedTrack = availableTracks[randomIndex];

    // Update last played track
    lastPlayedMusic = selectedTrack;

    // Play the selected track
    currentMusic = k.play(selectedTrack, {
      volume: musicVolume,
      loop: true,
    });

    return currentMusic;
  }

  // Play a sound effect
  function playSfx(type: keyof typeof soundEffects, options: any = {}) {
    if (!sfxEnabled) return;

    const sounds = soundEffects[type];
    if (!sounds || sounds.length === 0) return;

    // Select a random sound from the category
    const randomIndex = Math.floor(Math.random() * sounds.length);
    const selectedSound = sounds[randomIndex];
    // Play the sound with options
    return k.play(selectedSound, {
      volume: options.volume ?? sfxVolume,
      ...options,
    });
  }

  // Play a specific sound file directly
  function playSound(soundName: string, options: any = {}) {
    if (!sfxEnabled) return;

    return k.play(soundName, {
      volume: options.volume ?? sfxVolume,
      ...options,
    });
  }

  // Toggle music on/off
  function toggleMusic() {
    musicEnabled = !musicEnabled;

    if (musicEnabled) {
      playRandomMusic();
    } else if (currentMusic) {
      currentMusic.stop();
      currentMusic = null;
    }

    return musicEnabled;
  }

  // Toggle sound effects on/off
  function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    return sfxEnabled;
  }

  // Set music volume
  function setMusicVolume(volume: number) {
    musicVolume = Math.max(0, Math.min(1, volume));
    if (currentMusic) {
      currentMusic.volume(musicVolume);
    }
    return musicVolume;
  }

  // Set sound effects volume
  function setSfxVolume(volume: number) {
    sfxVolume = Math.max(0, Math.min(1, volume));
    return sfxVolume;
  }

  // Check if a sound is currently playing
  function isMusicPlaying() {
    return currentMusic !== null;
  }

  // Stop current music
  function stopMusic() {
    if (currentMusic) {
      currentMusic.stop();
      currentMusic = null;
    }
  }

  // Get current music track name
  function getCurrentMusic() {
    return lastPlayedMusic;
  }

  return {
    preloadSounds,
    playRandomMusic,
    playSfx,
    playSound,
    toggleMusic,
    toggleSfx,
    setMusicVolume,
    setSfxVolume,
    isMusicPlaying,
    stopMusic,
    getCurrentMusic,
  };
}

export default setupSoundSystem;
