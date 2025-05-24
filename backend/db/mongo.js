const { MongoClient } = require('mongodb');
require('dotenv').config();
let db;


const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "todos";

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

exports.getTodoCollection = async () => {
  if (!db || !client.topology || !client.topology.isConnected()) {
    await connectDB();
  }
  return db.collection("collection-todos");
};

// (Optional)close connection when the application is shutting down
// process.on('SIGINT', async () => {
//   if (client && client.topology && client.topology.isConnected()) {
//     await client.close();
//     console.log("MongoDB connection closed.");
//   }
//   process.exit(0);
// });