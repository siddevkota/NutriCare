import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Check, Edit3, Trash2 } from 'lucide-react-native';
import { DetectionResult } from './ScanFoodScreen';

interface FoodResultsScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave: (results: DetectionResult[]) => void;
  results: DetectionResult[];
  capturedImage: string;
  mealType: string;
}

export const FoodResultsScreen: React.FC<FoodResultsScreenProps> = ({
  visible,
  onClose,
  onSave,
  results,
  capturedImage,
  mealType,
}) => {
  const [editableResults, setEditableResults] =
    React.useState<DetectionResult[]>(results);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingWeight, setEditingWeight] = React.useState<string>('');

  React.useEffect(() => {
    setEditableResults(results);
  }, [results]);

  const handleDeleteResult = (id: string) => {
    Alert.alert(
      'Delete Food Item',
      'Are you sure you want to remove this food item from the results?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setEditableResults((prev) =>
              prev.filter((result) => result.id !== id)
            );
          },
        },
      ]
    );
  };

  const handleEditWeight = (id: string, currentWeight: number) => {
    setEditingItemId(id);
    setEditingWeight(currentWeight.toString());
  };

  const handleSaveWeight = (id: string) => {
    const newWeight = parseFloat(editingWeight);
    if (isNaN(newWeight) || newWeight <= 0) {
      Alert.alert(
        'Invalid Weight',
        'Please enter a valid weight greater than 0.'
      );
      return;
    }

    setEditableResults((prev) =>
      prev.map((result) => {
        if (result.id === id) {
          // Recalculate nutrition based on new weight
          const weightRatio = newWeight / result.weight;
          return {
            ...result,
            weight: newWeight,
            nutrition: {
              calories: Math.round(result.nutrition.calories * weightRatio),
              protein:
                Math.round(result.nutrition.protein * weightRatio * 10) / 10,
              carbs: Math.round(result.nutrition.carbs * weightRatio * 10) / 10,
              fat: Math.round(result.nutrition.fat * weightRatio * 10) / 10,
            },
          };
        }
        return result;
      })
    );

    setEditingItemId(null);
    setEditingWeight('');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingWeight('');
  };

  const handleSaveResults = () => {
    if (editableResults.length === 0) {
      Alert.alert(
        'No Results',
        'Please keep at least one food item or retake the photo.'
      );
      return;
    }
    onSave(editableResults);
  };

  const getTotalNutrition = () => {
    return editableResults.reduce(
      (total, result) => ({
        calories: total.calories + result.nutrition.calories,
        protein: total.protein + result.nutrition.protein,
        carbs: total.carbs + result.nutrition.carbs,
        fat: total.fat + result.nutrition.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const totalNutrition = getTotalNutrition();

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      {/* Main Content */}
      <View style={styles.container}>
        <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Food Analysis Results</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveResults}
            >
              <Check size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content}>
          {/* Captured Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: capturedImage }}
              style={styles.capturedImage}
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.mealTypeText}>{mealType}</Text>
              <Text style={styles.detectionCountText}>
                {editableResults.length} food item
                {editableResults.length !== 1 ? 's' : ''} detected
              </Text>
            </View>
          </View>

          {/* Total Nutrition Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Nutrition</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {totalNutrition.calories}
                </Text>
                <Text style={styles.summaryLabel}>Calories</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {totalNutrition.protein.toFixed(1)}g
                </Text>
                <Text style={styles.summaryLabel}>Protein</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {totalNutrition.carbs.toFixed(1)}g
                </Text>
                <Text style={styles.summaryLabel}>Carbs</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {totalNutrition.fat.toFixed(1)}g
                </Text>
                <Text style={styles.summaryLabel}>Fat</Text>
              </View>
            </View>
          </View>

          {/* Individual Food Items */}
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Detected Food Items</Text>
            {editableResults.map((result, index) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{result.class}</Text>
                    <Text style={styles.resultConfidence}>
                      {(result.confidence * 100).toFixed(0)}% confidence
                    </Text>
                  </View>
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditWeight(result.id, result.weight)}
                    >
                      <Edit3 size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteResult(result.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.resultDetails}>
                  <View style={styles.weightContainer}>
                    {editingItemId === result.id ? (
                      <View style={styles.editWeightContainer}>
                        <Text style={styles.editLabel}>Weight:</Text>
                        <TextInput
                          style={styles.weightInput}
                          value={editingWeight}
                          onChangeText={setEditingWeight}
                          keyboardType="numeric"
                          placeholder="Enter weight"
                          autoFocus
                        />
                        <Text style={styles.unitText}>g</Text>
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.saveEditButton}
                            onPress={() => handleSaveWeight(result.id)}
                          >
                            <Check size={14} color="#10B981" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelEditButton}
                            onPress={handleCancelEdit}
                          >
                            <Text style={styles.cancelEditText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.weightDisplayContainer}
                        onPress={() =>
                          handleEditWeight(result.id, result.weight)
                        }
                      >
                        <Text style={styles.weightText}>
                          Weight: {result.weight}g
                        </Text>
                        <Edit3
                          size={12}
                          color="#9CA3AF"
                          style={styles.editIcon}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {result.nutrition.calories}
                      </Text>
                      <Text style={styles.nutritionLabel}>cal</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {result.nutrition.protein.toFixed(1)}g
                      </Text>
                      <Text style={styles.nutritionLabel}>protein</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {result.nutrition.carbs.toFixed(1)}g
                      </Text>
                      <Text style={styles.nutritionLabel}>carbs</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {result.nutrition.fat.toFixed(1)}g
                      </Text>
                      <Text style={styles.nutritionLabel}>fat</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Review Your Results</Text>
            <Text style={styles.instructionsText}>
              • Check if all detected food items are correct
            </Text>
            <Text style={styles.instructionsText}>
              • Remove any incorrect detections using the delete button
            </Text>
            <Text style={styles.instructionsText}>
              • Tap the check mark to save results to your{' '}
              {mealType.toLowerCase()} log
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.finalSaveButton}
            onPress={handleSaveResults}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.finalSaveButtonText}>
              Save to {mealType} Log
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  capturedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
  },
  mealTypeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  detectionCountText: {
    color: '#D1FAE5',
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  resultsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'capitalize',
  },
  resultConfidence: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  resultDetails: {
    gap: 12,
  },
  weightContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  weightText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  instructionsCard: {
    backgroundColor: '#EEF2FF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  finalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  finalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  editWeightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  weightInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    minWidth: 60,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
  unitText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  saveEditButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  cancelEditButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelEditText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  weightDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editIcon: {
    marginLeft: 4,
  },
});
