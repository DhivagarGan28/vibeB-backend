
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middlewares
app.use(helmet());
app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://vibe-b.netlify.app',
    'http://localhost:4200',
    'https://vibeb-backend.onrender.com',
    'https://my-portfolio-dhivagar.netlify.app'
  ],
  credentials: true,
}));

app.use('/api/auth', require('./routes/auth'));


app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'VibeB API running'
  });
});


app.post('/aichatbot', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        message: 'Please provide a valid message'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing');
      return res.status(500).json({
        message: 'AI service is not configured'
      });
    }

    const response = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-6-luna',
          input: message.trim()
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);

      return res.status(response.status).json({
        message: data.error?.message || 'OpenAI request failed'
      });
    }
    var output;
    let arr = data.output;
    for(let val in arr){
        if(data[val]['type'] == 'message' && data[val]['status'] == 'complete'){
          output = data[val]['content']
        }
    }
    res.json({
      success: true,
      result: output
    });

  } catch (err) {
    console.error('Chatbot error:', err.message);

    res.status(500).json({
      message: 'Something went wrong while processing your request'
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});