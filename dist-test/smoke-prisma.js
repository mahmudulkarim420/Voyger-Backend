"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Temporary smoke test to verify the Prisma client loads at runtime
// in this CommonJS NestJS project. Safe to delete after verification.
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
async function main() {
    const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env['DATABASE_URL'] });
    const prisma = new client_1.PrismaClient({ adapter });
    console.log('PrismaClient instantiated OK:', typeof prisma);
    await prisma.$connect();
    console.log('Connected OK');
    await prisma.$disconnect();
    console.log('Disconnected OK');
}
main().catch((err) => {
    console.error('SMOKE TEST FAILED:', err);
    process.exit(1);
});
