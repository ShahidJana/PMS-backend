import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();


export function signAccess(payload) {
  return jwt.sign(payload, process.env.ACCESS_SECRET, { expiresIn: process.env.ACCESS_EXPIRES });
}

export function signRefresh(payload) {
  return jwt.sign(payload, process.env.REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRES });
}

export function verifyAccess(token) {
  return jwt.verify(token, process.env.ACCESS_SECRET);
}

export function verifyRefresh(token) {
  return jwt.verify(token, process.env.REFRESH_SECRET);
}
