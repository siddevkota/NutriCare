import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Search, Plus, Clock, Star } from 'lucide-react-native';

const QuickAddCard = ({ title, calories, carbs, onPress }: { title: string; calories: string; carbs: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.quickAddCard} onPress={onPress}>
    <View style={styles.quickAddInfo}>
      <Text style={styles.quickAddTitle}>{title}</Text>
      <Text style={styles.quickAddDetails}>{calories} • {carbs}</Text>
    </View>
    <Plus size={20} color="#10B981" />
  </TouchableOpacity>
);

const FoodCategoryCard = ({ icon, title, subtitle, onPress }: { icon: any; title: string; subtitle: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
    <View style={styles.categoryIcon}>
      {icon}
    </View>
    <View style={styles.categoryInfo}>
      <Text style={styles.categoryTitle}>{title}</Text>
      <Text style={styles.categorySubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

export default function AddScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Food</Text>
        <Text style={styles.headerSubtitle}>Log your meals and track your nutrition</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for food, recipes, or brands..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickAddGrid}>
            <QuickAddCard
              title="Apple (medium)"
              calories="95 cal"
              carbs="25g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Banana (medium)"
              calories="105 cal"
              carbs="27g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Oatmeal (1 cup)"
              calories="150 cal"
              carbs="27g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Greek Yogurt"
              calories="130 cal"
              carbs="9g carbs"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Foods</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.recentFoods}>
            <QuickAddCard
              title="Chicken Breast (grilled)"
              calories="231 cal"
              carbs="0g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Brown Rice (1 cup)"
              calories="216 cal"
              carbs="45g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Broccoli (steamed)"
              calories="55 cal"
              carbs="11g carbs"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          
          <View style={styles.categoriesGrid}>
            <FoodCategoryCard
              icon={<Star size={24} color="#F59E0B" />}
              title="Favorites"
              subtitle="Your saved foods"
              onPress={() => {}}
            />
            <FoodCategoryCard
              icon={<Clock size={24} color="#8B5CF6" />}
              title="Recipes"
              subtitle="Custom meals"
              onPress={() => {}}
            />
            <FoodCategoryCard
              icon={<Plus size={24} color="#10B981" />}
              title="Create Food"
              subtitle="Add custom item"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Foods</Text>
          
          <View style={styles.popularFoods}>
            <QuickAddCard
              title="Avocado (half)"
              calories="160 cal"
              carbs="9g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Almonds (1 oz)"
              calories="164 cal"
              carbs="6g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Salmon (3 oz)"
              calories="175 cal"
              carbs="0g carbs"
              onPress={() => {}}
            />
            <QuickAddCard
              title="Sweet Potato"
              calories="112 cal"
              carbs="26g carbs"
              onPress={() => {}}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  quickAddGrid: {
    paddingHorizontal: 20,
  },
  quickAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickAddInfo: {
    flex: 1,
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  quickAddDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentFoods: {
    paddingHorizontal: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  popularFoods: {
    paddingHorizontal: 20,
  },
});