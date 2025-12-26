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

      // ✅ NEW: add columns config storage (backward compatible)
      await client.query(`
        ALTER TABLE header_configs
        ADD COLUMN IF NOT EXISTS list_columns JSONB NOT NULL DEFAULT '[]'::jsonb
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_header_configs_entity_type 
        ON header_configs(entity_type)
      `);

      console.log("✅ Header configs table initialized successfully");
      return true;
    } catch (error) {
      console.error(
        "❌ Error initializing header_configs table:",
        error.message
      );
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async getByEntityType(entityType, configType = "header") {
    let client;
    try {
      client = await this.pool.connect();

      const column =
        configType === "columns" ? "list_columns" : "header_fields";

      const query = `
        SELECT id, entity_type, ${column} AS fields, created_at, updated_at
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

      const q = `
      INSERT INTO header_configs (entity_type, header_fields, created_by, updated_by)
      VALUES ($1, $2::jsonb, $3, $3)
      ON CONFLICT (entity_type)
      DO UPDATE SET
        header_fields = EXCLUDED.header_fields,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, entity_type, header_fields, created_at, updated_at
    `;

      const result = await client.query(q, [
        entityType,
        JSON.stringify(headerFields),
        userId || null,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Error upserting header config:", error);
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}

module.exports = HeaderConfig;

