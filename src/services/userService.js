const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const {
    findUserByEmail,
    findUserById,
    createUser,
    updateUserPreferences
} = require('../data/userStore');

const registerUser = async ({ name, email, password, preferences }) => {
    // Normalize email to prevent case-sensitive duplicates
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = findUserByEmail(normalizedEmail);

    if (existingUser) {
        const error = new Error('User already exists');
        error.statusCode = 409;
        throw error;
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user record
    const newUser = {
        id: randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        preferences: preferences || []
    };

    // Save user in data store
    createUser(newUser);

    // Return only safe user details
    return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        preferences: newUser.preferences
    };
};

const loginUser = async ({ email, password }) => {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find registered user
    const user = findUserByEmail(normalizedEmail);

    if (!user) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    // Compare password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordValid) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    // Ensure JWT secret is configured
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT secret is not configured');
    }

    // Generate JWT token
    const token = jwt.sign(
        {
            userId: user.id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
    );

    return { token };
};


const updatePreferences = (userId, preferences) => {
    // Update preferences in the data store
    const updatedUser = updateUserPreferences(
        userId,
        preferences
    );

    // Handle user not found
    if (!updatedUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // Return updated preferences
    return updatedUser.preferences;
};


const getUserPreferences = (userId) => {
    // Find the logged-in user using JWT userId
    const user = findUserById(userId);

    // Handle user not found
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // Return user's saved preferences
    return user.preferences;
};



module.exports = {
    registerUser,
    loginUser,
    getUserPreferences,
    updatePreferences
};