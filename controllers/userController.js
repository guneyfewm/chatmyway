const UserModel = require("../schemas/userSchema");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const genToken = (userId) => {
  return jwt.sign({ userId }, process.env.SECRET, { expiresIn: "7d" });
};
const Signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userId = await UserModel.signup(username, email, password);
    const token = genToken(userId);
    res.status(200).json({ AuthValidation: token });
  } catch (err) {
    res.status(401).json({ error: err.message }); //401 Unauthorized
  }
};

const Login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const userId = await UserModel.login(username, password);
    const token = genToken(userId);
    res.status(200).json({ AuthValidation: token });
  } catch (err) {
    console.log(err.message)
    res.status(401).json({ error: err.message });
  }
};

module.exports = { Signup, Login };
