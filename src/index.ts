// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { features } from "process";
import { fetchMedia } from "./services/fetchMedia";
import mediaRouter from "./routes/mediaRoute";
import mongoose from "mongoose";
import categoryRouter from "./routes/categoryRoute";
import bodyParser from "body-parser";
import axios from "axios";


// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Telegram Bot Token - Get this from BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be set in .env file');
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: false });
(global as any).bot = bot


// CORS middleware
app.use(cors({ origin: "*" })); // Allow all origins

// Middleware to handle JSON requests
app.use(express.json());
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));


// Basic route
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

//Fetch media
app.post("/api/fetch-media", async (req: Request, res: Response) => {
  fetchMedia(req, res, bot, token)
});

// Fetch sticker files(tgs) for frontend rendering
app.post('/api/fetch-tgs', async (req: Request, res: Response) => {
  const { url } = req.body; // Get the Telegram file URL from the query

  try {
    // Fetch the .tgs file from Telegram
    const response = await axios.get(url as string, { responseType: "arraybuffer" });

    // Set response headers
    res.set("Content-Type", "application/gzip"); // .tgs files are gzipped JSON
    res.send(response.data); // Send the raw binary data to the frontend
  } catch (error) {
    console.error("Error fetching .tgs file:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
})

app.use('/api/media', mediaRouter)
app.use('/api/category', categoryRouter)



// Start the server
app.listen(port, () => {
  console.log(`Server running at Port:${port}`);
});

mongoose.connect(process.env.URI as string, { dbName: "Telegam" }).then(() => console.log("Connected to db"
)).catch(e => console.log("DB Error:\n" + e))

