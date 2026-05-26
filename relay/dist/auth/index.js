"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_insecure_jwt_secret_key';
// User Registration Endpoint
router.post('/register', express_1.default.json(), async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }
        const userRepository = db_1.dbManager.getUsers();
        // Check if user already exists
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use." });
        }
        // Securely hash the password using bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        // Persist via the agnostic DB Manager
        const newUser = await userRepository.createUser({
            email,
            passwordHash,
            role: 'USER'
        });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            message: "User registered successfully.",
            token
        });
    }
    catch (error) {
        console.error("[Auth] Registration error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// User Login Endpoint
router.post('/login', express_1.default.json(), async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }
        const userRepository = db_1.dbManager.getUsers();
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }
        // Verify the hashed password
        const isMatch = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials." });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({
            message: "Login successful.",
            token
        });
    }
    catch (error) {
        console.error("[Auth] Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
