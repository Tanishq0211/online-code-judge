require('dotenv').config()
const prisma = require('../dist/src/lib/prisma').default // built output (npm run build)
async function main() {
  const count = await prisma.users.count()
  console.log(`������✅ Connected! Found ${count} user(s) in the database.`)
  await prisma.$disconnect()
}
main().catch(e => {
  console.error('������❌ Prisma error:', e)
  process.exit(1)
})