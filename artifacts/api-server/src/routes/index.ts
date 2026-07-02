import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import meetingsRouter from "./meetings";
import recordingsRouter from "./recordings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(meetingsRouter);
router.use(recordingsRouter);

export default router;
