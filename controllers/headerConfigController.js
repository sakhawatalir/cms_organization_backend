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

  async get(req, res) {
    try {
      const { entityType } = req.query;

      if (!entityType) {
        return res.status(400).json({
          success: false,
          message: "Entity type is required",
        });
      }

      const config = await this.headerConfigModel.getByEntityType(entityType);

      if (!config) {
        // Return empty array if no config exists
        return res.status(200).json({
          success: true,
          entityType: entityType,
          headerFields: [],
        });
      }

      // Parse JSONB field (it might already be parsed by pg)
      let headerFields = [];
      try {
        headerFields =
          typeof config.header_fields === "string"
            ? JSON.parse(config.header_fields)
            : config.header_fields || [];
      } catch (e) {
        console.error("Error parsing header_fields:", e);
        headerFields = [];
      }

      return res.status(200).json({
        success: true,
        entityType: config.entity_type,
        headerFields: headerFields,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      });
    } catch (error) {
      console.error("Error fetching header config:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch header configuration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  async upsert(req, res) {
    try {
      const { entityType } = req.query;
      const { headerFields, fields } = req.body; // Support both 'headerFields' and 'fields'

      if (!entityType) {
        return res.status(400).json({
          success: false,
          message: "Entity type is required",
        });
      }

      // Use headerFields if provided, otherwise fallback to fields
      const fieldsToSave = headerFields || fields || [];

      if (!Array.isArray(fieldsToSave)) {
        return res.status(400).json({
          success: false,
          message: "headerFields must be an array",
        });
      }

      const userId = req.user?.id;

      const config = await this.headerConfigModel.upsert(
        entityType,
        fieldsToSave,
        userId
      );

      // Parse JSONB field
      let parsedFields = [];
      try {
        parsedFields =
          typeof config.header_fields === "string"
            ? JSON.parse(config.header_fields)
            : config.header_fields || [];
      } catch (e) {
        parsedFields = [];
      }

      return res.status(200).json({
        success: true,
        message: "Header configuration saved successfully",
        entityType: config.entity_type,
        headerFields: parsedFields,
        updatedAt: config.updated_at,
      });
    } catch (error) {
      console.error("Error saving header config:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save header configuration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = HeaderConfigController;

