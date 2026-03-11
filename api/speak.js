export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text, voice = "female" } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const apiKey = process.env.ELEVENLABS_KEY;

  // Vozes nativas pt-BR
  const VOICES = {
    female: "pFZP5JQG7iQjIQuC4Bku", // Lia — brasileira nativa
    male:   "TxGEqnHWrfWFTfGW9XjX", // Josh — multilingual pt-BR
  };

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice] || VOICES.female}`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          language_code: "pt",
          voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.20, use_speaker_boost: true },
        }),
      }
    );
    if (!elRes.ok) return res.status(elRes.status).json({ error: await elRes.text() });
    const buf = await elRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
