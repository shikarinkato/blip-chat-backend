import express from "express";
import AuthHandler from "../middlewares/AuthHandler.js";
import { getFriendsProfile } from "../controllers/User.js";
import { createChat, fetchFriendChats } from "../controllers/Chats.js";

const router = express.Router();

router.get("/all-friends", AuthHandler, getFriendsProfile);
router.get("/friends/:friend_id", AuthHandler, fetchFriendChats);

router.post("/create", AuthHandler, createChat);

export default router;
