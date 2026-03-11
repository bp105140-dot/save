// Vercel Serverless Function — proxy seguro para ElevenLabs
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella
  const apiKey   = process.env.ELEVENLABS_KEY; // chave fica APENAS no servidor

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.85,
            style: 0.25,
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
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h
    res.send(Buffer.from(audioBuffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
