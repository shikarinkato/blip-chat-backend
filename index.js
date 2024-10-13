import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import UserRouter from "./routes/UserRouter.js";
import ChatsRouter from "./routes/ChatsRouter.js";
import MessagesRouter from "./routes/MessageRouter.js";
import { extractUser } from "./middlewares/extractUser.js";
import MessageSchema from "./models/MessageSchema.js";
import UserSchema from "./models/UserSchema.js";
import cookieParser from "cookie-parser";
import ChatSchema from "./models/ChatsSchema.js";
import ErrorHandler from "./middlewares/ErrorHandler.js";

const app = express();

config({ path: "./db/config.env" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
export const httpServer = createServer(app);

let activeUsers = new Map();
const io = new Server(httpServer, {
  cors: {
    origin: `${process.env.FRONTEND_URL}`,
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  },
});

const offlineMessages = {};

io.on("connection", async (socket) => {
  let token = socket.handshake.query.token;

  try {
    let user = await extractUser(token);

    if (!user) {
      socket.emit("error", { code: 403, message: "Token is invalid" });
      socket.disconnect();
      return;
    }

    console.log("User connected:", user.id);
    user = await UserSchema.findById(user.id);

    while (offlineMessages[user._id]) {
      console.log("Old messages send");
      if (offlineMessages[user._id] && offlineMessages[user._id].length > 0) {
        socket.emit("old-messages", offlineMessages[user._id]);
        delete offlineMessages[user._id];
      }
    }

    let room = 0;

    activeUsers.set(user.id, socket.id);
    io.emit("update-active-users", Array.from(activeUsers.keys()));

    socket.on("update-user-heared", ({ message }) => {
      console.log(message);
    });

    socket.on("initiate-chat", (friendRoom, userRoom, friendID) => {
      let rooms = io.sockets.adapter.rooms;
      const myRoom = rooms.get(friendRoom);

      if (myRoom && myRoom.size > 0) {
        socket.join(friendRoom);
        socket.emit("room-already", friendRoom);
      } else {
        console.log("new Room joined: ", userRoom);
        socket.join(userRoom);
        activeUsers.has(friendID) &&
          io.to(activeUsers.get(friendID)).emit("join-room", userRoom);
      }

      // console.log("first user", io.sockets.adapter.rooms.get(roomID));
    });

    socket.on("join-room", (roomID) => {
      socket.join(roomID);
      room = roomID;

      socket.emit("room-joined", roomID);
    });

    socket.on("send-message", (roomID, msgObj) => {
      let another = msgObj.receiver_id;

      let rooms = io.sockets.adapter.rooms;
      let anthrSocket = activeUsers.get(another);

      let myRoom = rooms.get(roomID);

      let isBoth = false;

      console.log(myRoom);
      console.log("My room id: ", roomID);

      if (myRoom) {
        isBoth = myRoom.has(anthrSocket);
      }

      let sendMesage = async () => {
        try {
          if (!msgObj.sender_id || !msgObj.receiver_id || !msgObj.message) {
            throw new Error("Required fields are missing");
          }

          let chat = await ChatSchema.findOne({
            $or: [{ user: msgObj.sender_id }, { user: msgObj.receiver_id }],
            $or: [
              { anotherUser: msgObj.sender_id },
              { anotherUser: msgObj.receiver_id },
            ],
          });

          const time = new Date();

          let message = await MessageSchema.create({
            sender_id: msgObj.sender_id,
            receiver_id: msgObj.receiver_id,
            message: msgObj.message,
            time: `${time.getHours()}:${time.getMinutes()}`,
          });

          if (!message) {
            io.to(roomID).emit("message-fail", () => {
              message._id;
            });
            message = await MessageSchema.findByIdAndDelete(message._id);
          } else {
            chat = await ChatSchema.findByIdAndUpdate(chat._id, {
              $push: { messages: message._id },
            });

            if (!chat) {
              io.to(roomID).emit("message-fail", () => {
                message._id;
              });
              message = await MessageSchema.findByIdAndDelete(message._id);
            } else {
              console.log("New message");
              io.to(roomID).emit("new-message", message);
              // socket.to(anthrSocket).emit("new-message",message)

              if (activeUsers.has(another)) {
                if (!isBoth) {
                  socket
                    .to(anthrSocket)
                    .emit(
                      "new-message-friend",
                      (msgObj.sender_id, msgObj.message)
                    );
                }
              } else {
                if (!offlineMessages[another]) {
                  offlineMessages[another] = [];
                }
                offlineMessages[another].push(message.message);
              }
            }
          }
        } catch (error) {
          throw new Error(error.message);
        }
      };
      sendMesage();
    });

    socket.on("leave-room", (roomID) => {
      socket.leave(roomID);
    });

    socket.on("check-active-users", () => {
      io.emit("update-active-users", Array.from(activeUsers.keys()));
    });

    socket.on("disconnect", () => {
      activeUsers.delete(user.id);
      io.emit("update-active-users", Array.from(activeUsers.keys()));
      console.log("User disconnected:", user.id);
      socket.leave(room);
      io.to(room).disconnectSockets(true);
    });

    console.log(activeUsers);
  } catch (error) {
    console.error("Error extracting user:", error.message);

    if (error.name === "JsonWebTokenError") {
      error.message + ". Please login again ";
    }

    socket.emit("error", error);
    socket.disconnect();
  }
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hii Lavdya", success: true });
});

app.use("/api/v2/user", UserRouter);
app.use("/api/v2/chats", ChatsRouter);
app.use("/api/v2/messages", MessagesRouter);
