import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me-later';

// Middlewares
app.use(cors());
app.use(express.json());

// IN-MEMORY DATABASE (For demonstration purposes. Connect your own MongoDB/PostgreSQL later)
const users = []; 

// ─── AUTHENTICATION ROUTES ──────────────────────────────────────────────────

// 1. REGISTER API
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Validation
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Check if user exists
        const userExists = users.find(u => u.email === email);
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user record
        const newUser = {
            id: `usr_${Date.now()}`,
            name,
            email,
            phone,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        // Generate JWT Token
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

        // Remove passwords from response
        const { password: _p, ...userData } = newUser;

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 2. LOGIN API
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials. User not found.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        const { password: _p, ...userData } = user;

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error during login.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ SafeRoute Backend running on http://localhost:${PORT}`);
    console.log('   Test endpoints available:');
    console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
});
