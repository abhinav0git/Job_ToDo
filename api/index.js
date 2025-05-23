import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();



async function analyzeImageWithGemini(imagePart) {
  const API_KEY = process.env.GEMINI_API_KEY;
  console.log("gemini called with API_KEY:", API_KEY.slice(0,5));
  if(!API_KEY) console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");

  const genAI = new GoogleGenerativeAI(API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  const prompt = 
    `Analyze the provided job posting image. Extract only the essential information for a job applicant to create a concise to-do list for applying.
    The output should be highly scannable and actionable. Focus on:
    Hiring Company:
    Job Role(s) & Experience (if brief and clear): (e.g., SDE 1 (1-3 yrs), SDE Intern)
    Primary Application Action(s): (List these as actionable steps)
    - If an application/JD link exists: Action: Apply via Link: [URL]
    - If email application is an option: Action: Email [Email Address] with Subject: "[Specific Subject, if any]" (Mention resume if implied/stated)
    - If direct message/referral contact is primary: Action: Contact [Person's Name/Profile] via [Platform, e.g., LinkedIn DM] for [Role] referral. (Mention sending resume)
    Key Contact for Application (if applicable for email/DM): (e.g., Pracheta Das)
    Location (briefly, if on-site): (e.g., HSR Layout, Bangalore)
    If information for a specific action (e.g., subject line) is missing, note it as 'Subject: (not specified)' or similar.
    Omit other descriptive text, reasons for hiring, or general hashtags unless they are part of an actionable instruction (like a specific hashtag for a referral).
    Prioritize direct application methods.`;

    try {
        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;

        if (!response || typeof response.text !== 'function') {
        console.error('Invalid Gemini response structure:', response);
        throw new Error('Invalid Gemini response: No text function found or response undefined.');
        }
        
        const text = response.text();
        console.log("Gemini raw response text:", text); 
        return text;
    } catch (error) {
        console.error("Error during Gemini API call:", error);
        // specific Gemini error types are not covered rn, e.g., billing issues, quota etc
        if (error.message.includes('quota') || error.message.includes('billing')) {
            throw new Error('Gemini API request failed due to quota or billing issues. Please check your Google Cloud account.');
        }
        throw new Error(`Failed to analyze image with Gemini: ${error.message}`);
  }
}


// --- MongoDB ---
const MONGODB_URI = process.env.MONGODB_URI;
console.log("MONGODB_URI:", process.env.MONGODB_URI);
const DB_NAME = "todos"; 

if (!MONGODB_URI) {
  console.error("FATAL ERROR: MONGODB_URI environment variable is not set.");
}

let db;
const client = new MongoClient(MONGODB_URI);

async function connectDB() {
  if (db && client.topology && client.topology.isConnected()) {
    return db;
  }
  try {
    await client.connect();
    db = client.db(DB_NAME);
    console.log("Connected to MongoDB:", db.databaseName);
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    throw err;
  }
}

async function getTodoCollection() {
  if (!db || !client.topology || !client.topology.isConnected()) {
    await connectDB();
  }
  return db.collection("collection-todos");
}

// --- controller ---
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

const todoController = {
  processImage: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    try {
      const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
      const extractedText = await analyzeImageWithGemini(imagePart);

      if (!extractedText || !extractedText.trim()) {
        console.log("Gemini returned no text or only whitespace.");
        return res.status(200).json({ message: 'No text found in the image.', extractedText: "" });
      }

      const todoCollection = await getTodoCollection();
      const newTodo = {
        text: extractedText.trim(),
        createdAt: new Date(),
        status: 'pending',
      };
      const insertResult = await todoCollection.insertOne(newTodo);

      if (!insertResult.insertedId) {
          console.error("MongoDB insertOne failed to return an insertedId", insertResult);
          return res.status(500).json({ error: 'Failed to save todo to database'});
      }
      
      res.status(201).json({
        message: 'Image processed and todo created.',
        todo: { ...newTodo, _id: insertResult.insertedId, id: insertResult.insertedId },
      });
    } catch (error) {
      console.error('Error in processImage:', error);
      res.status(500).json({ error: 'Failed to process image', details: error.message });
    }
  },

  getTodos: async (req, res) => {
    try {
      const todoCollection = await getTodoCollection();
      const todos = await todoCollection.find({}).sort({ createdAt: -1 }).toArray();
      res.json(todos);
    } catch (err) {
      console.error('Error in getTodos:', err);
      res.status(500).json({ error: 'Failed to fetch todos', details: err.message });
    }
  },

  updateTodo: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid todo ID format.' });
    }
    if (!status || !['pending', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value. Must be "pending" or "completed".' });
    }

    try {
      const todoCollection = await getTodoCollection();
      const result = await todoCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Todo not found.' });
      }
      if (result.modifiedCount === 0 && result.matchedCount === 1) {
          return res.json({ message: 'Todo status was already set to the desired value.'});
      }
      res.json({ message: 'Todo updated successfully.' });
    } catch (err) {
      console.error('Error in updateTodo:', err);
      res.status(500).json({ error: 'Failed to update todo', details: err.message });
    }
  },

  deleteTodo: async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid todo ID format.' });
    }

    try {
      const todoCollection = await getTodoCollection();
      const result = await todoCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Todo not found.' });
      }
      res.json({ message: 'Todo deleted successfully.' });
    } catch (err) {
      console.error('Error in deleteTodo:', err);
      res.status(500).json({ error: 'Failed to delete todo', details: err.message });
    }
  }
};

// --- express app and routes ---
const app = express();

// CORS Configuration
// for production, restrict this to your actual frontend domain
// const frontendURL = process.env.FRONTEND_URL || 'https://job-to-do-abhinav-project-6969.vercel.app';

const allowedOrigins = ["*"];

if (process.env.NODE_ENV === 'development') {
    console.log("Development mode: CORS is fully open (all origins allowed).");
}

// all origins
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

const router = express.Router();

router.get('/todos', todoController.getTodos);
router.post('/process-image', upload.single('screenshot'), todoController.processImage);
router.put('/todos/:id', todoController.updateTodo);
router.delete('/todos/:id', todoController.deleteTodo);

// mounting the router under the /api prefix
app.use('/api', router);
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log('Server listening on port 3000');
// });

export default app;


// --- Optional: For local development ---
// This allows you to run `node api/index.js` locally for testing.
// if (process.env.NODE_ENV !== 'production' && require.main === module) {
//   const PORT = process.env.PORT || 3000;
//   // Attempt to connect to DB before starting server for local dev
//   connectDB().then(() => {
//     app.listen(PORT, () => {
//       console.log(`Server running locally for development on http://localhost:${PORT}`);
//       console.log(`Ensure your MONGODB_URI is set in .env.local (located at ${require('path').join(__dirname, '../../.env.local')})`);
//       if (!MONGODB_URI) {
//         console.warn("MONGODB_URI is not set. Database operations will fail.");
//       }
//     });
//   }).catch(err => {
//     console.error("Failed to connect to database. Server not started.", err);
//     process.exit(1);
//   });
// }