// Promote an existing user to a role (default: admin). Registration no longer
// accepts a role, so this is how you bootstrap the first admin/moderator.
//   node scripts/make-admin.js <username> [role]
require('dotenv').config();
const prisma = require('../src/lib/prisma');

const [, , username, role = 'admin'] = process.argv;
const ROLES = ['user', 'moderator', 'admin'];

async function main() {
  if (!username) {
    console.error('Usage: node scripts/make-admin.js <username> [role=admin]');
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Use one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }
  const user = await prisma.users
    .update({
      where: { username },
      data: { role },
      select: { id: true, username: true, role: true },
    })
    .catch(() => null);
  if (!user) {
    console.error(`No user named "${username}"`);
    process.exit(1);
  }
  console.log(`✅ ${user.username} is now ${user.role}`);
}

main()
  .catch((e) => {
    console.error('❌', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
