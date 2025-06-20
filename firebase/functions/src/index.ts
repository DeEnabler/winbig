
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

// Initialize the Express app
const app = express();

// Enable CORS for all routes, which is necessary for frontend calls
app.use(cors({ origin: true }));

// A simple health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  console.log('Health check endpoint hit.');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: "WinBig API is up and running!"
  });
});

// Placeholder for other function endpoints
// For example:
// app.get('/markets/live-odds/:category?', ...)

// Export the Express app as a Firebase Function named 'api'.
// This is the name you will see in your Firebase console.
export const api = functions.https.onRequest(app);
