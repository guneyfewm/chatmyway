const express = require("express");
const mongoose = require("mongoose");
const MessageListModel = require("./schemas/roomSchema");
const userRouter = require("./routers/userRouter");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const withAuth = require("./middleware/withAuth");
mongoose.connect("mongodb://localhost:27017/chat-app").then(() => {
  console.log("db connected");
});
const io = require("socket.io")(4000, {
  cors: {
    origin: "http://localhost:3000",
  },
});
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
  })
);
app.listen(8000, () => {
  console.log("server running on port 8000");
});
app.use("/user", userRouter);
app.post("/verify", async (req, res) => {
  try {
    const { token } = req.body;
    const verify = await jwt.verify(token, process.env.SECRET, (err) => {
      if (err) {
        res.status(401).json({ valid: false,error:err.message });
      } else {
        res.status(200).json({ valid: true });
      }
    });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});
app.use(withAuth);
app.post("/loadMessages", async (req, res) => {
  const { room } = req.body;

  const inDB = await MessageListModel.findOne({ room: room });
  if (inDB) {
    res.status(200).json({ list: inDB.messages });
  } else {
    res.status(404).json({ msg: "room not found / not created" });
  }
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("join-room", async (room) => {
    try {
      socket.join(room);
      console.log(socket.id + " connected to room " + room);
    } catch (err) {
    }
  });
  socket.on("send-msg", async (content1 , user, room) => {
    const {userId,username} = jwt.decode(user)
    if (room !== "") {
      io.to(room).emit("receive-msg", content1,userId,username);
      const inDB = await MessageListModel.findOne({ room: room });
      if (!inDB) {
        MessageListModel.create({
          messages: [{ user: userId,username, content: content1 }],
          room: room,
        });
      } else {
        inDB.messages = [
          ...inDB.messages,
          { user: userId,username, content: content1 },
        ];
        inDB.save();
      }
    }
  });
});
io.on("disconnect", (socket) => {
  console.log("a user disconnected");
});
