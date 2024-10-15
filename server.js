const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const natural = require('natural');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default to 3001

app.use(cors({
    origin: 'https://civilbrain.ai' // Update with your frontend URL if necessary
}));

// Middleware to parse JSON request bodies
app.use(express.json());

// Use Jaro-Winkler algorithm for similarity comparison
const stringSimilarity = natural.JaroWinklerDistance;

// Preprocessing function to clean text (remove punctuation, extra spaces, etc.)
const preprocessText = (text) => {
    return text.replace(/[^\w\s]/gi, '').toLowerCase().trim();
};

// Function to read and search responses from a PDF document with intelligent matching
const getResponseFromPDF = async (query) => {
    try {
        const pdfBuffer = fs.readFileSync('response.pdf'); // Read the PDF file
        const data = await pdfParse(pdfBuffer); // Parse the PDF
        const text = data.text; // Extract text content from the PDF

        console.log("Extracted Text:", text); 

        const lines = text.split('\n'); // Split the text content into lines
        let response = "Sorry, I don't understand your request."; // Default response
        let bestMatch = { question: "", answer: "", score: 0 }; // Track the best match
        let currentAnswer = ""; // To accumulate multi-line answers
        let isAnswering = false; // Flag to track if we're appending lines to the current answer

        // Preprocess the query
        const cleanedQuery = preprocessText(query);

        // Iterate through each line to find a match
        for (let line of lines) {
            console.log("Processing line:", line);

            // Check if the line contains a question and answer (based on presence of colon ":")
            if (line.includes(":")) {
                // We have encountered a new question, process the previous answer if we were appending lines
                if (isAnswering) {
                    bestMatch.answer = currentAnswer.trim(); // Finalize the multi-line answer
                    isAnswering = false;
                }

                // Split the line into question and answer parts
                const [question, ...answerParts] = line.split(':');
                const answer = answerParts.join(':').trim();

                // Preprocess the question
                const cleanedQuestion = preprocessText(question);

                // Compare the user's query with the question using Jaro-Winkler similarity
                const similarityScore = stringSimilarity(cleanedQuery, cleanedQuestion);

                console.log(`Similarity between "${cleanedQuery}" and "${cleanedQuestion}": ${similarityScore}`);

                // If this is the best match so far, start capturing the answer
                if (similarityScore > bestMatch.score) {
                    bestMatch = { question, answer, score: similarityScore };
                    currentAnswer = answer; // Start a new answer block
                    isAnswering = true; // Set flag to continue appending lines
                }
            } else if (isAnswering) {
                // If we are currently capturing an answer, append the next line to the answer
                currentAnswer += " " + line.trim();
            }
        }

        // Make sure to capture any answer if the best match ended on the last line
        if (isAnswering) {
            bestMatch.answer = currentAnswer.trim();
        }

        // Lower the similarity threshold to allow better matches
        if (bestMatch.score > 0.5) { // Adjusted threshold from 0.7 to 0.5
            response = bestMatch.answer;
        }

        return response;
    } catch (error) {
        console.error('Error reading PDF:', error);
        return "There was an error processing your request.";
    }
};

// Route to handle chatbot conversation
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        console.log('Received message:', userMessage);  // Log user message

        // Get response based on user message from the PDF
        const botReply = await getResponseFromPDF(userMessage);
        console.log('Chatbot reply:', botReply);

        // Send the reply back to the frontend
        res.json({ reply: botReply });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process your request' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
