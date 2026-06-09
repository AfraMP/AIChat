const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type'],
}));


const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is not set in .env file');
  process.exit(1);
}


function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Messages must be a non-empty array';
  }
  for (const msg of messages) {
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      return `Invalid role: ${msg.role}`;
    }
    if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
      return 'Each message must have non-empty string content';
    }
    if (msg.content.length > 4000) {
      return 'Message content too long (max 4000 chars)';
    }
  }
  return null;
}

app.post('/api/chat', async (req, res) => {
  const { messages, model = 'llama-3.3-70b-versatile' } = req.body;

  const validationError = validateMessages(messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const allowedModels = [
    'llama-3.3-70b-versatile'
  ];
  if (!allowedModels.includes(model)) {
    return res.status(400).json({ error: 'Invalid model selected' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant. Be concise, accurate, and helpful. Format responses clearly.`,
    };
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [systemMessage, ...messages],
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('Groq API error:', errorData);
      res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
      return res.end();
    }

    groqResponse.body.on('data', (chunk) => {
      res.write(chunk);
    });

    groqResponse.body.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    groqResponse.body.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });

    req.on('close', () => {
      groqResponse.body.destroy();
    });

  } catch (error) {
    console.error('Server error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const listModels = fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }).then(async(data) => {
      data  = await data.json()
      console.log(data)
    })

app.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});
