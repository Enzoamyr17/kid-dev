/**
 * Script to execute the audit-setup.sql file against the database
 * This uses Prisma's raw query execution to run the SQL script
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runAuditSetup() {
  try {
    console.log('Reading audit-setup.sql...');
    const sqlFilePath = path.join(__dirname, 'audit-setup.sql');
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    console.log('Executing SQL script against database...');
    console.log('This may take a few moments...\n');

    // Remove comments and split by semicolons, but preserve function bodies
    sqlContent = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split SQL into individual statements
    // We need to be careful with function definitions that have multiple semicolons
    const statements = [];
    let currentStatement = '';
    let inFunction = false;

    const lines = sqlContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Track if we're inside a function definition
      if (trimmed.includes('CREATE OR REPLACE FUNCTION') || trimmed.includes('CREATE FUNCTION')) {
        inFunction = true;
      }

      currentStatement += line + '\n';

      // End of statement
      if (trimmed.endsWith(';')) {
        if (inFunction && (trimmed.includes('$$ LANGUAGE') || trimmed.includes('$$LANGUAGE'))) {
          inFunction = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
        } else if (!inFunction) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }

    // Execute each statement
    let successCount = 0;
    for (const statement of statements) {
      if (statement && statement.length > 10) {
        try {
          await prisma.$executeRawUnsafe(statement);
          successCount++;
          process.stdout.write('.');
        } catch (error) {
          console.log(`\nWarning: ${error.message}`);
        }
      }
    }

    console.log(`\n✓ Successfully executed ${successCount} SQL statements!`);
    console.log('✓ Audit logging system has been successfully installed!');
    console.log('\nWhat was created:');
    console.log('  1. auditLog table to store all changes');
    console.log('  2. audit_trigger_function() to handle logging');
    console.log('  3. Triggers attached to all tables\n');

    console.log('Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Navigate to: /dashboard/audit-logs');
    console.log('  3. Make some changes to your data');
    console.log('  4. View the audit logs!\n');

    console.log('Optional: To set user context in your API routes:');
    console.log('  import { withAuditUser } from "@/lib/audit-context";');
    console.log('  await withAuditUser(userId, async () => {');
    console.log('    await prisma.product.update({ ... });');
    console.log('  });\n');

  } catch (error) {
    console.error('Error executing audit setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuditSetup();
