import {
  addToFavourites,
  addToFriend,
  getAllFriends,
  getFriendsProfile,
  getProfile,
  loginUser,
  registerUser,
  searchUserByUsername,
} from "../controllers/User.js";
import express from "express";
import AuthHandler from "../middlewares/AuthHandler.js";

const router = express.Router();

router.get("/search-user", AuthHandler, searchUserByUsername);
router.get("/friends/get-all", AuthHandler, getAllFriends);
router.get("/profile", AuthHandler, getProfile);

router.put("/login", loginUser);
router.put("/friends/add", AuthHandler, addToFriend);
router.put("/friends/favourites/add", AuthHandler, addToFavourites);
router.put("/friends/profiles", AuthHandler, getFriendsProfile);

router.post("/register", registerUser);

export default router;
