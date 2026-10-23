const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username: username.trim().toLowerCase() });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user._id.toString(), username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                full_name: user.full_name || '',
                profile_pic: user.profile_pic || '',
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

const register = async (req, res) => {
    const { username, password, full_name } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const cleanUsername = username.trim().toLowerCase();
        const existing = await User.findOne({ username: cleanUsername });
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username: cleanUsername,
            password_hash,
            full_name: full_name ? full_name.trim() : '',
            role: 'user'
        });

        const token = jwt.sign(
            { id: newUser._id.toString(), username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id.toString(),
                username: newUser.username,
                full_name: newUser.full_name,
                profile_pic: newUser.profile_pic,
                role: newUser.role,
                created_at: newUser.created_at
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id.toString(),
            username: user.username,
            full_name: user.full_name || '',
            profile_pic: user.profile_pic || '',
            role: user.role,
            created_at: user.created_at
        });
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
};

const updateProfile = async (req, res) => {
    const { full_name, profile_pic } = req.body;
    try {
        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (profile_pic !== undefined) updateData.profile_pic = profile_pic;

        const updated = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updated._id.toString(),
                username: updated.username,
                full_name: updated.full_name || '',
                profile_pic: updated.profile_pic || '',
                role: updated.role,
                created_at: updated.created_at
            }
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters long' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        user.password_hash = newHash;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ error: 'Failed to update password' });
    }
};

module.exports = { login, register, getMe, updateProfile, updatePassword };
