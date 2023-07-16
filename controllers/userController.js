const UserModel = require("../schemas/userSchema");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const genToken = (userId, username) => {
  return jwt.sign({ userId, username }, process.env.SECRET, {
    expiresIn: "7d",
  });
};
const Signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userId = await UserModel.signup(username, email, password);
    const token = genToken(userId, username);
    res.status(200).json({ AuthValidation: token });
  } catch (err) {
    res.status(401).json({ error: err.message }); //401 Unauthorized
  }
};

const Login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const userId = await UserModel.login(username, password);
    const token = genToken(userId, username);
    res.status(200).json({ AuthValidation: token });
  } catch (err) {
    console.log(err.message);
    res.status(401).json({ error: err.message });
  }
};

const LoadUser = async (req, res) => {
  try {
    const { username } = req.body; //username
    const inDB = await UserModel.findOne({ username });
    console.log(inDB);
    res.status(200).json({ username: inDB.username });
  } catch (err) {
    console.log(err.message);
  }
};

const UpdateProfilePicture = async (req, res) => {
  try {
    const { username, base64 } = req.body;
    const auth = await UserModel.findOne({_id:req.user})
    if(!auth){
      throw new Error("Not verified.")
    }
    const inDB = await UserModel.findOneAndUpdate(
      { username },
      { profilePicture: base64 },
      { new: true }
    );
    res.status(200).json({ inDB });
  } catch (err) {
    console.log(err.message);
  }
};

module.exports = { Signup, Login, LoadUser, UpdateProfilePicture };
