// AI Model Configuration
// Configuration for the backend AI food detection service

export const AI_MODEL_CONFIG = {
  // Backend API endpoint
  baseUrl: 'http://192.168.0.107:5000',

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

  // API endpoints
  endpoints: {
    predict: '/predict',
    directPredict: '/direct-predict',
    generateMask: '/generate-mask',
    classes: '/classes',
    health: '/health',
    test: '/test',
  },
};

// Helper function to validate configuration
export function validateAIModelConfig() {
  if (!AI_MODEL_CONFIG.baseUrl) {
    console.warn(
      '⚠️  Backend URL not configured. Please update config/aiModel.ts with your backend URL.'
    );
    return false;
  }

  return true;
}

// Helper function to build API endpoint URLs
export function buildApiUrl(
  endpoint: keyof typeof AI_MODEL_CONFIG.endpoints
): string {
  return `${AI_MODEL_CONFIG.baseUrl}${AI_MODEL_CONFIG.endpoints[endpoint]}`;
}

// Export available food classes (these should match what your backend model supports)
export const SUPPORTED_FOOD_CLASSES = [
  'Selroti',
  'bhat',
  'burger',
  'chana masala',
  'chiya',
  'chowmein',
  'daal',
  'dhido',
  'gundruk',
  'kheer',
  'masu',
  'momo',
  'pakoda',
  'roti',
  'samosa',
  'yomari',
];
