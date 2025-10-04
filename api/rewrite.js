const fetch = require('node-fetch');

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);
        if (response.ok) {
            return response;
        } else if ([429, 500, 502, 503, 504].includes(response.status)) {
            console.warn(`Retryable error (${response.status}). Retrying in ${delay} ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        } else {
            throw new Error(`API request failed with status ${response.status}`);
        }
    }
    throw new Error('Max retries exceeded');
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send({ message: 'Only POST requests allowed' });
    }

    const { text, tone } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing "text" in request body' });
    }

    // Tone prompts
    const tonePrompts = {
        professional: "Rewrite this message to sound professional and respectful.",
        friendly: "Rewrite this message in a friendly, supportive tone.",
        relatable: "Rewrite this message to sound down-to-earth and relatable.",
        funny: "Rewrite this message with light humor while still making the point clear.",
        strict: "Rewrite this message in an assertive and direct tone, while maintaining respect.",
        concise: "Rewrite this message to be clear and concise, getting to the point quickly.",
        supportive: "Rewrite this message to be detailed and encouraging, offering support."
    };

    const selectedPrompt = tonePrompts[tone?.toLowerCase()] || tonePrompts.professional;

    try {
        const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a helpful assistant that rewrites internal messages." },
                    { role: "user", content: `${selectedPrompt}\n\nOriginal Message:\n${text}` }
                ],
                max_tokens: 300  // Raised from 150
            })
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Unexpected response type: ${contentType}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices.length) {
            throw new Error('Invalid API response structure');
        }

        const rewritten_text = data.choices[0].message.content.trim();
        res.status(200).json({ rewritten_text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};
