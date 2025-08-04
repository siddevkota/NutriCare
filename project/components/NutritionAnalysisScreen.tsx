import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  NutritionAnalysisService,
  MealAnalysis,
  FoodAnalysis,
  nutritionAnalysisService,
} from '../services/nutritionAnalysisService';

interface NutritionAnalysisScreenProps {
  detectedFoods: Array<{
    name: string;
    area_cm2?: number;
    weight?: number;
  }>;
  onClose: () => void;
}

export default function NutritionAnalysisScreen({
  detectedFoods,
  onClose,
}: NutritionAnalysisScreenProps) {
  const [loading, setLoading] = useState(true);
  const [mealAnalysis, setMealAnalysis] = useState<MealAnalysis | null>(null);
  const [foodDetails, setFoodDetails] = useState<FoodAnalysis[]>([]);
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'details' | 'recommendations'
  >('overview');

  useEffect(() => {
    analyzeMeal();
  }, []);

  const analyzeMeal = async () => {
    try {
      setLoading(true);

      // Get diabetes risk analysis
      const diabetesAnalysis =
        await nutritionAnalysisService.analyzeDiabetesRisk(
          detectedFoods.map((food) => ({
            name: food.name,
            weight: food.weight || 100,
          }))
        );

      setMealAnalysis(diabetesAnalysis);

      // Get detailed info for each food
      const details = await Promise.all(
        detectedFoods.map(async (food) => {
          try {
            return await nutritionAnalysisService.getFoodDetails(food.name);
          } catch (error) {
            console.error(`Error getting details for ${food.name}:`, error);
            return null;
          }
        })
      );

      setFoodDetails(
        details.filter((detail) => detail !== null) as FoodAnalysis[]
      );
    } catch (error) {
      console.error('Error analyzing meal:', error);
      Alert.alert('Error', 'Failed to analyze meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return '#22c55e';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderOverview = () => {
    if (!mealAnalysis) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Analysis Overview</Text>

        {/* Risk Level Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: getRiskColor(mealAnalysis.risk_level) + '20' },
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name={
                mealAnalysis.risk_level === 'high'
                  ? 'warning'
                  : mealAnalysis.risk_level === 'medium'
                  ? 'alert-circle'
                  : 'checkmark-circle'
              }
              size={24}
              color={getRiskColor(mealAnalysis.risk_level)}
            />
            <Text
              style={[
                styles.cardTitle,
                { color: getRiskColor(mealAnalysis.risk_level) },
              ]}
            >
              {mealAnalysis.risk_level.toUpperCase()} DIABETES RISK
            </Text>
          </View>
        </View>

        {/* Glycemic Info */}
        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>Glycemic Index & Load</Text>
          <View style={styles.row}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{mealAnalysis.average_gi}</Text>
              <Text style={styles.metricLabel}>Average GI</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {mealAnalysis.total_glycemic_load}
              </Text>
              <Text style={styles.metricLabel}>Total GL</Text>
            </View>
          </View>
        </View>

        {/* High Risk Foods */}
        {mealAnalysis.high_risk_foods.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>⚠️ High Risk Foods</Text>
            {mealAnalysis.high_risk_foods.map((food, index) => (
              <View key={index} style={styles.riskFoodItem}>
                <Text style={styles.riskFoodName}>{food.name}</Text>
                <Text style={styles.riskFoodDetails}>
                  GI: {food.gi} | GL: {food.gl}
                </Text>
                <Text style={styles.riskFoodReason}>{food.reason}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Food Details</Text>
      {foodDetails.map((food, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.cardTitle}>{food.food_name}</Text>

          {/* Nutrition Info */}
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {food.nutrition.calories || 0}
              </Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {food.nutrition.protein || 0}g
              </Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {food.nutrition.carbohydrates || 0}g
              </Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {food.nutrition.fat || 0}g
              </Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>

          {/* Glycemic Info */}
          {food.glycemic_info && food.glycemic_info.gi && (
            <View style={styles.glycemicInfo}>
              <Text style={styles.glycemicTitle}>Glycemic Impact</Text>
              <View style={styles.row}>
                <View style={styles.glycemicItem}>
                  <Text
                    style={[
                      styles.glycemicValue,
                      { color: getRiskColor(food.glycemic_info.category) },
                    ]}
                  >
                    {food.glycemic_info.gi}
                  </Text>
                  <Text style={styles.glycemicLabel}>
                    GI ({food.glycemic_info.category})
                  </Text>
                </View>
                <View style={styles.glycemicItem}>
                  <Text style={styles.glycemicValue}>
                    {food.glycemic_info.glycemic_load}
                  </Text>
                  <Text style={styles.glycemicLabel}>Glycemic Load</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderRecommendations = () => {
    if (!mealAnalysis) return null;

    const allRecommendations =
      nutritionAnalysisService.generateMealRecommendations(mealAnalysis);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommendations</Text>

        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>
            💡 Suggestions for Better Blood Sugar Control
          </Text>
          {allRecommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Food Alternatives */}
        {Object.keys(mealAnalysis.alternatives).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>🔄 Healthier Alternatives</Text>
            {Object.entries(mealAnalysis.alternatives).map(
              ([foodName, alternatives], index) => (
                <View key={index} style={styles.alternativeGroup}>
                  <Text style={styles.alternativeFood}>
                    Instead of {foodName}:
                  </Text>
                  {alternatives.map((alt, altIndex) => (
                    <View key={altIndex} style={styles.alternativeItem}>
                      <Text style={styles.alternativeName}>{alt.name}</Text>
                      <Text style={styles.alternativeReason}>{alt.reason}</Text>
                      <Text style={styles.alternativeImprovement}>
                        → {alt.improvement}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Analyzing Nutrition...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            Analyzing your meal for diabetes risk...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Nutrition Analysis</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'overview' && styles.activeTabText,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'details' && styles.activeTab]}
          onPress={() => setSelectedTab('details')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'details' && styles.activeTabText,
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'recommendations' && styles.activeTab,
          ]}
          onPress={() => setSelectedTab('recommendations')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'recommendations' && styles.activeTabText,
            ]}
          >
            Tips
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'details' && renderDetails()}
        {selectedTab === 'recommendations' && renderRecommendations()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  riskFoodItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  riskFoodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  riskFoodDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  riskFoodReason: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  nutritionItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 8,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  nutritionLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  glycemicInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  glycemicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  glycemicItem: {
    alignItems: 'center',
  },
  glycemicValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  glycemicLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  alternativeGroup: {
    marginBottom: 16,
  },
  alternativeFood: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  alternativeItem: {
    paddingLeft: 12,
    marginBottom: 6,
  },
  alternativeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  alternativeReason: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  alternativeImprovement: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
});
