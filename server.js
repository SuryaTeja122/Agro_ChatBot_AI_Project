const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());

// ❗ DO NOT use express.json() here – it breaks multipart/form-data

// Use memory storage for uploaded images
const upload = multer({ storage: multer.memoryStorage() });

let lastUploadedImages = []; // 🧠 In-memory image tracking

/**
 * POST /api/chat
 * Accepts chatHistory and image files, sends prompt to Groq (text-only models).
 */
app.post('/api/chat', upload.array('images'), async (req, res) => {
  console.log('📥 Incoming request received');
  console.log('📡 Content-Type:', req.headers['content-type']);

  const chatHistoryRaw = req.body.chatHistory;
  let parsedHistory = [];

  // Parse chat history
  try {
    parsedHistory = JSON.parse(chatHistoryRaw || '[]');
  } catch (err) {
    console.error('❌ Invalid JSON in chatHistory:', err);
    return res.status(400).json({ error: 'Invalid JSON in chatHistory.' });
  }

  const files = req.files || [];
  console.log('🖼️ Uploaded images:', files.length);

  if (files.length > 0) {
    files.forEach(file => {
      console.log(`- ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
    });
  }

  // Build prompt text from chat history
  let textContent = parsedHistory.map((msg) => msg.content).join('\n');

  if (files.length > 0) {
    const imageContents = files.map(file => ({
      type: 'image_url',
      image_url: {
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      },
    }));

    lastUploadedImages = imageContents;
  } else {
    // If user references previous image
    const lastUserMessage = parsedHistory[parsedHistory.length - 1]?.content?.toLowerCase() || '';
    const refersToImage = /that image|in the image|previous image/.test(lastUserMessage);

    if (refersToImage && lastUploadedImages.length > 0) {
      textContent += `\n(Note: Previous image mentioned, but this model does not support image inputs.)`;
    }
  }

  // Check if the textContent is empty, and ensure that a prompt is being sent
if (!textContent.trim() && lastUploadedImages.length === 0) {
  return res.status(400).json({ error: 'Empty prompt and no images provided.' });
}

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: files.length > 0
        ? [
            {
              role: 'system',
              content: 'You are a helpful, friendly AI assistant. You answer questions on a wide range of topics including science, technology, education, daily life, agriculture, and more. Always respond clearly and helpfully.',
            },
            ...files.map((file) => ({
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                  },
                },
                {
                  type: 'text',
                  text: `Analyze this image thoroughly. Do NOT reuse info from earlier images. This is a fresh analysis.
      
      Use this format:
      
      ---
      
      **Title:**  
      Clearly name the subject (e.g., Guava Tree, Mango Tree, Jeep, Lake, Damaged Road, Urban Building, Beach Hut, etc.)
      
      ---
      
      **Visual Description:**  
      - Main elements (color, shape, material, layout)  
      - Environmental setting (rural, urban, desert, etc.)  
      - Light/shadow, time of day  
      - Condition (new, damaged, clean, overgrown)  
      
      ---
      
      **Diagnostic Observations (if applicable):**  
      - Health of plants, damage to buildings/vehicles, signs of wear  
      - Causes (e.g., pest, rust, neglect, aging, sunburn)  
      - Symptoms (yellowing, cracks, leaks, stains, missing parts)  
      
      ---
      
      **Suggested Actions / Recommendations (if applicable):**  
      - Fixes, treatments, care tips  
      - Preventive measures  
      - Expert suggestions or next steps`,
                },
              ],
            })),
          ]
        : [
            {
              role: 'system',
              content: 'You are a helpful, friendly AI assistant. You answer questions on a wide range of topics including science, technology, education, daily life, agriculture, and more. Always respond clearly and helpfully.',
            },
            {
              role: 'user',
              content: textContent || 'Please analyze the input carefully.',
            },
          ],
      
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROOQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices[0]?.message?.content || 'No response from LLM.';
    res.json({ reply });

  } catch (err) {
    console.error('❌ Error communicating with Groq API:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }

    res.status(500).json({ error: 'Something went wrong with GROQ API' });
  }
});


// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
