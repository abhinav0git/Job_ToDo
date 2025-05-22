const { ObjectId } = require('mongodb');
const { getTodoCollection } = require('../db/mongo');
const { analyzeImageWithGemini } = require('../services/geminiService');

function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

exports.processImage = async (req, res) => {
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
      status: 'pending', // Default status
    };
    const insertResult = await todoCollection.insertOne(newTodo);

    if (!insertResult.insertedId) {
        console.error("MongoDB insertOne failed to return an insertedId", insertResult);
        return res.status(500).json({ error: 'Failed to save todo to database'});
    }
    
    res.status(201).json({
      message: 'Image processed and todo created.',
      todo: { _id: insertResult.insertedId, ...newTodo, id: insertResult.insertedId }, // Ensure 'id' is present for frontend if it expects it
    });
  } catch (error) {
    console.error('Error in processImage:', error);
    res.status(500).json({ error: 'Failed to process image', details: error.message });
  }
};

exports.getTodos = async (req, res) => {
  try {
    const todoCollection = await getTodoCollection();
    const todos = await todoCollection.find({}).sort({ createdAt: -1 }).toArray();
    res.json(todos);
  } catch (err) {
    console.error('Error in getTodos:', err);
    res.status(500).json({ error: 'Failed to fetch todos', details: err.message });
  }
};

exports.updateTodo = async (req, res) => {
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
};

exports.deleteTodo = async (req, res) => {
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
};