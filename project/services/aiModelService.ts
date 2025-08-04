import { SegmentationResult } from '../types/segmentation';
import { AI_MODEL_CONFIG, buildApiUrl } from '../config/aiModel';
import * as FileSystem from 'expo-file-system';

export interface AIModelConfig {
  baseUrl: string;
  confidenceThreshold?: number;
  maxDetections?: number;
}

// AI Model service that uses the backend
export class AIModelService {
  private config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  async segmentImage(imageUri: string): Promise<SegmentationResult[]> {
    let lastError: Error | null = null;

    // Retry logic for network failures
    for (let attempt = 1; attempt <= AI_MODEL_CONFIG.maxRetries; attempt++) {
      try {
        // Convert image to base64
        const base64Image = await this.imageUriToBase64(imageUri);

        // Make API request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          AI_MODEL_CONFIG.requestTimeout
        );

        const response = await fetch(buildApiUrl('predict'), {
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
            `AI model request failed: ${response.status} ${response.statusText}. ${errorText}`
          );
        }

        const data = await response.json();
        console.log('✅ AI model response received');

        // Process the backend response
        return this.processBackendResponse(data);
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (
            error.message.includes('400') ||
            error.message.includes('401') ||
            error.message.includes('403')
          ) {
            throw error; // Don't retry client errors
          }
        }

        if (attempt < AI_MODEL_CONFIG.maxRetries) {
          // Wait before retrying (except on last attempt)
          console.log(
            `⏳ Waiting ${AI_MODEL_CONFIG.retryDelay}ms before retry...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, AI_MODEL_CONFIG.retryDelay * attempt)
          );
        }
      }
    }

    throw (
      lastError || new Error('AI model request failed after all retry attempts')
    );
  }

  private async imageUriToBase64(imageUri: string): Promise<string> {
    try {
      // Handle different URI formats
      if (imageUri.startsWith('data:')) {
        // Already base64, extract the data part
        return imageUri.split(',')[1];
      } else if (imageUri.startsWith('file://')) {
        // Local file, read and convert to base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      } else {
        throw new Error('Unsupported image URI format');
      }
    } catch (error) {
      console.error('❌ Error converting image to base64:', error);
      throw new Error(`Failed to process image: ${error}`);
    }
  }

  private processBackendResponse(data: any): SegmentationResult[] {
    try {
      const results: SegmentationResult[] = [];

      if (data.status === 'success' && data.detected_classes) {
        for (let i = 0; i < data.detected_classes.length; i++) {
          const className = data.detected_classes[i];
          const classArea = data.class_areas?.[className];

          results.push({
            id: `${className}_${i}`,
            class: className,
            confidence: 0.8, // Backend doesn't provide individual confidence scores
            boundingBox: {
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            },
            x: 50, // Center x
            y: 50, // Center y
            area: classArea ? classArea.pixels : 0,
            mask: [[]], // Empty mask for now - could be populated from backend
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error processing backend response:', error);
      return [];
    }
  }

  // Test the AI model connectivity
  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(buildApiUrl('health'), {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ AI model service is healthy:', data);
        return data.model_ready === true;
      }

      return false;
    } catch (error) {
      console.error('❌ AI model service health check failed:', error);
      return false;
    }
  }

  // Get available food classes from the backend
  async getAvailableClasses(): Promise<string[]> {
    try {
      const response = await fetch(buildApiUrl('classes'), {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        return data.available_classes || [];
      }

      return [];
    } catch (error) {
      console.error('❌ Failed to get available classes:', error);
      return [];
    }
  }
}

// Export a default instance
export const aiModelService = new AIModelService({
  baseUrl: AI_MODEL_CONFIG.baseUrl,
  confidenceThreshold: AI_MODEL_CONFIG.confidenceThreshold,
  maxDetections: AI_MODEL_CONFIG.maxDetections,
});

// Backwards compatibility exports
export const RoboflowService = AIModelService; // Alias for existing code
export type RoboflowConfig = AIModelConfig; // Type alias
