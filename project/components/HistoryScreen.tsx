import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Apple,
} from 'lucide-react-native';

interface HistoryScreenProps {
  visible: boolean;
  onClose: () => void;
  mealLogs: { [key: string]: any[] };
}

interface DayLog {
  date: string;
  meals: {
    breakfast: any[];
    lunch: any[];
    dinner: any[];
    snacks: any[];
  };
  totalCalories: number;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  visible,
  onClose,
  mealLogs,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Generate mock historical data for demonstration
  const generateHistoryData = (): DayLog[] => {
    const days: DayLog[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      // Use current mealLogs for today, generate mock data for other days
      let meals;
      if (i === 0) {
        meals = {
          breakfast: mealLogs.breakfast || [],
          lunch: mealLogs.lunch || [],
          dinner: mealLogs.dinner || [],
          snacks: mealLogs.snacks || [],
        };
      } else {
        meals = {
          breakfast: i % 2 === 0 ? [{ name: 'Oatmeal', calories: 300 }] : [],
          lunch: i % 3 === 0 ? [{ name: 'Chicken Salad', calories: 450 }] : [],
          dinner: i % 2 === 1 ? [{ name: 'Grilled Fish', calories: 400 }] : [],
          snacks: i % 4 === 0 ? [{ name: 'Almonds', calories: 120 }] : [],
        };
      }

      const totalCalories = Object.values(meals)
        .flat()
        .reduce((sum, item) => {
          return sum + (item.calories || item.nutrition?.calories || 0);
        }, 0);

      days.push({
        date: dateString,
        meals,
        totalCalories,
      });
    }

    return days;
  };

  const historyData = generateHistoryData();

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return <Coffee size={20} color="#F59E0B" />;
      case 'lunch':
        return <Sun size={20} color="#EF4444" />;
      case 'dinner':
        return <Moon size={20} color="#8B5CF6" />;
      case 'snacks':
        return <Apple size={20} color="#10B981" />;
      default:
        return <Utensils size={20} color="#6B7280" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderMealItem = (item: any, mealType: string) => (
    <View style={styles.mealItem}>
      <View style={styles.mealItemHeader}>
        {getMealIcon(mealType)}
        <Text style={styles.mealItemName}>
          {item.name || item.class || 'Unknown Food'}
        </Text>
      </View>
      <Text style={styles.mealItemCalories}>
        {item.calories || item.nutrition?.calories || 0} cal
      </Text>
    </View>
  );

  const renderDayLog = ({ item }: { item: DayLog }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayDate}>{formatDate(item.date)}</Text>
        <Text style={styles.dayCalories}>{item.totalCalories} cal</Text>
      </View>

      {Object.entries(item.meals).map(
        ([mealType, items]) =>
          items.length > 0 && (
            <View key={mealType} style={styles.mealSection}>
              <View style={styles.mealTypeHeader}>
                {getMealIcon(mealType)}
                <Text style={styles.mealTypeName}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
                <Text style={styles.mealItemCount}>
                  {items.length} item{items.length > 1 ? 's' : ''}
                </Text>
              </View>
              {items.map((item, index) => (
                <View key={index}>{renderMealItem(item, mealType)}</View>
              ))}
            </View>
          )
      )}

      {item.totalCalories === 0 && (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No meals logged for this day</Text>
        </View>
      )}
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Meal History</Text>
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Weekly Overview</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {historyData.reduce((sum, day) => sum + day.totalCalories, 0)}
              </Text>
              <Text style={styles.statLabel}>Total Calories</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {historyData.filter((day) => day.totalCalories > 0).length}
              </Text>
              <Text style={styles.statLabel}>Days Logged</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {Math.round(
                  historyData.reduce((sum, day) => sum + day.totalCalories, 0) /
                    7
                )}
              </Text>
              <Text style={styles.statLabel}>Avg Daily</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={historyData}
          renderItem={renderDayLog}
          keyExtractor={(item) => item.date}
          style={styles.historyList}
          contentContainerStyle={styles.historyContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <Text style={styles.datePickerText}>
                Date picker coming soon!
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  historyList: {
    flex: 1,
  },
  historyContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  dayCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  mealSection: {
    marginBottom: 12,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  mealItemCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 4,
  },
  mealItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealItemName: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  mealItemCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  datePickerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  datePickerButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  datePickerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
