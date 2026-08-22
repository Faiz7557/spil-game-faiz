import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Falls back to a fixed dev-only value with a loud warning rather than
// crashing the server, so a missing .env doesn't take down the whole app -
// but this must never happen in production (see .env.example).
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('[Auth] WARNING: JWT_SECRET not set in .env - using an insecure default. Set JWT_SECRET before deploying.');
  return 'insecure-dev-only-secret-do-not-use-in-production';
})();

const TOKEN_EXPIRY = '30d';

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export const signToken = (userId, username) =>
  jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

/** Verifies a raw JWT string. Returns { userId, username } or null - never throws. */
export const verifyToken = (token) => {
  if (!token) return null;
  try {
    const { userId, username } = jwt.verify(token, JWT_SECRET);
    return { userId, username };
  } catch (err) {
    return null;
  }
};

/**
 * True only when a token was actually presented and failed verification
 * (expired or tampered) - distinct from simply not sending one. Lets a route
 * tell a guest "log in" apart from telling a previously-logged-in client
 * "your session expired, log in again", which the client can react to by
 * clearing its stale local auth state instead of just retrying forever.
 */
export const tokenWasRejected = (token) => !!token && !verifyToken(token);

const ACCOUNT_ID_RE = /^user_/;

/**
 * The identity a request acts as: a verified JWT always wins over whatever
 * client-claimed id came along with it (sessionId in a body, playerId in a
 * socket payload) - otherwise anyone could act as "user_5" just by sending
 * that string, no password required. Falls back to the client-claimed
 * anonymous id (or a fresh random one) when there's no valid token - except
 * a claimed id is never allowed to land in the "user_<id>" namespace without
 * a verifying token, since that's exactly the string an attacker would send
 * to read or mutate someone else's account-owned game/room without ever
 * proving they own it.
 */
export const resolveIdentity = (token, fallbackId, makeFallback) => {
  const decoded = verifyToken(token);
  if (decoded) return `user_${decoded.userId}`;
  if (fallbackId && ACCOUNT_ID_RE.test(fallbackId)) {
    return makeFallback ? makeFallback() : null;
  }
  return fallbackId || (makeFallback ? makeFallback() : null);
};

/**
 * Express middleware: verifies the Authorization: Bearer <token> header and
 * attaches { userId, username } to req.user. Rejects with 401 if missing or
 * invalid - use only on routes that require a logged-in user.
 */
export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Login diperlukan.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Sesi login tidak valid atau kedaluwarsa. Silakan login kembali.' });
  }
};

/**
 * Non-throwing variant for routes that behave differently for guests vs
 * logged-in users but don't require login (none currently, kept for
 * symmetry/future use). Sets req.user if a valid token is present, else null.
 */
export const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    req.user = null;
  }
  next();
};
