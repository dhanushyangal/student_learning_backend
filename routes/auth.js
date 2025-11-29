const express = require('express');
const router = express.Router();
const supabase = require('../db');
const bcrypt = require('bcryptjs');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, first_name, last_name } = req.body;
    
    if (!username || !email || !password || !role || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists - query by username
    const { data: existingByUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    // Check if user exists - query by email
    const { data: existingByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingByUsername || existingByEmail) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password: hashedPassword,
        role,
        first_name,
        last_name
      })
      .select('id, username, email, role, first_name, last_name')
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Register error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code
    });
    res.status(500).json({ 
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to register user'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Query user by username first
    let { data: user, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    // If not found by username, try email
    if (!user && !queryError) {
      const emailQuery = await supabase
        .from('users')
        .select('*')
        .eq('email', username)
        .maybeSingle();
      user = emailQuery.data;
      queryError = emailQuery.error;
    }

    if (queryError) {
      throw queryError;
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;

