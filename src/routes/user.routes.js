import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();


router.route("/register").post(registerUser)



export default router // default export so we can import it by any name