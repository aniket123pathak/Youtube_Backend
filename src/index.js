import { config } from "dotenv";
config({ path: './.env' });
import connectDB from "./db/index.js";

connectDB();



