# Installation

npm install

# Environment

DATABASE_URL=...

JWT_SECRET=...

PORT=....

# Generate Prisma Client

npx prisma generate

# Push Schema

npx prisma db push

# Start Server

npm run dev

# Run Specmatic

npx specmatic test openapi.yaml --testBaseURL=http://localhost:3000/api/v1
