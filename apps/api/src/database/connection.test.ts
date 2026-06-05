import { createDatabaseConnection, DatabaseConnection } from './connection';

// Helper to check if database is available
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const db = await createDatabaseConnection({
      connectionString: 'postgresql://postgres:secret@localhost:5432/cloud_manager',
    });
    await db.close();
    return true;
  } catch {
    return false;
  }
}

describe('Database Connection', () => {
  let db: DatabaseConnection;
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
      db = null as any;
    }
  });

  it('should connect to database', async () => {
    if (!dbAvailable) {
      console.log('Skipping: Database not available');
      return;
    }

    db = await createDatabaseConnection({
      connectionString: 'postgresql://postgres:secret@localhost:5432/cloud_manager',
    });

    expect(db).toBeDefined();
    expect(db.pool).toBeDefined();
    expect(db.query).toBeDefined();
    expect(db.close).toBeDefined();
  });

  it('should execute query', async () => {
    if (!dbAvailable) {
      console.log('Skipping: Database not available');
      return;
    }

    db = await createDatabaseConnection({
      connectionString: 'postgresql://postgres:secret@localhost:5432/cloud_manager',
    });

    const result = await db.query('SELECT 1 as num');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].num).toBe(1);
  });

  it('should execute parameterized query', async () => {
    if (!dbAvailable) {
      console.log('Skipping: Database not available');
      return;
    }

    db = await createDatabaseConnection({
      connectionString: 'postgresql://postgres:secret@localhost:5432/cloud_manager',
    });

    const result = await db.query('SELECT $1 as value', ['test']);
    expect(result.rows[0].value).toBe('test');
  });

  it('should handle connection failure', async () => {
    await expect(
      createDatabaseConnection({
        connectionString: 'postgresql://invalid:invalid@localhost:9999/nonexistent',
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should close connection gracefully', async () => {
    if (!dbAvailable) {
      console.log('Skipping: Database not available');
      return;
    }

    db = await createDatabaseConnection({
      connectionString: 'postgresql://postgres:secret@localhost:5432/cloud_manager',
    });

    // Verify connection is working
    const result = await db.query('SELECT 1 as num');
    expect(result.rows[0].num).toBe(1);

    // Close connection
    await db.close();
    db = null as any;

    // If we reach here without error, the close was successful
    expect(true).toBe(true);
  });
});
