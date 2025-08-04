export interface NutritionData {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
  vitamins: {
    vitamin_c: number;
    vitamin_a: number;
    vitamin_b12: number;
    folate: number;
  };
  minerals: {
    calcium: number;
    iron: number;
    magnesium: number;
    potassium: number;
    zinc: number;
  };
}

export interface GlycemicInfo {
  gi: number;
  category: 'low' | 'medium' | 'high';
  glycemic_load: number;
  gl_category: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface DiabetesRisk {
  score: number;
  level: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface HealthAlternative {
  name: string;
  reason: string;
  improvement: string;
}

export interface FoodAnalysis {
  food_name: string;
  estimated_weight: number;
  nutrition: NutritionData;
  glycemic_info: GlycemicInfo;
  diabetes_risk: DiabetesRisk;
  health_alternatives: HealthAlternative[];
}

export interface MealAnalysis {
  risk_level: 'low' | 'medium' | 'high';
  average_gi: number;
  total_glycemic_load: number;
  high_risk_foods: Array<{
    name: string;
    gi: number;
    gl: number;
    reason: string;
  }>;
  recommendations: string[];
  alternatives: Record<string, HealthAlternative[]>;
}

export class NutritionAnalysisService {
  private readonly baseUrls = [
    'http://192.168.0.107:5000', // Primary network IP (updated)
    'http://localhost:5000', // Localhost fallback
    'http://127.0.0.1:5000', // Localhost alternative
  ];

  private async tryFetch(
    endpoint: string,
    options?: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (const baseUrl of this.baseUrls) {
      try {
        console.log(`🌐 Trying ${baseUrl}${endpoint}`);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`✅ Successfully connected to ${baseUrl}`);
        return response;
      } catch (error) {
        console.warn(`❌ Failed to connect to ${baseUrl}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw lastError || new Error('All backend URLs failed');
  }

  async analyzeDiabetesRisk(
    detectedFoods: Array<{ name: string; weight?: number }>
  ): Promise<MealAnalysis> {
    try {
      console.log('🔍 Starting diabetes analysis with foods:', detectedFoods);

      const response = await this.tryFetch('/diabetes-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detected_foods: detectedFoods,
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log('✅ Received diabetes analysis data:', data);

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      return data.analysis;
    } catch (error) {
      console.error('❌ Error analyzing diabetes risk:', error);
      console.error('🔧 Error type:', typeof error);
      console.error(
        '🔧 Error message:',
        error instanceof Error ? error.message : String(error)
      );

      if (
        error instanceof TypeError &&
        error.message.includes('Network request failed')
      ) {
        console.error(
          '🌐 Network connection issue - check if backend is running and accessible'
        );
        console.error('🌐 Tried URLs:', this.baseUrls);
      }

      throw error;
    }
  }

  async getFoodDetails(foodName: string): Promise<FoodAnalysis> {
    try {
      const response = await this.tryFetch(
        `/food-details/${encodeURIComponent(foodName)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      // Return the raw data structure from the API
      return data;
    } catch (error) {
      console.error('Error getting food details:', error);
      throw error;
    }
  }

  async enhancedWeightEstimation(
    foods: Array<{ name: string; area_cm2: number }>
  ): Promise<
    Array<{
      food_name: string;
      estimated_weight_grams: number;
      calculation_details: any;
      nutrition: NutritionData;
      glycemic_info: GlycemicInfo;
    }>
  > {
    try {
      const response = await this.tryFetch('/weight-estimation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foods: foods,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      return data.weight_estimations;
    } catch (error) {
      console.error('Error in enhanced weight estimation:', error);
      throw error;
    }
  }

  calculateGlycemicLoad(gi: number, carbohydrates: number): number {
    return Math.round(((gi * carbohydrates) / 100) * 10) / 10;
  }

  categorizeGlycemicIndex(gi: number): 'low' | 'medium' | 'high' {
    if (gi <= 55) return 'low';
    if (gi <= 69) return 'medium';
    return 'high';
  }

  categorizeGlycemicLoad(gl: number): 'low' | 'medium' | 'high' {
    if (gl <= 10) return 'low';
    if (gl <= 19) return 'medium';
    return 'high';
  }

  getDiabetesRiskColor(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
      case 'low':
        return '#22c55e'; // Green
      case 'medium':
        return '#f59e0b'; // Yellow
      case 'high':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  }

  getGIColor(category: 'low' | 'medium' | 'high'): string {
    return this.getDiabetesRiskColor(category);
  }

  formatNutritionValue(value: number, unit: string): string {
    if (value === 0) return '0' + unit;
    if (value < 1) return value.toFixed(1) + unit;
    return Math.round(value) + unit;
  }

  generateMealRecommendations(mealAnalysis: MealAnalysis): string[] {
    const recommendations: string[] = [...mealAnalysis.recommendations];

    // Add specific recommendations based on risk level
    if (mealAnalysis.risk_level === 'high') {
      recommendations.push(
        'Consider reducing portion sizes by 25-30%',
        'Add a side salad or non-starchy vegetables',
        'Drink water instead of sugary beverages',
        'Consider eating protein first to slow glucose absorption'
      );
    } else if (mealAnalysis.risk_level === 'medium') {
      recommendations.push(
        'Add some fiber-rich vegetables',
        'Consider a short walk after eating',
        'Monitor blood glucose if diabetic'
      );
    } else {
      recommendations.push(
        'Great food choices for blood sugar control',
        'Maintain similar portion sizes',
        'Consider this meal as a template for future meals'
      );
    }

    // Add recommendations based on glycemic load
    if (mealAnalysis.total_glycemic_load > 20) {
      recommendations.push(
        'Total glycemic load is high - consider splitting into two smaller meals',
        'Add protein or healthy fats to help stabilize blood sugar'
      );
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

export const nutritionAnalysisService = new NutritionAnalysisService();
