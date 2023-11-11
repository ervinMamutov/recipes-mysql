import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import validateEmail from '../utils/validateEmail.js';
import validatePassword from '../utils/validatePassword.js';
import matchPasswords from '../utils/matchPasswords.js';
import hashPassword from '../utils/hashPassword.js';
import query from '../config/db.js';
import '../models/user.js';

const userControllers = {
  register: async (req, res) => {
    try {
      const { email, password, rePassword } = req.body;

      const userQuery = `SELECT * FROM users WHERE email=?`;
      const result = await query(userQuery, [email]);

      if (result.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: 'Email is already exist ' });
      } else {
        if (
          !validateEmail(email) ||
          !validatePassword(password) ||
          !matchPasswords(password, rePassword)
        ) {
          return res.status(400).json({
            success: false,
            message: 'Please, correct email or password format'
          });
        }

        const hashedPassword = hashPassword(password);

        // create new user
        const createUserQuery = `INSERT INTO users(email, password) VALUES (?, ?);`;
        const addUserResult = await query(createUserQuery, [
          email,
          hashedPassword
        ]);
        res.status(201).json({
          success: true,
          message: `User with email: ${email} has been created`
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const userQuery = `SELECT * FROM users WHERE email=?`;
      const result = await query(userQuery, [email]);
      if (result.length > 0) {
        const user = result[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          // generate token
          const token = jwt.sign(
            { user: user },
            process.env.TOKEN_ACCESS_SECRET
          );

          // set cookies
          res.cookie('id', user.id, {
            secure: true,
            sameSite: 'None'
          });

          res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None'
          });

          res.status(200).json({
            success: true,
            token,
            id: user.id
          });
        } else {
          return res
            .status(400)
            .json({ success: false, message: 'Email or password incorrect' });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'User not found. Please register first'
        });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        err: err.message
      });
    }
  },
  logout: (req, res) => {
    res.clearCookie('token');
    res.clearCookie('id');

    return res.status(200).json({
      success: true,
      message: 'Session closed successfully'
    });
  }
};

export default userControllers;
