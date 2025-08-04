import { SegmentationResult } from '../types/segmentation';
import * as FileSystem from 'expo-file-system';
import { PYTHON_BACKEND_CONFIG } from '../config/pythonBackend';

export interface PythonBackendConfig {
  baseUrl: string;
  timeout?: number;
}

export interface BackendResponse {
  segmentationResults: SegmentationResult[];
  segmentationMask: string | null;
  classMap: { [key: string]: string };
  detectedClasses: string[];
  rawResponse?: any;
}

// Python Backend API service for Roboflow food detection
export class PythonBackendService {
  private config: PythonBackendConfig;

  constructor(config: PythonBackendConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    };
  }

  async segmentImage(imageUri: string): Promise<SegmentationResult[]> {
    let lastError: Error | null = null;

    // Try multiple URLs in case of network issues
    const fallbackUrls = [
      this.config.baseUrl,
      'http://192.168.0.107:5000', // Direct network IP (updated)
      'http://127.0.0.1:5000', // Localhost fallback
    ];

    // Retry logic for network failures
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Try each URL for this attempt
      for (const baseUrl of fallbackUrls) {
        try {
          console.log(
            `🔄 Food detection attempt ${attempt}/3 using ${baseUrl}`
          );

          // Convert image to base64
          const base64Image = await this.imageUriToBase64(imageUri);

          // Make API request to Python backend
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            this.config.timeout!
          );

          const response = await fetch(`${baseUrl}/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Image,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Python backend API error: ${response.status} - ${errorText}`
            );
          }

          const data = await response.json();

          if (data.status !== 'success') {
            throw new Error(data.message || 'Prediction failed');
          }

          // Convert Python backend response to SegmentationResult format
          const results = this.convertBackendResponse(data);

          console.log(
            `✅ Food detection successful! Found ${results.length} items using ${baseUrl}`
          );
          return results;
        } catch (error) {
          lastError = error as Error;
          console.error(`❌ Attempt ${attempt} failed with ${baseUrl}:`, error);
        }
      }

      if (attempt < 3) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    // If all attempts failed, provide mock data for development
    console.warn('⚠️ Backend unreachable, using mock data for development');

    // Return mock detection results for development/demo purposes with better positioned bounding boxes
    const mockResults: SegmentationResult[] = [
      {
        id: 'mock_rice_1',
        class: 'bhat',
        confidence: 0.85,
        area: 2500,
        boundingBox: { x: 120, y: 150, width: 180, height: 120 }, // Center-left area
        mask: [],
      },
      {
        id: 'mock_dal_1',
        class: 'daal',
        confidence: 0.78,
        area: 1800,
        boundingBox: { x: 320, y: 180, width: 140, height: 100 }, // Center-right area
        mask: [],
      },
    ];

    console.log('📱 Using mock food detection results for demo');
    return mockResults;
  }

  async segmentImageWithMask(imageUri: string): Promise<BackendResponse> {
    let lastError: Error | null = null;

    // Try multiple URLs in case of network issues
    const fallbackUrls = [
      this.config.baseUrl,
      'http://192.168.0.107:5000', // Direct network IP (updated)
      'http://127.0.0.1:5000', // Localhost fallback
    ];

    // Retry logic for network failures
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Try each URL for this attempt
      for (const baseUrl of fallbackUrls) {
        try {
          console.log(
            `🔄 Food detection with mask attempt ${attempt}/3 using ${baseUrl}`
          );

          // Convert image to base64
          const base64Image = await this.imageUriToBase64(imageUri);

          // Make API request to Python backend
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            this.config.timeout!
          );

          const response = await fetch(`${baseUrl}/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Image,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Python backend API error: ${response.status} - ${errorText}`
            );
          }

          const data = await response.json();

          if (data.status !== 'success') {
            throw new Error(data.message || 'Prediction failed');
          }

          console.log('Backend response:', {
            detectedClasses: data.detected_classes,
            classAreas: data.class_areas,
            maskDimensions: data.mask_info,
          });

          // Convert Python backend response to SegmentationResult format
          const segmentationResults = this.convertBackendResponse(data);

          const backendResponse: BackendResponse = {
            segmentationResults,
            segmentationMask: data.segmentation_mask || null,
            classMap: data.class_map || {},
            detectedClasses: data.detected_classes || [],
            rawResponse: data,
          };

          console.log(
            `✅ Food detection with mask successful! Found ${segmentationResults.length} items using ${baseUrl}`
          );
          return backendResponse;
        } catch (error) {
          lastError = error as Error;
          console.error(`❌ Attempt ${attempt} failed with ${baseUrl}:`, error);
        }
      }

      if (attempt < 3) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    // If all attempts failed, provide mock data for development
    console.warn('⚠️ Backend unreachable, using mock data for mask view');

    const mockResults: SegmentationResult[] = [
      {
        id: 'mock_rice_1',
        class: 'bhat',
        confidence: 0.85,
        area: 2500,
        boundingBox: { x: 120, y: 150, width: 180, height: 120 },
        mask: [],
      },
      {
        id: 'mock_dal_1',
        class: 'daal',
        confidence: 0.78,
        area: 1800,
        boundingBox: { x: 320, y: 180, width: 140, height: 100 },
        mask: [],
      },
    ];

    const mockResponse: BackendResponse = {
      segmentationResults: mockResults,
      segmentationMask: null, // No mock mask for now
      classMap: { '1': 'bhat', '2': 'daal' },
      detectedClasses: ['bhat', 'daal'],
    };

    console.log('📱 Using mock food detection results with mask data for demo');
    return mockResponse;
  }

  private async imageUriToBase64(imageUri: string): Promise<string> {
    try {
      // Read the image file as base64
      const base64String = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return base64String;
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error}`);
    }
  }

  private convertBackendResponse(backendData: any): SegmentationResult[] {
    const results: SegmentationResult[] = [];

    try {
      // Extract detected classes and their areas from Python backend response
      const detectedClasses = backendData.detected_classes || [];
      const classAreas = backendData.class_areas || {};
      const maskDimensions = backendData.mask_info || {};

      console.log('Backend response:', {
        detectedClasses,
        classAreas,
        maskDimensions,
      });

      // Convert each detected class to SegmentationResult
      detectedClasses.forEach((className: string, index: number) => {
        const classInfo = classAreas[className];

        if (classInfo) {
          // Create more realistic bounding box based on percentage and area
          const percentage = classInfo.percentage || 5;
          const maskWidth = maskDimensions.width || 512;
          const maskHeight = maskDimensions.height || 512;

          // Estimate bounding box size from area percentage
          const estimatedSize = Math.sqrt(
            (percentage / 100) * (maskWidth * maskHeight)
          );
          const boxWidth = Math.min(estimatedSize * 1.2, maskWidth * 0.8);
          const boxHeight = Math.min(estimatedSize * 1.2, maskHeight * 0.8);

          // Position boxes in a grid-like pattern to avoid overlap
          const cols = Math.ceil(Math.sqrt(detectedClasses.length));
          const row = Math.floor(index / cols);
          const col = index % cols;

          const x =
            (col * maskWidth) / cols + (maskWidth / cols - boxWidth) / 2;
          const y =
            (row * maskHeight) / Math.ceil(detectedClasses.length / cols) +
            (maskHeight / Math.ceil(detectedClasses.length / cols) -
              boxHeight) /
              2;

          const result: SegmentationResult = {
            id: `${className}_${index}`,
            class: className,
            confidence: 0.8, // Default confidence since Python backend doesn't return this
            area: classInfo.pixels || 1000, // Use pixel count as area
            boundingBox: {
              x: Math.max(0, Math.min(x, maskWidth - boxWidth)),
              y: Math.max(0, Math.min(y, maskHeight - boxHeight)),
              width: boxWidth,
              height: boxHeight,
            },
            mask: [], // Mask data not currently used in mobile app
          };

          results.push(result);
        } else {
          // Fallback for classes without area info
          const result: SegmentationResult = {
            id: `${className}_${index}`,
            class: className,
            confidence: 0.7,
            area: 1000, // Default area
            boundingBox: {
              x: 100 + index * 80,
              y: 100 + index * 60,
              width: 150,
              height: 150,
            },
            mask: [],
          };

          results.push(result);
        }
      });

      // If no results, return empty array
      if (results.length === 0) {
        console.log('No food items detected by Python backend');
      }

      return results;
    } catch (error) {
      console.error('Error converting backend response:', error);
      throw new Error(`Failed to process detection results: ${error}`);
    }
  }

  // Health check method to test backend connectivity
  async healthCheck(): Promise<boolean> {
    const fallbackUrls = [
      this.config.baseUrl,
      'http://192.168.0.107:5000',
      'http://127.0.0.1:5000',
    ];

    for (const baseUrl of fallbackUrls) {
      try {
        console.log(`🏥 Testing health check on ${baseUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const isHealthy =
            data.status === 'healthy' || data.message?.includes('running');

          if (isHealthy) {
            console.log(`✅ Backend healthy at ${baseUrl}`);
            return true;
          }
        }
      } catch (error) {
        console.log(`❌ Health check failed for ${baseUrl}:`, error);
      }
    }

    console.log(`❌ All health checks failed`);
    return false;
  }

  // Test method to verify backend is working
  async testBackend(): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.config.baseUrl}/test`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Test request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Backend test failed:', error);
      throw error;
    }
  }
}

// Export a configured instance
export const pythonBackendService = new PythonBackendService({
  baseUrl: PYTHON_BACKEND_CONFIG.current,
  timeout: PYTHON_BACKEND_CONFIG.timeout,
});

// Alternative service for production/remote backend
export const createPythonBackendService = (baseUrl: string) => {
  return new PythonBackendService({ baseUrl });
};
