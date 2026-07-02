import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { signToken } from "../lib/jwt";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(user: InstanceType<typeof User>) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: (user.createdAt as Date).toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const user = await User.create({ name, email, password });
  const token = signToken({ userId: String(user._id), email: user.email });
  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const match = await user.comparePassword(password);
  if (!match) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: String(user._id), email: user.email });
  res.json({ token, user: formatUser(user) });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

export default router;
