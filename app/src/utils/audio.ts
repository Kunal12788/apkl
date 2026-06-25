let sharedAudioCtx: AudioContext | null = null;

/**
 * Synthesizes a futuristic ascending chime sound using the Web Audio API.
 * Resembles the code-completion or action-completed chime of premium systems.
 */
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    const ctx = sharedAudioCtx;

    // Mobile browsers suspend the audio context to prevent autoplay sound.
    // Calling resume() inside user interaction context unlocks audio output.
    if (ctx.state === 'suspended') {
      ctx.resume().catch((err) => {
        console.warn("Could not resume AudioContext:", err);
      });
    }
    
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      // Soft linear rise
      gain.gain.linearRampToValueAtTime(0.12, start + 0.04);
      // Exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };
    
    const now = ctx.currentTime;
    // Play 4 beautiful notes ascending (C5, E5, G5, C6)
    playTone(523.25, now, 0.35);      // C5
    playTone(659.25, now + 0.07, 0.35); // E5
    playTone(783.99, now + 0.14, 0.5);  // G5
    playTone(1046.50, now + 0.21, 0.7); // C6
  } catch (e) {
    console.error("Web Audio API sound playback failed:", e);
  }
};

