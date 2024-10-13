import mongoose from "mongoose";

const User = mongoose.Schema({
  fullName: { type: String },
  email: { type: String },
  password: { type: String },
  userName: { type: String },
  mobile_number: { type: Number },
  pic: { type: String },
  
  friends: [
    {
      friend_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      isFavourite: { type: Boolean, default: false },
    },
  ],
  chats: [
    {
      chat_id: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    },
  ],
});

const UserSchema = mongoose.model("user", User);

export default UserSchema;
