import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const user = await User.findById(raw);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
