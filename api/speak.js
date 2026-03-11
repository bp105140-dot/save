export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text, voice = "female" } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const apiKey = process.env.ELEVENLABS_KEY;

  // Vozes nativas de pt-BR no ElevenLabs
  const VOICES = {
    female: "pFZP5JQG7iQjIQuC4Bku", // Lia — voz feminina brasileira nativa
    male:   "TxGEqnHWrfWFTfGW9XjX", // Josh — voz masculina multilingual com pt-BR
  };

  const voiceId = VOICES[voice] || VOICES.female;

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          language_code: "pt",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.85,
            style: 0.20,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elRes.ok) {
      const err = await elRes.text();
      return res.status(elRes.status).json({ error: err });
    }

    const audioBuffer = await elRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(audioBuffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
