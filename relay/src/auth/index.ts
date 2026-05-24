import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dbManager } from '../db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';

// User Registration Endpoint
router.post('/register', express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const userRepository = dbManager.getUsers();

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use." });
    }

    // Securely hash the password using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Persist via the agnostic DB Manager
    const newUser = await userRepository.createUser({
      email,
      passwordHash,
      role: 'USER'
    });

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: "User registered successfully.",
      token
    });

  } catch (error) {
    console.error("[Auth] Registration error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// User Login Endpoint
router.post('/login', express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const userRepository = dbManager.getUsers();

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Verify the hashed password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: "Login successful.",
      token
    });

  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;