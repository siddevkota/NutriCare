// Roboflow API Configuration
// Replace these values with your actual Roboflow project details

export const ROBOFLOW_CONFIG = {
  // Your Roboflow API key from https://roboflow.com
  apiKey: 'jfQMbxkaKpflYF11bXu2', // Updated with new API key

  // Your model ID (found in your Roboflow project) - format: "project-name/version"
  modelId: 'new-coin-merged/1', // Updated with new coin-enabled model

  // API endpoint (official Roboflow serverless endpoint)
  baseUrl: 'https://serverless.roboflow.com',

  // Confidence threshold for detections (0.0 - 1.0)
  confidenceThreshold: 0.5,

  // Maximum number of detections per image
  maxDetections: 10,

  // Image quality settings
  imageQuality: 0.8,
  maxImageSize: 1024, // Max width/height in pixels

  // Timeout settings
  requestTimeout: 30000, // 30 seconds

  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// Helper function to validate configuration
export function validateRoboflowConfig() {
  if (ROBOFLOW_CONFIG.apiKey === '3WRiAnFfpoD83Bevoupm') {
    console.warn(
      '⚠️  Using example Roboflow API key. Please update config/roboflow.ts with your actual API key.'
    );
    return false;
  }

  if (
    !ROBOFLOW_CONFIG.modelId ||
    ROBOFLOW_CONFIG.modelId === 'new-merged-0ma7p/3'
  ) {
    console.warn(
      '⚠️  Using example model ID. Please update config/roboflow.ts with your actual model ID.'
    );
    return false;
  }

  return true;
}

// Instructions for getting Roboflow API credentials:
/*
OFFICIAL ROBOFLOW API IMPLEMENTATION (UPDATED)
==============================================
Based on official Roboflow documentation: https://docs.roboflow.com/

JAVASCRIPT/TYPESCRIPT IMPLEMENTATION (CURRENT):
==============================================
✅ Using official serverless.roboflow.com endpoint
✅ Matching official API call structure
✅ Proper error handling and retries

Setup Instructions:
1. Sign up at https://roboflow.com
2. Create a new project for food detection
3. Upload and annotate food images (or use existing models)
4. Train your model or use a pre-trained one
5. Go to your project → Deploy → API tab
6. Copy your API key and model ID (format: "project-name/version")
7. Replace the example values above with your actual credentials

Example API call (matches official docs):
fetch("https://serverless.roboflow.com/your-project/1?api_key=your-api-key", {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: base64Image
})

ALTERNATIVE: IMAGE URL INFERENCE
===============================
For images already hosted online, you can use URL inference:
fetch("https://serverless.roboflow.com/your-project/1?api_key=your-api-key&image=https://example.com/food.jpg", {
  method: 'POST'
})

PYTHON ALTERNATIVE (For Backend):
================================
pip install inference-sdk

from inference_sdk import InferenceHTTPClient

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="your-api-key"
)

result = CLIENT.infer("image.jpg", model_id="your-project/1")

RECOMMENDED FOOD MODELS:
=======================
- Search Roboflow Universe for "food detection"
- Popular models: food-items, fruits-vegetables, meal-analysis
- Or train your own custom model for best accuracy

TESTING YOUR SETUP:
==================
1. Replace example credentials with your actual ones
2. Run the app and take a photo
3. Check console for API responses
4. Adjust confidence threshold based on results
*/
