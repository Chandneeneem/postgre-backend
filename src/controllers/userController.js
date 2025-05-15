
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.getUsers = async (req, res) => {
  console.log('getUsers API called with:', req.query);
  const page = parseInt(req.query.page) || 1;    // default page = 1
  const limit = parseInt(req.query.limit) || 10; // default limit = 10
  const offset = (page - 1) * limit;
  try {
    // Get total count (optional but good for frontend to know total pages)
    const totalResult = await pool.query('SELECT COUNT(*) FROM "userInfo"');
    const totalUsers = parseInt(totalResult.rows[0].count);
    // Fetch paginated users
    const result = await pool.query('SELECT * FROM "userInfo" ORDER BY email LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
};

exports.addNewUser = async (req, res) => {
  const { name, email, password } = req.body;
  console.log('Incoming data:', req.body);

  try {
    const checkUser = await pool.query('SELECT * FROM "userInfo" WHERE email = $1', [email]);
    if (checkUser.rowCount > 0) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const response = await pool.query(
      'INSERT INTO "userInfo" (name, email, password) VALUES($1, $2, $3) RETURNING *',
      [name, email, hashedPassword]
    );

    delete response.rows[0].password;

    return res.status(201).json({
      message: 'User created successfully',
      user: response.rows[0]
    });

  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({
      message: 'Database error',
      error: err.message
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  try {
    const checkUser = await pool.query('SELECT * FROM "userInfo" WHERE email = $1', [email]);
    if (checkUser.rowCount === 0) {
      return res.status(400).json({ message: 'Email or password is incorrect' });
    }
    const user = checkUser.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Email or password is incorrect' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    delete user.password;

    return res.status(200).json({
      message: 'Login successful',
      token,
      user,
    });

  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({
      message: 'Database error',
      error: err.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params; // User ID from URL
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM "userInfo" WHERE id = $1', [id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password if provided
    let hashedPassword = userCheck.rows[0].password;
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // Update user
    const result = await pool.query(
      'UPDATE "userInfo" SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING id, name, email',
      [name, email, hashedPassword, id]
    );

    return res.status(200).json({
      message: 'User updated successfully',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query('DELETE FROM "userInfo" WHERE id = $1 RETURNING *', [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User deleted successfully',
      user: result.rows[0],
    });

  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({
      message: 'Database error',
      error: err.message,
    });
  }
};
