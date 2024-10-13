import MessageSchema from "../models/MessageSchema.js";
import ErrorHandler from "../middlewares/ErrorHandler.js";
import ChatSchema from "../models/ChatsSchema.js";

export const getMessages = async (messagesID) => {
  try {
    if (!messagesID) {
      throw new Error("Chat id not found");
    }

    let messages = await MessageSchema.find({ _id: { $in: messagesID } });

    return messages;
  } catch (error) {
    throw new Error(error.messsage);
  }
};

export const sendMesage = async (req, res) => {
  let { sender_id, receiver_id, message } = req.body;
  let user = req.user;
  try {
    if (!sender_id || !receiver_id || !message) {
      return ErrorHandler(res, {
        code: 404,
        message: "Required fields are missing",
      });
    }

    let chat = await ChatSchema.findOne({
      $or: [{ user: sender_id }, { user: receiver_id }],
      $or: [{ anotherUser: sender_id }, { anotherUser: receiver_id }],
    });

    const time = new Date();

    message = await MessageSchema.create({
      sender_id,
      receiver_id,
      message,
      time: `${time.getHours()}:${time.getMinutes()}`,
    });

    if (!message) {
      return ErrorHandler(res, {
        code: 400,
        message: "Failed to send message",
      });
    }

    chat = await ChatSchema.findByIdAndUpdate(chat._id, {
      $push: { messages: message._id },
    });

    if (!chat) {
      message = await MessageSchema.findByIdAndDelete(message._id);
      return ErrorHandler(res, {
        code: 400,
        message: "Failed to send message",
      });
    }

    res.status(201).json({ message: "Message sent", success: true });
  } catch (error) {
    return ErrorHandler(res, error);
  }
};

