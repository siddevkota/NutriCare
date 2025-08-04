import { ROBOFLOW_CONFIG, validateRoboflowConfig } from '../config/roboflow';

/**
 * Test function to validate Roboflow API setup
 * Run this to check if your API credentials are working
 */
export async function testRoboflowAPI(): Promise<void> {
  console.log('🧪 Testing Roboflow API Setup...');

  // Validate configuration
  if (!validateRoboflowConfig()) {
    console.error('❌ Configuration validation failed');
    return;
  }

  console.log('✅ Configuration looks good');
  console.log(`📡 API Endpoint: ${ROBOFLOW_CONFIG.baseUrl}`);
  console.log(`🤖 Model ID: ${ROBOFLOW_CONFIG.modelId}`);
  console.log(`🔑 API Key: ${ROBOFLOW_CONFIG.apiKey.substring(0, 8)}...`);

  // Test with a sample image URL (if you want to test without uploading)
  try {
    const testImageUrl =
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'; // Sample food image

    const response = await fetch(
      `${ROBOFLOW_CONFIG.baseUrl}/${ROBOFLOW_CONFIG.modelId}?api_key=${
        ROBOFLOW_CONFIG.apiKey
      }&image=${encodeURIComponent(testImageUrl)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('🎉 API test successful!');
      console.log(`🔍 Found ${data.predictions?.length || 0} predictions`);

      if (data.predictions && data.predictions.length > 0) {
        console.log('📋 Sample predictions:');
        data.predictions.slice(0, 3).forEach((pred: any, i: number) => {
          console.log(
            `  ${i + 1}. ${pred.class} (${(pred.confidence * 100).toFixed(
              1
            )}% confidence)`
          );
        });
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ API test failed: ${response.status} - ${errorText}`);

      if (response.status === 401) {
        console.error('🔑 Check your API key - it might be invalid');
      } else if (response.status === 404) {
        console.error('🤖 Check your model ID - it might be incorrect');
      }
    }
  } catch (error) {
    console.error('❌ Network error during API test:', error);
  }
}

/**
 * Quick validation without making API calls
 */
export function quickValidation(): boolean {
  console.log('⚡ Quick validation check...');

  const issues: string[] = [];

  if (ROBOFLOW_CONFIG.apiKey === '3WRiAnFfpoD83Bevoupm') {
    issues.push('Using example API key');
  }

  if (ROBOFLOW_CONFIG.modelId === 'new-merged-0ma7p/3') {
    issues.push('Using example model ID');
  }

  if (!ROBOFLOW_CONFIG.apiKey || ROBOFLOW_CONFIG.apiKey.length < 10) {
    issues.push('API key looks too short');
  }

  if (!ROBOFLOW_CONFIG.modelId.includes('/')) {
    issues.push('Model ID should be in format "project-name/version"');
  }

  if (issues.length > 0) {
    console.warn('⚠️ Configuration issues found:');
    issues.forEach((issue) => console.warn(`  - ${issue}`));
    return false;
  }

  console.log('✅ Configuration looks ready for production!');
  return true;
}

// Usage examples:
/*
// In your app or console:
import { testRoboflowAPI, quickValidation } from './utils/testRoboflow';

// Quick check without API call
quickValidation();

// Full API test (requires internet and valid credentials)
testRoboflowAPI();
*/
