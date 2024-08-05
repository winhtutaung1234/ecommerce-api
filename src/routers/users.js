const express = require("express");
const router = express.Router();

const UserController = require("../controllers/UserController");
const auth = require("../middlewares/auth");

const {
  validateRegister,
  validateLogin,
  validateId,
} = require("../middlewares/validate");

const validator = require("../utils/validator");

router.get("/verify", auth, UserController.verify);

router.post("/register", validateRegister, validator, UserController.register);

router.post("/login", validateLogin, validator, UserController.login);

router.post("/refresh-token", UserController.refresh);

router.get("/users", UserController.find);

router.post(
  "/users/:id/restore",
  validateId,
  validator,
  UserController.restore
);

router.delete("/users/:id/refresh-token", UserController.revokeRefresh);

router.delete("/users/:id", validateId, validator, UserController.destroy);

module.exports = { usersRouter: router };