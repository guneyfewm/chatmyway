const express = require("express");
const mongoose = require("mongoose");
const MessageListModel = require("./schemas/roomSchema");
const userRouter = require("./routers/userRouter");
const cors = require("cors");
const UserModel = require("./schemas/userSchema");
const jwt = require("jsonwebtoken");
const withAuth = require("./middleware/withAuth");
const bcrypt = require("bcrypt");
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
    const { userId, username } = await jwt.verify(token, process.env.SECRET);
    res.status(200).json({ valid: true, userId, username });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});
app.use(withAuth);
app.post("/loadRooms", async (req, res) => {
  const { page, amount, filter } = req.body;
  if (!filter) {
    try {
       const count = await MessageListModel.count({})

      const rooms = await MessageListModel.find({})
        .limit(amount * 1) // 0*1 = 0;
        .skip((page - 1) * amount) //index starts at 0 thus page-1
        .select("room");
      res.status(200).json({ rooms, page,totalPages:count/amount });
      console.log(rooms);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
});
app.post("/loadMessages", async (req, res) => {
  const { username } = await UserModel.findOne({ _id: req.user });
  const { room, chattingWith } = req.body;
  const privateRoom = username + " " + chattingWith;
  const secondPrivateRoom =
    privateRoom.split(" ")[1] + " " + privateRoom.split(" ")[0];
  const firstTry = await MessageListModel.findOne({ room: privateRoom });
  const secondTry = await MessageListModel.findOne({ room: secondPrivateRoom });

  const inDB = await MessageListModel.findOne({
    room: room
      ? room
      : firstTry
      ? privateRoom
      : secondTry
      ? secondPrivateRoom
      : console.log("error 50 server.js"),
  });

  const list = inDB != null ? inDB.messages : [];

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
    Promise.all(newList).then(
      (
        values //this slows down the loading a bit
      ) => res.status(200).json({ list: values })
    );
  } else {
    res.status(404).json({ msg: "room not found / not created" });
  }
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("join-room", async (room, username) => {
    try {
      const second = room.split(" ")[1] + " " + room.split(" ")[0];
      const firstTry = await MessageListModel.findOne({ room: room });
      const secondTry = await MessageListModel.findOne({ room: second });
      console.log(secondTry);
      console.log(second);
      if (!firstTry && !secondTry) {
        socket.join(room);
        console.log(socket.id + " connected to room " + room);
      } else if (firstTry) {
        socket.join(room);
        console.log(socket.id + " connected to room 1 " + room);
      } else if (secondTry) {
        socket.join(second);
        console.log(socket.id + " connected to room 2 " + second);
      }
    } catch (err) {}
  });
  socket.on("send-msg", async (content1, user, room, pictures, to) => {
    const { userId, username } = jwt.decode(user);
    const res = await UserModel.findOne({ _id: userId });
    if (to) {
      room = username + " " + to;
      const second = room.split(" ")[1] + " " + room.split(" ")[0];
      const firstTry = await MessageListModel.findOne({ room: room });
      const secondTry = await MessageListModel.findOne({ room: second });
      console.log(room);
      if (firstTry) {
        io.to(room).emit(
          "receive-msg",
          content1,
          userId,
          username,
          pictures,
          res.profilePicture
        );
      } else if (secondTry) {
        io.to(second).emit(
          "receive-msg",
          content1,
          userId,
          username,
          pictures,
          res.profilePicture
        );
      }
      const inDB = await MessageListModel.findOne({ room: room });
      const secondInDB = await MessageListModel.findOne({ room: second });
      if (!inDB && !secondInDB) {
        MessageListModel.create({
          messages: [{ user: userId, username, content: content1, pictures }],
          room: room,
        });
      } else if (inDB) {
        inDB.messages = [
          ...inDB.messages,
          { user: userId, username, content: content1, pictures },
        ];
        inDB.save();
      } else if (secondInDB) {
        secondInDB.messages = [
          ...secondInDB.messages,
          { user: userId, username, content: content1, pictures },
        ];
        secondInDB.save();
      }
    } else if (room != "") {
      io.to(room).emit(
        "receive-msg",
        content1,
        userId,
        username,
        pictures,
        res.profilePicture
      );
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

  socket.on("send-private-msg", async (content1, to, from, pictures) => {
    const { userId, username } = jwt.decode(from);
    const res = await UserModel.findOne({ _id: userId });
    if (to !== "") {
      io.to(to).emit(
        "receive-private-msg",
        content1,
        userId,
        username,
        pictures,
        res.profilePicture
      );
      /* const inDB = await MessageListModel.findOne({ room: room });
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
      } */
    }
  });
});
io.on("disconnect", (socket) => {
  console.log("a user disconnected");
});
