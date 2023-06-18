const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const UserModel = require("../schemas/userSchema");
const withAuth = async (req, res, next) => {
  try {
    const { AuthValidation } = req.body;
    const verified = await jwt.verify(AuthValidation, process.env.SECRET);
    if (!verified) {
      throw new Error(process.env.ERR_NOT_VALID_TOKEN);
    }
const {userId} = jwt.decode(AuthValidation)
    const inDB = await UserModel.findOne({ _id:userId });
    if (!inDB) {
      throw new Error(process.env.ERR_NOT_FOUND_USER);
    }
    req.user = inDB._id;
    next()
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};
module.exports = withAuth