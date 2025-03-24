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


// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Telegram Bot Token - Get this from BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be set in .env file');
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: false });


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

app.post("/api/fetch-media", async (req: Request, res: Response) => {
  fetchMedia(req, res, bot, token)
});

app.use('/api/media', mediaRouter)
app.use('/api/category', categoryRouter)


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

mongoose.connect(process.env.URI as string, {dbName:"Telegam"}).then(() => console.log("Connected to db"
)).catch(e => console.log("DB Error:\n" + e))

