const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const bcrypt = require("bcrypt");

const { generateAccessAndRefreshToken } = require("../utils/generateTokens");
const UserResource = require("../resources/UserResource");

module.exports = {
  verify: asyncHandler(async (req, res) => {
    const { user } = req;
    return res.json(user);
  }),

  find: asyncHandler(async (req, res) => {
    const users = await User.findAll();
    return res.json(UserResource.collection(users));
  }),

  register: asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hash });
    return res.status(201).json(new UserResource(user).exec());
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(400).json({ msg: "User not found. register first" });

    if (!(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ msg: "Invalid password" });

    const { access_token, refresh_token } = generateAccessAndRefreshToken(user);

    user.refresh_token = refresh_token;
    await user.save();

    return res.json({ access_token, refresh_token });
  }),

  refresh: asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(401).json({ msg: "Refresh token is missing" });

    const user = await User.findOne({ where: { refresh_token: refreshToken } });

    if (!user) return res.status(401).json({ msg: "Invalid refresh token" });

    const { access_token, refresh_token } = generateAccessAndRefreshToken(user);

    user.refresh_token = refresh_token;
    await user.save();

    return res.json({ access_token, refresh_token });
  }),

  destroy: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await User.destroy({ where: { id } });

    if (!result) return res.status(400).json({ msg: "Failed delete user" });

    return res.status(200).json({ msg: "User deleted successfully" });
  }),

  revokeRefresh: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findOne({ where: { id } });

    if (!user) res.status(404).json({ msg: `User not found` });

    user.refresh_token = null;
    await user.save();

    return res.json({ msg: "User revoke refresh token success" });
  }),

  restore: asyncHandler(async (req, res) => {
    const { id } = req.params;

    await User.restore({ where: { id } });
    return res.sendStatus(204);
  }),
};