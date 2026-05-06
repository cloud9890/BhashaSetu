// Vercel serverless function: /api/tts
// Proxies Google Translate TTS to avoid CORS and add language support for all Indian languages.
// Usage: GET /api/tts?text=hello&lang=hi

export default async function handler(req, res) {
  const { text, lang } = req.query;

  if (!text || !lang) {
    return res.status(400).json({ error: 'Missing text or lang parameter' });
  }

  // Google Translate TTS - supports all Google Translate languages including Indian scripts
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=gtx&ttsspeed=0.9`;

  try {
    const response = await fetch(url, {
      headers: {
        // Google rejects requests without a User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Google TTS returned ${response.status}` });
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('TTS proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch TTS audio' });
  }
}
