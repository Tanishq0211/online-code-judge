const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 12;

async function hash(plain) {
  return await bcrypt.hash(plain, SALT_ROUNDS);
}
async function compare(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

module.exports = { hash, compare };