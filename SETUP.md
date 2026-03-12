# DepDash Local Development Setup

Quick guide to get DepDash running locally for development.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd depdash
npm install
```

### 2. Start PostgreSQL

```bash
# Start PostgreSQL in background
docker-compose up -d

# Verify it's running
docker-compose ps

# View logs (optional)
docker-compose logs -f postgres
```

### 3. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/depdash"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Generate secret with: openssl rand -base64 32
```

### 4. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with test data (optional)
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Development Commands

### Database Management

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (GUI for database)
npx prisma studio

# Push schema changes without migration
npx prisma db push
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# View logs
docker-compose logs -f

# Restart PostgreSQL
docker-compose restart postgres
```

### Next.js Commands

```bash
# Development server with turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

---

## Database Connection

### Connection Details

- **Host:** localhost
- **Port:** 5432
- **Database:** depdash
- **Username:** postgres
- **Password:** postgres

### Connect with psql

```bash
# Via Docker
docker exec -it depdash-postgres psql -U postgres -d depdash

# Via local psql client
psql -h localhost -p 5432 -U postgres -d depdash
```

### Common SQL Commands

```sql
-- List all tables
\dt

-- Describe table structure
\d table_name

-- Show all databases
\l

-- Quit psql
\q
```

---

## Project Structure

```
depdash/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes
│   └── actions/           # Server Actions
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # NextAuth config
│   └── ...
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts           # Seed script
├── data/
│   └── postgres/         # PostgreSQL data files (gitignored)
├── .env.local            # Local environment variables (gitignored)
├── docker-compose.yml    # Docker services
└── package.json
```

---

## Troubleshooting

### Port 5432 Already in Use

If you have PostgreSQL running locally:

```bash
# Stop local PostgreSQL service
# macOS
brew services stop postgresql

# Linux
sudo systemctl stop postgresql

# Or change the port in docker-compose.yml
ports:
  - "5433:5432"

# Then update DATABASE_URL in .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/depdash"
```

### Database Connection Errors

```bash
# Check if container is running
docker-compose ps

# Check container logs
docker-compose logs postgres

# Restart container
docker-compose restart postgres

# Complete reset
docker-compose down -v
docker-compose up -d
npx prisma migrate reset
```

### Prisma Client Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Migration Issues

```bash
# Reset database and reapply migrations
npx prisma migrate reset

# Mark migration as applied without running
npx prisma migrate resolve --applied migration_name

# Create migration from current schema
npx prisma migrate dev --create-only
```

---

## Development Workflow

### Making Schema Changes

1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name describe_change`
3. Prisma Client auto-regenerates

### Testing API Endpoints

```bash
# Create API token via UI or seed script
# Then test with curl

curl -X POST http://localhost:3000/api/v1/audits \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d @test-audit.json
```

### Seeding Test Data

Create/edit `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Create test organization
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
    }
  })

  // Add more seed data...
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run: `npx prisma db seed`

---

## Clean Start

To completely reset your development environment:

```bash
# Stop and remove Docker containers/volumes
docker-compose down -v

# Remove data directory
rm -rf data/postgres

# Reset database
npx prisma migrate reset

# Restart everything
docker-compose up -d
npm run dev
```

---

## Production Considerations

For production deployment:

1. Use strong passwords
2. Set secure `NEXTAUTH_SECRET`
3. Use SSL for database connections
4. Configure proper CORS settings
5. Enable rate limiting
6. Set up monitoring and logging
7. Use managed PostgreSQL service
8. Configure backups

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose)