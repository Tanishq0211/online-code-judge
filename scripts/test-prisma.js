require('dotenv').config()

const { PrismaClient } = require('../src/generated/prisma')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const count = await prisma.users.count()
  console.log(`✅ Connected! Found ${count} user(s) in the database.`)
}

main()
  .catch((e) => {
    console.error('❌ Prisma error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })