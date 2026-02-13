import express from "express";
import {
  logOutUser,
  loginUser,
  registerUser,
  verifyUser,
} from "../controllers/AuthController.js";
import protect from "../middlewares/auth.js";

const AuthRouter = express.Router();

AuthRouter.post("/register", registerUser);
AuthRouter.post("/login", loginUser);
AuthRouter.get("/verify", protect, verifyUser);
AuthRouter.post("/logout", protect, logOutUser);

export default AuthRouter;
