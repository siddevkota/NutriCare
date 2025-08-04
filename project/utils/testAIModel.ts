import {
  AI_MODEL_CONFIG,
  validateAIModelConfig,
  buildApiUrl,
} from '../config/aiModel';

/**
 * Test function to validate AI model API setup
 * Run this to check if your backend service is working
 */
export async function testAIModelAPI(): Promise<void> {
  console.log('🧪 Testing AI Model API Setup...');

  // Validate configuration
  if (!validateAIModelConfig()) {
    console.error('❌ Configuration validation failed');
    return;
  }

  console.log('✅ Configuration looks good');
  console.log(`📡 Backend URL: ${AI_MODEL_CONFIG.baseUrl}`);
  console.log(`🔗 Health endpoint: ${buildApiUrl('health')}`);

  // Test backend health
  try {
    console.log('🏥 Testing backend health...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(buildApiUrl('health'), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('🎉 Backend health check successful!');
      console.log(`📊 Model ready: ${data.model_ready ? 'Yes' : 'No'}`);
      console.log(`📋 Available endpoints:`, data.endpoints);

      // Test classes endpoint
      await testClassesEndpoint();

      // Test prediction with sample data (optional)
      await testPredictionEndpoint();
    } else {
      const errorText = await response.text();
      console.error(
        `❌ Health check failed: ${response.status} ${response.statusText}`
      );
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    console.log('💡 Make sure your backend server is running and accessible');
    console.log(`   Expected URL: ${AI_MODEL_CONFIG.baseUrl}`);
  }
}

async function testClassesEndpoint(): Promise<void> {
  try {
    console.log('📋 Testing classes endpoint...');

    const response = await fetch(buildApiUrl('classes'), {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Classes endpoint working');
      console.log(`🍽️ Available food classes: ${data.total_classes || 0}`);

      if (data.available_classes && data.available_classes.length > 0) {
        console.log(
          '📝 Sample classes:',
          data.available_classes.slice(0, 5).join(', ')
        );
      }
    } else {
      console.warn('⚠️ Classes endpoint failed');
    }
  } catch (error) {
    console.warn('⚠️ Classes endpoint test failed:', error);
  }
}

async function testPredictionEndpoint(): Promise<void> {
  try {
    console.log('🔮 Testing prediction endpoint with sample data...');

    // Create a simple test base64 image (1x1 pixel)
    const testBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const response = await fetch(buildApiUrl('predict'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: testBase64,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Prediction endpoint working');
      console.log(`🔍 Test prediction status: ${data.status}`);

      if (data.detected_classes) {
        console.log(
          `📊 Detected classes in test: ${data.detected_classes.length}`
        );
      }
    } else {
      console.warn(
        '⚠️ Prediction endpoint failed (this might be expected with test data)'
      );
    }
  } catch (error) {
    console.warn('⚠️ Prediction endpoint test failed:', error);
  }
}

/**
 * Quick connectivity test
 */
export async function quickConnectivityTest(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(buildApiUrl('health'), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    console.error('❌ Quick connectivity test failed:', error);
    return false;
  }
}

/**
 * Test with actual image data
 */
export async function testWithImage(base64Image: string): Promise<any> {
  try {
    console.log('🖼️ Testing with actual image...');

    const response = await fetch(buildApiUrl('predict'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Image prediction successful');
      console.log(
        `🔍 Detected ${data.detected_classes?.length || 0} food classes`
      );
      return data;
    } else {
      const errorText = await response.text();
      console.error(`❌ Image prediction failed: ${response.status}`);
      console.error('Error:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Image prediction error:', error);
    return null;
  }
}
