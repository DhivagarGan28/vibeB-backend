require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to DB
connectDB();

// Middlewares
app.use(helmet());
app.use(express.json());

app.use(
     cors({
          origin: "http://localhost:5173",
          credentials: true,
     },
     {
         origin:"https://vibe-b.netlify.app",
         credentials:true, 
     })
);

// Routes
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => res.json({ ok: true, message: 'VibeB API running' }));

app.listen(PORT, () => {
     console.log(`Server started on port ${PORT}`);
});
