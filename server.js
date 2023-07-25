const express = require("express");
const mongoose = require("mongoose");
const MessageListModel = require("./schemas/roomSchema");
const userRouter = require("./routers/userRouter");
const cors = require("cors");
const UserModel = require("./schemas/userSchema");
const jwt = require("jsonwebtoken");
const withAuth = require("./middleware/withAuth");
mongoose.connect("mongodb://localhost:27017/chat-app").then(() => {
  console.log("db connected");
});
const io = require("socket.io")(4000, {
  maxHttpBufferSize: 1e7,
  cors: {
    origin: "http://localhost:3000",
  },
});
const app = express();
app.use(express.json({ limit: "10mb" }));
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
    const { userId } = await jwt.verify(token, process.env.SECRET);
    res.status(200).json({ valid: true, userId });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});
app.use(withAuth);
app.post("/loadMessages", async (req, res) => {
  const { room } = req.body;

  const inDB = await MessageListModel.findOne({ room: room });
  const list = inDB.messages;

  let newList = list.map(async (item) => {
    const { profilePicture } = await UserModel.findOne({
      username: item.username,
    });
    return {
      username: item.username,
      user: item.user,
      pictures: item.pictures,
      content: item.content,
      profilePicture: profilePicture,
    };
  });
  if (inDB) { 
    Promise.all(newList).then((values) => //this slows down the loading a bit
      res.status(200).json({ list: values })
    );
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
    } catch (err) {}
  });
  socket.on("send-msg", async (content1, user, room, pictures) => {
    const { userId, username } = jwt.decode(user);
    const res = await UserModel.findOne({ _id: userId });
    if (room !== "") {
      io.to(room).emit(
        "receive-msg",
        content1,
        userId,
        username,
        pictures,
        res.profilePicture
      );
      console.log(res.profilePicture);
      const inDB = await MessageListModel.findOne({ room: room });
      if (!inDB) {
        MessageListModel.create({
          messages: [{ user: userId, username, content: content1, pictures }],
          room: room,
        });
      } else {
        inDB.messages = [
          ...inDB.messages,
          { user: userId, username, content: content1, pictures },
        ];
        inDB.save();
      }
    }
  });
});
io.on("disconnect", (socket) => {
  console.log("a user disconnected");
});
