const axios = require("axios");
const FormData = require("form-data");

class RoboflowService {
  constructor() {
    this.apiKey = process.env.ROBOFLOW_API_KEY;
    this.modelId = process.env.ROBOFLOW_MODEL_ID || "food-segmentation-v1";
    this.version = process.env.ROBOFLOW_VERSION || "1";
    this.baseUrl = "https://detect.roboflow.com";
  }

  async segmentImage(imageBuffer) {
    if (!this.apiKey) {
      console.warn("Roboflow API key not configured, using dummy data");
      return this.generateDummySegmentation();
    }

    try {
      const formData = new FormData();
      formData.append("file", imageBuffer, {
        filename: "image.jpg",
        contentType: "image/jpeg",
      });

      const url = `${this.baseUrl}/${this.modelId}/${this.version}?api_key=${this.apiKey}`;

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 seconds timeout
      });

      return this.transformRoboflowResponse(response.data);
    } catch (error) {
      console.error("Roboflow API Error:", error.message);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      // Fallback to dummy data if API fails
      console.log("Falling back to dummy segmentation data");
      return this.generateDummySegmentation();
    }
  }

  transformRoboflowResponse(roboflowData) {
    // Transform Roboflow response format to our internal format
    const results = [];

    if (roboflowData.predictions) {
      roboflowData.predictions.forEach((prediction, index) => {
        // Extract segmentation mask if available
        let mask = [];
        let area = 0;

        if (prediction.points) {
          // Convert polygon points to simplified mask
          area = this.calculatePolygonArea(prediction.points);
        } else if (prediction.width && prediction.height) {
          // Calculate area from bounding box
          area = prediction.width * prediction.height;
        }

        results.push({
          id: `roboflow_${index}`,
          confidence: prediction.confidence,
          class: prediction.class.toLowerCase(),
          mask: mask, // Simplified for now
          boundingBox: {
            x: prediction.x - prediction.width / 2,
            y: prediction.y - prediction.height / 2,
            width: prediction.width,
            height: prediction.height,
          },
          area: area,
        });
      });
    }

    return results;
  }

  calculatePolygonArea(points) {
    // Simple polygon area calculation using shoelace formula
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area) / 2;
  }

  generateDummySegmentation() {
    // Generate dummy data when Roboflow is not available
    const foodClasses = [
      "apple",
      "banana",
      "chicken",
      "rice",
      "broccoli",
      "potato",
      "bread",
    ];
    const numItems = Math.floor(Math.random() * 3) + 2;
    const results = [];

    for (let i = 0; i < numItems; i++) {
      const randomClass =
        foodClasses[Math.floor(Math.random() * foodClasses.length)];

      // Generate random bounding box (assuming 1080x1920 image)
      const x = Math.floor(Math.random() * 600);
      const y = Math.floor(Math.random() * 1000);
      const width = Math.floor(Math.random() * 300) + 100;
      const height = Math.floor(Math.random() * 300) + 100;

      // Simulate realistic area (60-90% of bounding box)
      const area = Math.floor(width * height * (0.6 + Math.random() * 0.3));

      results.push({
        id: `dummy_${i}`,
        confidence: 0.75 + Math.random() * 0.2,
        class: randomClass,
        mask: [], // Simplified
        boundingBox: { x, y, width, height },
        area,
      });
    }

    return results;
  }

  async healthCheck() {
    if (!this.apiKey) {
      return { status: "not_configured", message: "API key not provided" };
    }

    try {
      // Simple health check - just verify the API key format
      const isValidFormat = this.apiKey.length > 10;
      return {
        status: isValidFormat ? "configured" : "invalid_key",
        model: this.modelId,
        version: this.version,
      };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }
}

module.exports = new RoboflowService();
