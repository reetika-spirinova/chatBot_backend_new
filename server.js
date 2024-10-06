const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');  // Import CORS middleware

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Use CORS middleware to allow requests from your React app
app.use(cors({ origin: 'http://localhost:3001' }));  // Change this to match your React app's origin

// Hugging Face API endpoint and headers
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';
const headers = {
    'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
    'Content-Type': 'application/json'
};

// Route to handle chatbot conversation
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        console.log('Received message:', userMessage);  // Log user message

        // Send a POST request to Hugging Face Inference API
        const response = await axios.post(
            HUGGING_FACE_API_URL,
            { inputs: userMessage },  // Send user message as inputs
            { headers: headers }       // Include API Key in headers
        );
        
        // Log Hugging Face API response
        console.log('Hugging Face API response:', response.data);

        // Extract chatbot's reply from the response
        const botReply = response.data[0].generated_text;
        console.log('Chatbot reply:', botReply);

        // Send the reply back to the frontend
        res.json({ reply: botReply });
    } catch (error) {
        console.error('Error communicating with Hugging Face API:', error);
        res.status(500).json({ error: 'Failed to communicate with Hugging Face API' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
