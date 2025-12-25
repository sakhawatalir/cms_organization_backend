// models/headerConfig.js
class HeaderConfig {
  constructor(pool) {
    this.pool = pool;
  }

  async initTable() {
    let client;
    try {
      console.log("Initializing header_configs table if needed...");
      client = await this.pool.connect();

      await client.query(`
        CREATE TABLE IF NOT EXISTS header_configs (
          id SERIAL PRIMARY KEY,
          entity_type VARCHAR(50) NOT NULL UNIQUE,
          header_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_header_configs_entity_type 
        ON header_configs(entity_type)
      `);

      console.log("✅ Header configs table initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Error initializing header_configs table:", error.message);
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async getByEntityType(entityType) {
    let client;
    try {
      client = await this.pool.connect();
      const query = `
        SELECT id, entity_type, header_fields, created_at, updated_at 
        FROM header_configs 
        WHERE entity_type = $1
      `;
      const result = await client.query(query, [entityType]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching header config:", error);
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async upsert(entityType, headerFields, userId) {
    let client;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const existing = await this.getByEntityType(entityType);
      let result;

      if (existing) {
        // Update existing config
        const updateQuery = `
          UPDATE header_configs 
          SET header_fields = $1, 
              updated_by = $2, 
              updated_at = CURRENT_TIMESTAMP 
          WHERE entity_type = $3
          RETURNING id, entity_type, header_fields, created_at, updated_at
        `;
        const updateResult = await client.query(updateQuery, [
          JSON.stringify(headerFields),
          userId,
          entityType,
        ]);
        result = updateResult.rows[0];
      } else {
        // Insert new config
        const insertQuery = `
          INSERT INTO header_configs (entity_type, header_fields, created_by, updated_by)
          VALUES ($1, $2, $3, $3)
          RETURNING id, entity_type, header_fields, created_at, updated_at
        `;
        const insertResult = await client.query(insertQuery, [
          entityType,
          JSON.stringify(headerFields),
          userId,
        ]);
        result = insertResult.rows[0];
      }

      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error upserting header config:", error);
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}

module.exports = HeaderConfig;

