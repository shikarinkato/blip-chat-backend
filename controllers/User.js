import UserSchema from "../models/UserSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ErrorHandler from "../middlewares/ErrorHandler.js";
import mongoose from "mongoose";
import ChatSchema from "../models/ChatsSchema.js";
import _ from "lodash";

export const registerUser = async (req, res) => {
  const { fullName, email, password, userName, mobile_number, pic } = req.body;

  try {
    if (!fullName || !email || !password || !userName) {
      return ErrorHandler(res, {
        code: 400,
        message: "All fields are required.",
      });
    }
    const existingUser = await UserSchema.findOne({
      $or: [
        { $and: [{ email }, { userName }, { mobile_number }] },
        { userName },
        { mobile_number },
      ],
    });

    if (existingUser) {
      return ErrorHandler(res, {
        code: 400,
        message:
          "User with provided email, username, or mobile number already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserSchema.create({
      fullName,
      email,
      password: hashedPassword,
      userName,
      mobile_number,
      pic,
      friends: [],
      favourites: [],
      chats: [],
    });

    res.status(201).json({
      message: `Welcome, ${newUser.fullName}! Your account has been created successfully.`,
      success: true,
    });
  } catch (error) {
    ErrorHandler(res, error);
  }
};

export const loginUser = async (req, res) => {
  const { email_Usrnme_mobile, password } = req.body;

  try {
    if (!email_Usrnme_mobile || !password) {
      return res.status(400).json({
        message: "Oops i think we're missing something crucial",
        success: false,
      });
    }

    const isNumeric = /^\d+$/.test(email_Usrnme_mobile);
    const query = isNumeric
      ? { mobile_number: parseInt(email_Usrnme_mobile, 10) }
      : {
          $or: [
            { userName: email_Usrnme_mobile },
            { email: email_Usrnme_mobile },
          ],
        };

    const user = await UserSchema.findOne(query);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return ErrorHandler(res, { code: 401, message: "Invalid Credentials!" });
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: 86400,
    });

    res.status(200).json({
      message: ` Welcome Back ${user.fullName}`,
      success: true,
      token,
    });
  } catch (error) {
    console.log(error);
    ErrorHandler(res, error);
  }
};

export const addToFriend = async (req, res) => {
  let { friend_id } = req.body;
  let user = req.user;

  try {
    if (!friend_id) {
      return ErrorHandler(res, {
        code: 400,
        message: "Required field is Missing",
      });
    }

    if (friend_id === user._id.toString()) {
      return ErrorHandler(res, {
        code: 400,
        message:
          "I think you're out of mind. How can you add yourself to friends?",
      });
    }

    if (!mongoose.isValidObjectId(friend_id)) {
      return ErrorHandler(res, {
        code: 400,
        message: "Provided User's id is Invalid",
      });
    }

    let isInlcudes = await UserSchema.findOne({
      _id: user._id,
      friends: {
        $elemMatch: { friend_id },
      },
    });

    if (isInlcudes) {
      return ErrorHandler(res, {
        code: 400,
        message: "He/she is already in your friend list",
      });
    }

    let friend = await UserSchema.findById(friend_id);

    if (!friend) {
      return ErrorHandler(res, {
        code: 404,
        message:
          "I think he/she doesn't wnat to be your friend. Because we're unable to find him/her",
      });
    }

    user = await UserSchema.findByIdAndUpdate(
      user._id,
      {
        $addToSet: { friends: { friend_id: friend._id } },
      },
      { new: true }
    );

    if (!user) {
      return ErrorHandler(res, {
        code: 404,
        message: "Failed to add friend",
      });
    }

    friend = await UserSchema.findByIdAndUpdate(
      friend._id,
      {
        $addToSet: { friends: { friend_id: user._id } },
      },
      { new: true }
    );

    if (!friend) {
      user = await UserSchema.findByIdAndUpdate(user._id, {
        $pull: { friends: { $elemMatch: { friend_id: user._id } } },
      });
      return ErrorHandler(res, {
        code: 404,
        message: "Failed to add friend",
      });
    }

    res
      .status(201)
      .json({ message: "User added to friends List", success: true });
  } catch (error) {
    // console.log(error);
    ErrorHandler(res, error);
  }
};

export const searchUserByUsername = async (req, res) => {
  const { search } = req.query;
  search;
  const user = req.user;

  if (!search) {
    return ErrorHandler(res, {
      code: 400,
      message: "Username is required",
    });
  }

  try {
    const users = await UserSchema.find({
      $and: [
        {
          $or: [
            {
              userName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              fullName: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
        { _id: { $ne: user._id } },
      ],
    });

    if (users.length === 0) {
      return ErrorHandler(res, {
        code: 404,
        message: "No users found with the given username",
      });
    }

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.log(error);
    ErrorHandler(res, error);
  }
};

export const addToFavourites = async (req, res) => {
  let { friend_id, action } = req.body;
  let user = req.user;
  try {
    if (!friend_id || !action) {
      return ErrorHandler(res, {
        code: 400,
        message: "Required field is Missing",
      });
    }

    if (!mongoose.isValidObjectId(friend_id)) {
      return ErrorHandler(res, {
        code: 400,
        message: "Provided User's id is Invalid",
      });
    }

    let isInlcudes = await UserSchema.findOne({
      _id: user._id,
      friends: {
        $elemMatch: { friend_id },
      },
    });

    if (!isInlcudes) {
      return ErrorHandler(res, {
        code: 404,
        message: "Requested User is not in your friend list",
      });
    }

    let friend = await UserSchema.findById(friend_id);

    let changes =
      action === "add"
        ? { $set: { "friends.$[elem].isFavourite": true } }
        : { $set: { "friends.$[elem].isFavourite": false } };

    user = await UserSchema.findOneAndUpdate(
      {
        _id: user._id,
      },
      changes,
      {
        arrayFilters: [{ "elem.friend_id": friend._id }],
        new: true,
      }
    );

    res.status(201).json({
      message: `User ${
        action == "add" ? "added to" : "removed from"
      } favourites `,
      success: true,
    });
  } catch (error) {
    console.log(error);
    ErrorHandler(res, error);
  }
};

export const getAllFriends = async (req, res) => {
  let user = req.user;
  try {
    let friends = user.friends;
    if (friends.length > 0) {
      res.status(201).json({
        message: ``,
        friends,
        success: true,
      });
    } else {
      res
        .status(200)
        .json({ message: "Currently you're having 0 friends", success: true });
    }
  } catch (error) {
    console.log(error);
    ErrorHandler(res, error);
  }
};

export const getProfile = (req, res) => {
  let user = req.user;
  try {
    res.status(200).json({ message: "Profile fetched ", user, success: true });
  } catch (error) {
    return ErrorHandler(res, error);
  }
};

export const getFriendsProfile = async (req, res) => {
  let { friends } = req.body;
  let user = req.user;
  try {
    friends = friends
      .filter((fr) => fr !== user._id)
      .map((fr) => new mongoose.Types.ObjectId(fr));

    if (!friends || friends.length < 1) {
      return ErrorHandler(res, {
        code: 404,
        message: "You 0 have friends. Try to make some",
      });
    }

    let fetchedFriends = await UserSchema.aggregate([
      {
        $match: {
          _id: { $in: friends },
        },
      },
      {
        $project: { fullName: 1, email: 1, userName: 1, pic: 1 },
      },
    ]);

    let chats = await ChatSchema.aggregate([
      {
        $match: {
          $or: [
            {
              user: user._id,
              anotherUser: { $in: friends },
            },
            {
              user: { $in: friends },
              anotherUser: user._id,
            },
          ],
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "messages",
          foreignField: "_id",
          as: "fullMessages",
        },
      },
      {
        $addFields: {
          lastMessage: { $slice: ["$fullMessages", -1] },
        },
      },

      {
        $project: {
          chat_id: "$_id",
          user: {
            $cond: {
              if: { $eq: ["$anotherUser", user._id] },
              then: "$user",
              else: "$anotherUser",
            },
          },
          startDate: 1,
          endDate: 1,
          lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
        },
      },
    ]);

    chats = chats.map((chat) => {
      let res = fetchedFriends.find((fr) => {
        return fr._id.toString() === chat.user.toString();
      });

      return _.merge(chat, res);
    });

    res.status(200).json({
      message: "Done",
      success: true,
      chats,
    });
  } catch (error) {
    console.log(error);
    return ErrorHandler(res, error);
  }
};


