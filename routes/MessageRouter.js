import express from "express";
import AuthHandler from "../middlewares/AuthHandler.js";
import { sendMesage } from "../controllers/Messages.js";

const router = express.Router();

router.post("/send", AuthHandler, sendMesage);

export default router;
