# Todo-Job

This project allows users to upload screenshots of job descriptions.
The backend processes the image using the Google Gemini API for text extraction and analysis. This extracted information is then used to create a todo item, which is stored in a MongoDB database and displayed on the frontend.
g
## Project Structure

The project is organized as follows:

```
VITE-PROJECT/
├── backend/
│ ├── controllers/
│ │ └── todoController.js                               # Handles todo logic
│ ├── db/
│ │ └── mongo.js                                        # MongoDB connection setup
│ ├── node_modules/
│ ├── routes/
│ │ └── todoRoutes.js                                   # API routes for todos
│ ├── services/
│ │ └── geminiService.js                                # Gemini API interaction
│ ├── package-lock.json
│ ├── package.json
│ └── server.js                                         # Backend server entry point
├── node_modules/                                       # Frontend dev dependencies
├── public/                                             # Static assets for frontend
├── src/                                                # Frontend source code
│ ├── main.js                                           # Frontend JS entry point
│ └── style.css                                         # Global styles
├── .env.local                                          # Local env variables for frontend
├── .gitignore
├── index.html                                          # Main HTML file for frontend
├── package-lock.json
├── package.json                                        
└── README.md
```


## Prerequisites

*   Node.js and npm (or yarn)
*   MongoDB instance running
*   Google Gemini API Key

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone 
    cd VITE-PROJECT
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in the `backend` directory and add your environment variables:
    ```env
    MONGO_URI=your_mongodb_connection_string
    GEMINI_API_KEY=your_gemini_api_key
    ```

3.  **Frontend Setup:**
    Navigate back to the project root:
    ```bash
    cd ..
    npm install
    ```

## Running the Application

1.  **Start MongoDB:** Ensure your MongoDB server is running.

2.  **Start the Backend Server:**
    ```bash
    cd backend
    npm start # Or npm run dev if you have a dev script
    ```
    The backend should be running (e.g., on `http://localhost:3000`).

3.  **Start the Frontend Development Server:**
    In a new terminal, from the project root directory:
    ```bash
    npm run dev
    ```
    The frontend will typically be available at `http://localhost:5173` (Vite's default).

4.  **Open your browser** and navigate to the frontend URL.

## How It Works

1.  The user uploads an image via the frontend interface.
2.  The image is sent to the backend.
3.  The backend's `geminiService.js` sends the image to the Gemini API.
4.  Gemini API returns the extracted text.
5.  The `todoController.js` saves this text into the MongoDB collection via `mongo.js`.
6.  The frontend fetches the list of "todos" (extracted text items) from the backend API (defined in `todoRoutes.js`) and displays them.