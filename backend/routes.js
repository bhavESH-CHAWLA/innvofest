const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { User } = require("./models");
const { verifyToken } = require("./authMiddleware");
const { askAI } = require("./aiService");
const { sendRiskAlertEmail } = require("./emailService");

function sendError(res, status, message, details) {
 const payload = { message };
 if (details) payload.details = details;
 return res.status(status).json(payload);
}

router.get("/health", (req, res) => {
 res.json({
  ok: true,
  service: "InnoVest Backend",
  timestamp: new Date().toISOString(),
  aiModel: process.env.AI_MODEL || "gpt-4o-mini",
  aiProviders: (process.env.AI_PROVIDER_ORDER || "openai,groq,huggingface")
   .split(",")
   .map((p) => p.trim())
   .filter(Boolean),
  alertsEnabled: Boolean(
   process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ),
 });
});

// SIGNUP
router.post("/signup", async (req, res) => {
 try {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
   return sendError(res, 400, "Name, email, and password are required");
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
   return sendError(res, 409, "Email already registered");
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({
   name: String(name).trim(),
   email: normalizedEmail,
   password: hash,
  });

  res.status(201).json({ id: user._id, name: user.name, email: user.email });
 } catch (err) {
  console.log(err);
  sendError(res, 500, "Signup failed", err.message);
 }
});

// LOGIN
router.post("/login", async (req, res) => {
 try {
  const { email, password } = req.body;

  if (!email || !password) {
   return sendError(res, 400, "Email and password are required");
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) return sendError(res, 400, "User not found");

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return sendError(res, 400, "Wrong Password");

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
 } catch (err) {
  console.log(err);
  sendError(res, 500, "Login failed", err.message);
 }
});

router.get("/me", verifyToken, async (req, res) => {
 try {
  const user = await User.findById(req.user.id).select("name email");

  if (!user) return sendError(res, 404, "User not found");

  res.json(user);
 } catch (err) {
  console.log(err);
  sendError(res, 500, "Failed to load user profile", err.message);
 }
});

router.get("/dashboard", verifyToken, (req, res) => {
 res.json("Welcome Manager");
});

router.post("/chat", verifyToken, async (req, res) => {
 const { message } = req.body;

 try {
  if (!message || !String(message).trim()) {
   return sendError(res, 400, "Chat message is required");
  }

  const reply = await askAI(
   message,
   "You are InnoVest analyst assistant. Answer with direct decision-support bullets."
  );

  res.json({ reply });
 } catch (err) {
  console.log(err);
  sendError(res, err.status || 500, "AI Error", err.details || err.message);
 }
});

router.post("/predict", verifyToken, async (req, res) => {
 try {
  const { message } = req.body;

  if (!message || !String(message).trim()) {
   return sendError(res, 400, "Prediction prompt is required");
  }

  const prompt = `${message}\n\nReturn: risk level, short rationale, key drivers, and recommended actions.`;
  const aiResponse = await askAI(prompt);

  res.json({ result: aiResponse });
 } catch (err) {
  console.log(err);
  sendError(res, err.status || 500, "Prediction failed", err.details || err.message);
 }
});

router.post("/alerts/evaluate-email", verifyToken, async (req, res) => {
 try {
  const { riskScore, riskLevel, explanation } = req.body;
  const normalizedScore = Number(riskScore);
  const threshold = Number(process.env.ALERT_THRESHOLD || 70);

  if (Number.isNaN(normalizedScore)) {
   return sendError(res, 400, "riskScore must be a valid number");
  }

  if (normalizedScore < threshold) {
   return res.json({
    sent: false,
    reason: `No alert triggered. Score ${normalizedScore} is below threshold ${threshold}.`,
   });
  }

  const user = await User.findById(req.user.id).select("name email");

  if (!user) {
   return sendError(res, 404, "User not found for alerting");
  }

  const toEmail = process.env.ALERT_TO_EMAIL || user.email;

  const emailResult = await sendRiskAlertEmail({
   toEmail,
   userName: user.name,
   riskLevel: riskLevel || "HIGH",
   riskScore: normalizedScore,
   explanation,
  });

  res.json(emailResult);
 } catch (err) {
  console.log(err);
  sendError(res, 500, "Failed to evaluate/send alert email", err.message);
 }
});

module.exports = router;
