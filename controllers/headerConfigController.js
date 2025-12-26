// controllers/headerConfigController.js
const HeaderConfig = require("../models/headerConfig");

class HeaderConfigController {
  constructor(pool) {
    this.headerConfigModel = new HeaderConfig(pool);
    this.get = this.get.bind(this);
    this.upsert = this.upsert.bind(this);
  }

  async initTables() {
    try {
      await this.headerConfigModel.initTable();
      console.log("✅ Header config tables initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing header config tables:", error);
      throw error;
    }
  }

  // helper: pick which db field to read/write
  getColumnName(configType) {
    return configType === "columns" ? "list_columns" : "header_fields";
  }

  // helper: parse jsonb safely
  parseJsonb(value) {
    try {
      return typeof value === "string" ? JSON.parse(value) : value || [];
    } catch (e) {
      return [];
    }
  }

  async get(req, res) {
    try {
      const { entityType } = req.query;
      const configType = req.query.configType || "header"; // "header" | "columns"

      if (!entityType) {
        return res.status(400).json({
          success: false,
          message: "Entity type is required",
        });
      }

      const config = await this.headerConfigModel.getByEntityType(entityType);

      if (!config) {
        return res.status(200).json({
          success: true,
          entityType,
          configType,
          headerFields: [],
        });
      }

      const col = this.getColumnName(configType);
      const fields = this.parseJsonb(config[col]);

      return res.status(200).json({
        success: true,
        entityType: config.entity_type,
        configType,
        headerFields: fields, // keep same response key (frontend unchanged)
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      });
    } catch (error) {
      console.error("Error fetching header config:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch configuration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  async upsert(req, res) {
    try {
      const { entityType } = req.query;
      const configType = req.query.configType || "header"; // "header" | "columns"
      const { headerFields, fields } = req.body; // support both

      if (!entityType) {
        return res.status(400).json({
          success: false,
          message: "Entity type is required",
        });
      }

      const fieldsToSave = headerFields || fields || [];

      if (!Array.isArray(fieldsToSave)) {
        return res.status(400).json({
          success: false,
          message: "fields must be an array",
        });
      }

      const userId = req.user?.id;

      // ✅ IMPORTANT: pass configType to model upsert
      const saved = await this.headerConfigModel.upsert(
        entityType,
        fieldsToSave,
        userId,
        configType
      );

      // saved may return different shape depending on your model
      // safest: re-fetch and parse from actual db column
      const config = await this.headerConfigModel.getByEntityType(entityType);
      const col = this.getColumnName(configType);
      const parsedFields = this.parseJsonb(config?.[col]);

      return res.status(200).json({
        success: true,
        message: "Configuration saved successfully",
        entityType: entityType,
        configType,
        headerFields: parsedFields,
        updatedAt: config?.updated_at,
      });
    } catch (error) {
      console.error("Error saving header config:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save configuration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = HeaderConfigController;
