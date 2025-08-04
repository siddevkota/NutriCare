import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ChartBar as BarChart3,
  Settings,
} from 'lucide-react-native';
import { MealOptionModal } from '../../components/MealOptionModal';
import { ManualLogScreen } from '../../components/ManualLogScreen';
import {
  ScanFoodScreen,
  DetectionResult,
} from '../../components/ScanFoodScreen';
// Removed FoodResultsScreen import - no longer needed
import { HistoryScreen } from '../../components/HistoryScreen';
import NetworkTestScreen from '../../components/NetworkTestScreen';

const MacroCard = ({
  title,
  current,
  total,
  unit,
}: {
  title: string;
  current: number;
  total: number;
  unit: string;
}) => (
  <View style={styles.macroCard}>
    <Text style={styles.macroTitle}>{title}</Text>
    <Text style={styles.macroValue}>
      {current} / {total}
      {unit}
    </Text>
    <View style={styles.macroBar}>
      <View
        style={[styles.macroProgress, { width: `${(current / total) * 100}%` }]}
      />
    </View>
  </View>
);

const MealCard = ({
  title,
  calories,
  image,
  onPress,
}: {
  title: string;
  calories: string;
  image: any;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.mealCard} onPress={onPress}>
    <Image source={image} style={styles.mealImage} />
    <View style={styles.mealInfo}>
      <Text style={styles.mealTitle}>{title}</Text>
      <Text style={styles.mealCalories}>{calories}</Text>
    </View>
    <Plus size={24} color="#10B981" />
  </TouchableOpacity>
);

export default function HomeScreen() {
  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const [showMealModal, setShowMealModal] = useState(false);
  const [showManualLog, setShowManualLog] = useState(false);
  const [showScanFood, setShowScanFood] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNetworkTest, setShowNetworkTest] = useState(false);
  // Removed: showResults, scanResults, capturedImage - no longer needed since we save directly
  const [mealLogs, setMealLogs] = useState<{ [key: string]: any[] }>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });

  const currentDate = new Date();
  const greeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleMealPress = (mealType: string) => {
    setSelectedMeal(mealType);
    setShowMealModal(true);
  };

  const handleManualEntry = () => {
    setShowMealModal(false);
    setShowManualLog(true);
  };

  const handleScanFood = () => {
    setShowMealModal(false);
    setShowScanFood(true);
  };

  const handleManualSave = (logData: any) => {
    setMealLogs((prev) => ({
      ...prev,
      [selectedMeal.toLowerCase()]: [
        ...prev[selectedMeal.toLowerCase()],
        logData,
      ],
    }));
    setShowManualLog(false);
    setSelectedMeal('');
  };

  const handleScanResults = (results: DetectionResult[], imageUri: string) => {
    // Directly save to meal logs instead of showing FoodResultsScreen
    setMealLogs((prev) => ({
      ...prev,
      [selectedMeal.toLowerCase()]: [
        ...prev[selectedMeal.toLowerCase()],
        ...results,
      ],
    }));

    // Clear the selected meal and close scan food screen
    setSelectedMeal('');

    // Log the save action
    console.log(`📝 Saved ${results.length} food items to ${selectedMeal} log`);
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.class} (${result.weight}g)`);
    });
  };

  // Removed handleScanSave function - no longer needed since saving directly from ScanFoodScreen

  const getMealCalories = (mealType: string) => {
    const logs = mealLogs[mealType.toLowerCase()] || [];
    const totalCalories = logs.reduce((sum, log) => {
      if (log.nutrition) {
        return sum + log.nutrition.calories;
      }
      return sum + (log.calories || 0);
    }, 0);

    const recommendations = {
      breakfast: '371 - 519 kcal',
      lunch: '445 - 593 kcal',
      dinner: '445 - 593 kcal',
      snacks: '100 - 150 kcal',
    };

    if (totalCalories > 0) {
      return `${totalCalories} kcal logged | Recommended: ${
        recommendations[mealType.toLowerCase() as keyof typeof recommendations]
      }`;
    }

    return `Recommended: ${
      recommendations[mealType.toLowerCase() as keyof typeof recommendations]
    }`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" />

      <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{greeting()}, Siddhartha!</Text>
          <Text style={styles.date}>
            Today,{' '}
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>

          <View style={styles.calorieCircle}>
            <Text style={styles.calorieNumber}>1482</Text>
            <Text style={styles.calorieLabel}>KCAL LEFT</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>EATEN</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>BURNED</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.seeStatsButton, styles.halfButton]}
              onPress={() => setShowHistory(true)}
            >
              <Text style={styles.seeStatsText}>VIEW HISTORY</Text>
              <BarChart3 size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.seeStatsButton, styles.halfButton]}
              onPress={() => setShowNetworkTest(true)}
            >
              <Text style={styles.seeStatsText}>DEBUG NETWORK</Text>
              <Settings size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.macroSection}>
          <MacroCard title="Carbs" current={0} total={185} unit="g" />
          <MacroCard title="Protein" current={0} total={74} unit="g" />
          <MacroCard title="Fat" current={0} total={49} unit="g" />
        </View>

        <View style={styles.dateNavigation}>
          <TouchableOpacity>
            <ChevronLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.dateText}>
            TODAY,{' '}
            {currentDate
              .toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
              .toUpperCase()}
          </Text>
          <TouchableOpacity>
            <ChevronRight size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.mealsSection}>
          <MealCard
            title="Breakfast"
            calories={getMealCalories('breakfast')}
            image={{
              uri: 'https://images.pexels.com/photos/1414234/pexels-photo-1414234.jpeg?auto=compress&cs=tinysrgb&w=400',
            }}
            onPress={() => handleMealPress('Breakfast')}
          />
          <MealCard
            title="Lunch"
            calories={getMealCalories('lunch')}
            image={{
              uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
            }}
            onPress={() => handleMealPress('Lunch')}
          />
          <MealCard
            title="Dinner"
            calories={getMealCalories('dinner')}
            image={{
              uri: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400',
            }}
            onPress={() => handleMealPress('Dinner')}
          />
          <MealCard
            title="Snacks"
            calories={getMealCalories('snacks')}
            image={{
              uri: 'https://images.pexels.com/photos/1435903/pexels-photo-1435903.jpeg?auto=compress&cs=tinysrgb&w=400',
            }}
            onPress={() => handleMealPress('Snacks')}
          />
        </View>
      </View>

      {/* Meal Option Modal */}
      <MealOptionModal
        visible={showMealModal}
        mealType={selectedMeal}
        onClose={() => setShowMealModal(false)}
        onManualLog={handleManualEntry}
        onScanFood={handleScanFood}
      />

      {/* Manual Log Screen */}
      <ManualLogScreen
        visible={showManualLog}
        mealType={selectedMeal}
        onClose={() => setShowManualLog(false)}
        onSave={handleManualSave}
      />

      {/* Scan Food Screen */}
      <ScanFoodScreen
        visible={showScanFood}
        mealType={selectedMeal}
        onClose={() => setShowScanFood(false)}
        onSave={handleScanResults}
      />

      {/* Food Results Screen - REMOVED: Now saving directly from ScanFoodScreen */}
      {/* History Screen */}
      <HistoryScreen
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        mealLogs={mealLogs}
      />

      {/* Debug Network Test Modal */}
      <Modal
        visible={showNetworkTest}
        animationType="slide"
        statusBarTranslucent
      >
        <NetworkTestScreen />
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 50,
            right: 20,
            backgroundColor: '#EF4444',
            padding: 10,
            borderRadius: 20,
          }}
          onPress={() => setShowNetworkTest(false)}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Close</Text>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 30,
  },
  calorieCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  calorieNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  calorieLabel: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  seeStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  seeStatsText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  macroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  macroCard: {
    flex: 1,
    alignItems: 'center',
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  macroBar: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  macroProgress: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  mealsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 14,
    color: '#6B7280',
  },
});
