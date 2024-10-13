import mongoose from "mongoose";
import ErrorHandler from "../middlewares/ErrorHandler.js";
import { response } from "express";

export const connectToDatabase = async () => {
  let res = await mongoose
    .connect(process.env.DATABASE_URL, {
      dbName: "Blip-ChatApp",
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Failed to connect to MongoDB", err.message));
};
