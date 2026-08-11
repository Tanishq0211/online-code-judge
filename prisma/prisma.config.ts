import { defineConfig } from 'prisma/config'
import { config as dotenvConfig } from 'dotenv'

// Load variables from .env into process.env
dotenvConfig()

export default defineConfig({
  datasources: {
    db: {
      // Prisma will read DATABASE_URL from process.env
      url: process.env.DATABASE_URL
    }
  }
})