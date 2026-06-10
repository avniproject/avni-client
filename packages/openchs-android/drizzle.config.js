/**
 * Drizzle Kit configuration for migration generation.
 *
 * Usage: npx drizzle-kit generate
 *
 * drizzle-kit reads the Drizzle ORM table definitions from DrizzleSchemaExport.js,
 * compares against its snapshot, and generates SQL migration files.
 *
 * Dev-only — drizzle-kit is a devDependency.
 */
module.exports = {
    dialect: "sqlite",
    out: "./drizzle-migrations",
    schema: "./src/framework/db/DrizzleSchemaExport.js",
};
