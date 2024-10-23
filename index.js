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
import { log } from "console";

const app = express();

config({ path: "./db/config.env" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
export const httpServer = createServer(app);

let activeUsers = new Map();
let disconnectMap = new Map();
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

    if (disconnectMap.has(user.id)) {
      clearTimeout(disconnectMap.get(user._id));
      disconnectMap.delete(user.id);
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
    socket.on("call-update-users", () => {
      //setting a timer so the update active users emited after time so it can
      updateUsersTimer = setTimeout(() => {
        //emit event globally to inform all users to online users
        io.emit(
          "update-active-users",
          Array.from(activeUsers.keys()),
          (err, ack) => {
            // if (err) {
            //   console.log("Ack is not got Heared");
            //   // console.log(err);
            // } else {
            //   console.log("Ack is heared");
            //   console.log(ack);
            // }
          }
        );
      }, 1000);
    });

    socket.on("update-user-heared", ({ message }) => {
      console.log(message);
    });

    socket.on("initiate-chat", (friendRoom, userRoom, friendID) => {
      let rooms = io.sockets.adapter.rooms;
      const frRoom = rooms.get(friendRoom);
      const myRoom = rooms.get(userRoom);

      // console.log("Friend Room: ", frRoom);
      // console.log("Friend Room ID: ", friendRoom);
      // console.log("User Room: ", myRoom);

      if (frRoom && frRoom.size > 0) {
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

      console.log(roomID);

      // console.log(msgObj.message);

      let rooms = io.sockets.adapter.rooms;
      let anthrSocket = activeUsers.get(another);

      let myRoom = rooms.get(roomID);

      let isBoth = false;

      console.log(myRoom);
      console.log("My room id: ", roomID);

      console.log("Users: ", activeUsers.keys());

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

    console.log("Rooms: ", io.sockets.adapter.rooms);

    socket.on("disconnect", () => {
      activeUsers.delete(user.id);
      if (!disconnectMap.has(user.id)) {
        disconnectMap.set(
          user.id,
          setTimeout(() => {
            io.emit("update-active-users", Array.from(activeUsers.keys()));
            socket.leave(room);
            disconnectMap.delete(user.id);
          }, 5000)
        );
      }

      console.log("User disconnected:", user.id);
      // io.to(room).disconnectSockets(true);
    });
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
app.get("/api/v2/allUsers", async (req, res) => {
  try {
    let users = await UserSchema.find();
    // console.log(users);
    res.status(200).json({ users });
  } catch (error) {
    console.log(error);
  }
});
