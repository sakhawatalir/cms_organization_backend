// routes/tearsheetRoutes.js
const express = require("express");

function createTearsheetRouter(tearsheetController, authMiddleware) {
  const router = express.Router();
  const { verifyToken } = authMiddleware;

  // All routes require authentication
  router.use(verifyToken);

  router.get("/", tearsheetController.getAll);
  router.post("/", tearsheetController.create);

  return router;
}

module.exports = createTearsheetRouter;


