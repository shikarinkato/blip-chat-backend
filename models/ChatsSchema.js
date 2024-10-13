import mongoose from "mongoose";

const Chat = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  anotherUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: { type: Date },
  endDate: { type: Date },
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
});
const ChatSchema = mongoose.model("Chat", Chat);

export default ChatSchema;
