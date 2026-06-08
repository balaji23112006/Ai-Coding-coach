import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Export a configured Groq Client for querying Qwen models
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'mock_key_val'
});
