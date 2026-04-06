const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('.'));

require('dotenv').config();
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

app.post('/generate', async (req, res) => {
  console.log('--- [Server] Received generation request ---');
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    console.log('[Server] Anthropic API Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Server] Anthropic API error details:', errorText);
      
      // Attempt to parse JSON error if possible
      let errorJson;
      try { errorJson = JSON.parse(errorText); } catch(e) {}
      
      return res.status(response.status).json({
        error: errorJson?.error?.message || errorText || 'Unknown Anthropic API error'
      });
    }

    const data = await response.json();
    console.log('[Server] Success: Response received from Anthropic.');
    res.json(data);

  } catch (error) {
    console.error('[Server] Internal server error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));