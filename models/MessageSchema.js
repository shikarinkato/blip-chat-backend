import mongoose from "mongoose";

const Message = mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    time: { type: String },
  },
  { timeStamp: true }
);

const MessageSchema = mongoose.model("Message", Message);
export default MessageSchema;
