import { SegmentationResult } from '../types/segmentation';
import { AI_MODEL_CONFIG, buildApiUrl } from '../config/aiModel';
import * as FileSystem from 'expo-file-system';

export interface AIModelConfig {
  baseUrl: string;
  confidenceThreshold?: number;
  maxDetections?: number;
}

// AI Model service using backend API
export class AIModelService {
  private config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  async segmentImage(imageUri: string): Promise<SegmentationResult[]> {
    let lastError: Error | null = null;

    // Retry logic for network failures
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Convert image to base64
        const base64Image = await this.imageUriToBase64(imageUri);

        // Make API request with timeout (following official Roboflow docs)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(
          `${this.baseUrl}/${this.config.modelId}?api_key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: base64Image,
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Roboflow API error: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();

        // Convert Roboflow response to our SegmentationResult format
        return this.parseRoboflowResponse(data);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(
          `Roboflow API attempt ${attempt} failed:`,
          lastError.message
        );

        // Don't retry on certain errors
        if (
          error instanceof Error &&
          (error.message.includes('401') || // Unauthorized
            error.message.includes('403') || // Forbidden
            error.message.includes('invalid API key'))
        ) {
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(
      `Failed to segment image after 3 attempts: ${
        lastError?.message || 'Unknown error'
      }`
    );
  }

  private async imageUriToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      throw new Error(
        `Failed to convert image to base64: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private parseRoboflowResponse(data: any): SegmentationResult[] {
    // Handle official Roboflow serverless API response format
    if (!data.predictions || !Array.isArray(data.predictions)) {
      console.warn('No predictions found in Roboflow response:', data);
      return [];
    }

    return data.predictions
      .filter(
        (prediction: any) =>
          (prediction.confidence || 0) >=
          (this.config.confidenceThreshold || 0.5)
      )
      .slice(0, this.config.maxDetections || 10)
      .map((prediction: any, index: number) => {
        const {
          x,
          y,
          width,
          height,
          confidence,
          class: className,
        } = prediction;

        // Roboflow returns center coordinates, convert to top-left
        const boundingBox = {
          x: Math.max(0, Math.round(x - width / 2)),
          y: Math.max(0, Math.round(y - height / 2)),
          width: Math.round(width),
          height: Math.round(height),
        };

        // Generate a simple mask for the bounding box area
        const imageWidth = data.image?.width || 640;
        const imageHeight = data.image?.height || 480;
        const mask = this.generateBoundingBoxMask(
          boundingBox,
          imageWidth,
          imageHeight
        );

        return {
          id: `roboflow_${index}_${Date.now()}`,
          className: className || 'unknown',
          confidence: confidence || 0,
          boundingBox,
          mask,
          area: boundingBox.width * boundingBox.height,
        };
      });
  }

  private generateBoundingBoxMask(
    boundingBox: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number
  ): number[][] {
    // Create a simple rectangular mask
    const mask: number[][] = [];

    for (let y = 0; y < imageHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < imageWidth; x++) {
        if (
          x >= boundingBox.x &&
          x < boundingBox.x + boundingBox.width &&
          y >= boundingBox.y &&
          y < boundingBox.y + boundingBox.height
        ) {
          row.push(1);
        } else {
          row.push(0);
        }
      }
      mask.push(row);
    }

    return mask;
  }
}

// Dummy segmentation service that simulates Roboflow API
export class DummySegmentationService {
  private config: RoboflowConfig;

  constructor(config: RoboflowConfig) {
    this.config = config;
  }

  async segmentImage(
    imageUri: string,
    imageWidth: number,
    imageHeight: number
  ): Promise<SegmentationResult[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate dummy segmentation results
    const dummyResults: SegmentationResult[] = [];

    // Simulate 2-4 food items detected
    const numItems = Math.floor(Math.random() * 3) + 2;
    const foodClasses = [
      'apple',
      'banana',
      'chicken',
      'rice',
      'broccoli',
      'potato',
      'bread',
    ];

    for (let i = 0; i < numItems; i++) {
      const randomClass =
        foodClasses[Math.floor(Math.random() * foodClasses.length)];

      // Generate random bounding box
      const x = Math.floor(Math.random() * (imageWidth * 0.6));
      const y = Math.floor(Math.random() * (imageHeight * 0.6));
      const width = Math.floor(Math.random() * (imageWidth * 0.3)) + 50;
      const height = Math.floor(Math.random() * (imageHeight * 0.3)) + 50;

      // Generate dummy mask (simplified as ellipse-like shape)
      const mask = this.generateDummyMask(
        x,
        y,
        width,
        height,
        imageWidth,
        imageHeight
      );
      const area = this.calculateMaskArea(mask);

      dummyResults.push({
        id: `item_${i}`,
        confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
        class: randomClass,
        mask,
        boundingBox: { x, y, width, height },
        area,
      });
    }

    return dummyResults;
  }

  private generateDummyMask(
    x: number,
    y: number,
    width: number,
    height: number,
    imageWidth: number,
    imageHeight: number
  ): number[][] {
    const mask: number[][] = [];

    // Initialize mask with zeros
    for (let i = 0; i < imageHeight; i++) {
      mask[i] = new Array(imageWidth).fill(0);
    }

    // Create ellipse-like mask
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    for (
      let py = Math.max(0, y);
      py < Math.min(imageHeight, y + height);
      py++
    ) {
      for (
        let px = Math.max(0, x);
        px < Math.min(imageWidth, x + width);
        px++
      ) {
        const dx = (px - centerX) / radiusX;
        const dy = (py - centerY) / radiusY;

        // Ellipse equation with some randomness for organic shape
        if (dx * dx + dy * dy <= 1 + Math.random() * 0.2) {
          mask[py][px] = 1;
        }
      }
    }

    return mask;
  }

  private calculateMaskArea(mask: number[][]): number {
    let area = 0;
    for (let i = 0; i < mask.length; i++) {
      for (let j = 0; j < mask[i].length; j++) {
        if (mask[i][j] === 1) {
          area++;
        }
      }
    }
    return area;
  }
}
