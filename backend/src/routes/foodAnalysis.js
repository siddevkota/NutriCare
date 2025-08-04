const express = require("express");
const multer = require("multer");
const roboflowService = require("../services/roboflowService");
const weightEstimationService = require("../services/weightEstimationService");

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// POST /api/food-analysis/analyze
// Analyze food image and estimate weight
router.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Parse elevation data from request body
    const elevationData = {
      angle: parseFloat(req.body.angle) || 0,
      distance: parseFloat(req.body.distance) || 50,
      elevation: parseFloat(req.body.elevation) || 0,
      height: parseFloat(req.body.height) || 0,
    };

    const imageWidth = parseInt(req.body.imageWidth) || 1080;
    const imageHeight = parseInt(req.body.imageHeight) || 1920;

    console.log("Analyzing image:", {
      filename: req.file.originalname,
      size: req.file.size,
      elevationData,
      dimensions: { width: imageWidth, height: imageHeight },
    });

    // Step 1: Perform image segmentation using Roboflow
    const segmentationResults = await roboflowService.segmentImage(
      req.file.buffer
    );

    // Step 2: Estimate weight using elevation data
    const weightEstimation = weightEstimationService.estimateWeight(
      segmentationResults,
      elevationData,
      imageWidth,
      imageHeight
    );

    // Step 3: Validate results
    const validation =
      weightEstimationService.validateEstimation(weightEstimation);

    const response = {
      success: true,
      data: weightEstimation,
      validation: validation,
      metadata: {
        processingTime: new Date().toISOString(),
        imageSize: req.file.size,
        segmentationMethod: "roboflow",
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Food analysis error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to analyze food image",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// POST /api/food-analysis/demo
// Demo endpoint with dummy data (same as current app logic)
router.post("/demo", upload.single("image"), async (req, res) => {
  try {
    // Parse elevation data
    const elevationData = {
      angle: parseFloat(req.body.angle) || 0,
      distance: parseFloat(req.body.distance) || 50,
      elevation: parseFloat(req.body.elevation) || 0,
      height: parseFloat(req.body.height) || 0,
    };

    const imageWidth = parseInt(req.body.imageWidth) || 1080;
    const imageHeight = parseInt(req.body.imageHeight) || 1920;

    // Generate dummy segmentation results
    const dummySegmentation = generateDummySegmentation(
      imageWidth,
      imageHeight
    );

    // Estimate weight using dummy data
    const weightEstimation = weightEstimationService.estimateWeight(
      dummySegmentation,
      elevationData,
      imageWidth,
      imageHeight
    );

    const response = {
      success: true,
      data: weightEstimation,
      metadata: {
        processingTime: new Date().toISOString(),
        imageSize: req.file ? req.file.size : 0,
        segmentationMethod: "dummy",
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Demo analysis error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to run demo analysis",
      message: error.message,
    });
  }
});

// GET /api/food-analysis/status
// Get service status and configuration
router.get("/status", (req, res) => {
  res.json({
    status: "active",
    services: {
      roboflow: {
        configured: !!process.env.ROBOFLOW_API_KEY,
        model: process.env.ROBOFLOW_MODEL_ID || "not-configured",
      },
    },
    supportedFormats: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: "10MB",
    features: [
      "food-segmentation",
      "weight-estimation",
      "nutrition-analysis",
      "elevation-tracking",
    ],
  });
});

// Helper function to generate dummy segmentation data
function generateDummySegmentation(imageWidth, imageHeight) {
  const foodClasses = [
    "apple",
    "banana",
    "chicken",
    "rice",
    "broccoli",
    "potato",
    "bread",
  ];
  const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items
  const results = [];

  for (let i = 0; i < numItems; i++) {
    const randomClass =
      foodClasses[Math.floor(Math.random() * foodClasses.length)];

    // Generate random bounding box
    const x = Math.floor(Math.random() * (imageWidth * 0.6));
    const y = Math.floor(Math.random() * (imageHeight * 0.6));
    const width = Math.floor(Math.random() * (imageWidth * 0.3)) + 50;
    const height = Math.floor(Math.random() * (imageHeight * 0.3)) + 50;

    // Simulate area calculation
    const area = Math.floor(width * height * (0.6 + Math.random() * 0.3)); // 60-90% of bounding box

    results.push({
      id: `item_${i}`,
      confidence: 0.75 + Math.random() * 0.2,
      class: randomClass,
      mask: [], // Simplified for API response
      boundingBox: { x, y, width, height },
      area,
    });
  }

  return results;
}

module.exports = router;
