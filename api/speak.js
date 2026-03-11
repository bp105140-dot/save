// Vercel Serverless Function — proxy seguro para ElevenLabs
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  // ── Correções de pronúncia para pt-BR ──────────────────────────────────────
  // ElevenLabs às vezes lê como italiano/espanhol; forçamos a grafia fonética.
  const pronunciationMap = {
    // vogais/consoantes problemáticas
    "Doce":     "Dosse",
    "doce":     "dosse",
    "Cocô":     "Cocô",
    "Xixi":     "Shishi",
    "xixi":     "shishi",
    "Banheiro": "Banhêro",
    "banheiro": "banhêro",
    "Escovar":  "Escovár",
    "Lavar":    "Lavár",
    "Comer":    "Comér",
    "Barriga":  "Barríga",
    "Cabeça":   "Cabéça",
    "Nariz":    "Naríz",
    "Ouvido":   "Ouvído",
    "Feliz":    "Felíz",
    "Triste":   "Trísste",
    "Bravo":    "Brávvo",
    "Abraço":   "Abraço",
    "Ursinho":  "Ursínho",
    "Cansado":  "Cansádo",
    "Dormir":   "Dormír",
    "Puzzle":   "Pázel",
    "Venha":    "Vênia",
    "Preciso":  "Precízo",
    "ajuda":    "ajúda",
    "Ajuda":    "Ajúda",
    "Estou":    "Esstô",
    "Olá":      "Olá",
    "Sim":      "Sĩ",
    "Não":      "Nãon",
  };

  // Aplica as correções (palavra exata, preserva contexto)
  for (const [wrong, right] of Object.entries(pronunciationMap)) {
    text = text.replaceAll(wrong, right);
  }

  const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella
  const apiKey   = process.env.ELEVENLABS_KEY;

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
          model_id: "eleven_turbo_v2_5",   // modelo mais recente, melhor em pt-BR
          language_code: "pt",              // força pronúncia em português
          voice_settings: {
            stability: 0.50,
            similarity_boost: 0.80,
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
