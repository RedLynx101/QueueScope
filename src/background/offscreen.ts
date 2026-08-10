type ToneMessage = { type: "PLAY_TONE_INTERNAL"; tone: "signal" | "soft" | "urgent" };

const tones = {
  signal: { frequencies: [660, 880], duration: 0.16, gain: 0.12 },
  soft: { frequencies: [440, 554], duration: 0.24, gain: 0.08 },
  urgent: { frequencies: [880, 660, 990], duration: 0.12, gain: 0.14 }
} as const;

async function play(tone: keyof typeof tones) {
  const preset = tones[tone];
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = preset.gain;
  master.connect(context.destination);
  const start = context.currentTime;
  preset.frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const begins = start + index * preset.duration;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, begins);
    envelope.gain.exponentialRampToValueAtTime(1, begins + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, begins + preset.duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(begins);
    oscillator.stop(begins + preset.duration + 0.02);
  });
  await new Promise((resolve) => setTimeout(resolve, preset.frequencies.length * preset.duration * 1000 + 80));
  await context.close();
}

chrome.runtime.onMessage.addListener((message: ToneMessage) => {
  if (message?.type !== "PLAY_TONE_INTERNAL" || !(message.tone in tones)) return;
  void play(message.tone);
});
