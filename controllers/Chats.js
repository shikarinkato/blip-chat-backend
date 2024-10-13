import mongoose from "mongoose";
import ErrorHandler from "../middlewares/ErrorHandler.js";
import ChatSchema from "../models/ChatsSchema.js";
import UserSchema from "../models/UserSchema.js";
import { getMessages } from "./Messages.js";

export const createChat = async (req, res) => {
  let { friend_id } = req.body;
  let user = req.user;

  try {
    if (!friend_id) {
      return ErrorHandler(res, {
        code: 404,
        message: "Requried fields are missing",
      });
    }

    let chat = await ChatSchema.findOne({
      $or: [
        { user: user._id, anotherUser: friend_id },
        { user: friend_id, anotherUser: user._id },
      ],
    });

    if (chat) {
      return res.status(200).json({ success: true, message: "Enjoy chatting" });
    }

    let time = new Date();
    time = time.toUTCString();

    chat = await ChatSchema.create({
      user: user._id,
      anotherUser: friend_id,
      startDate: time,
      endDate: time,
      messages: [],
    });

    if (!chat) {
      return ErrorHandler(res, { code: 400, message: "Failed to create chat" });
    }

    user = await UserSchema.findByIdAndUpdate(
      user._id,
      {
        $addToSet: { chats: { chat_id: chat._id } },
      },
      { new: true }
    );

    friend_id = await UserSchema.findByIdAndUpdate(
      friend_id,
      {
        $addToSet: { chats: { chat_id: chat._id } },
      },
      { new: true }
    );

    if (!user) {
      chat = await ChatSchema.findByIdAndDelete(chat._id);

      return ErrorHandler(res, {
        code: 400,
        message: "Failed to create chat",
      });
    }

    res.status(201).json({ success: true, message: "Chat created", chat });
  } catch (error) {
    console.log(error.message);
    return ErrorHandler(res, error);
  }
};

export const fetchFriendChats = async (req, res) => {
  let { friend_id } = req.params;
  let user = req.user;
  try {
    if (!friend_id) {
      return ErrorHandler(res, {
        code: 404,
        message: "Required fields are missing",
      });
    }

    let other = await UserSchema.findById(friend_id);
    if (!other) {
      return ErrorHandler(res, {
        code: 400,
        message:
          "We don't think he/she have an account, Cause we can't find him/her",
      });
    }

    let chats = await ChatSchema.aggregate([
      {
        $match: {
          $or: [
            {
              user: new mongoose.Types.ObjectId(user._id),
              anotherUser: new mongoose.Types.ObjectId(friend_id),
            },
            {
              user: new mongoose.Types.ObjectId(friend_id),
              anotherUser: new mongoose.Types.ObjectId(user._id),
            },
          ],
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "messages",
          foreignField: "_id",
          as: "allMessages",
          pipeline: [{ $sort: { createdAt: -1 } }],
        },
      },

      {
        $lookup: {
          from: "users",
          let: { friend: new mongoose.Types.ObjectId(friend_id) },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$friend"] },
              },
            },
            {
              $project: {
                _id: 1,
                fullName: 1,
                userName: 1,
                pic: 1,
                friends: 1,
              },
            },
          ],
          as: "friendProfile",
        },
      },
      {
        $project: {
          _id: 1,
          user: 1,
          anotherUser: 1,
          startDate: 1,
          endDate: 1,
          allMessages: 1,
          friendProfile: 1,
        },
      },
    ]);

    res.status(200).json({ message: "Done", chats, success: true });
  } catch (error) {
    console.log(error.message);
    ErrorHandler(res, error);
  }
};
