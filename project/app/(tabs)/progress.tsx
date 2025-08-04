import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Calendar, TrendingUp, TrendingDown, Target, Award } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, unit, trend, trendValue }: { title: string; value: string; unit: string; trend: 'up' | 'down'; trendValue: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <View style={styles.statValueContainer}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
    <View style={styles.statTrend}>
      {trend === 'up' ? (
        <TrendingUp size={16} color="#10B981" />
      ) : (
        <TrendingDown size={16} color="#EF4444" />
      )}
      <Text style={[styles.statTrendText, { color: trend === 'up' ? '#10B981' : '#EF4444' }]}>
        {trendValue}
      </Text>
    </View>
  </View>
);

const ProgressBar = ({ label, current, target, color }: { label: string; current: number; target: number; color: string }) => {
  const percentage = (current / target) * 100;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{current}/{target}g</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const AchievementCard = ({ icon, title, description, completed }: { icon: any; title: string; description: string; completed: boolean }) => (
  <View style={[styles.achievementCard, { opacity: completed ? 1 : 0.6 }]}>
    <View style={[styles.achievementIcon, { backgroundColor: completed ? '#10B981' : '#E5E7EB' }]}>
      {icon}
    </View>
    <View style={styles.achievementInfo}>
      <Text style={styles.achievementTitle}>{title}</Text>
      <Text style={styles.achievementDescription}>{description}</Text>
    </View>
    {completed && <Award size={20} color="#F59E0B" />}
  </View>
);

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerSubtitle}>Track your health journey</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.timeSelector}>
          <TouchableOpacity style={[styles.timeSelectorButton, styles.timeSelectorButtonActive]}>
            <Text style={[styles.timeSelectorText, styles.timeSelectorTextActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeSelectorButton}>
            <Text style={styles.timeSelectorText}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeSelectorButton}>
            <Text style={styles.timeSelectorText}>Year</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Average Calories"
            value="1,245"
            unit="kcal"
            trend="up"
            trendValue="+5%"
          />
          <StatCard
            title="Weight"
            value="68.2"
            unit="kg"
            trend="down"
            trendValue="-2.1%"
          />
          <StatCard
            title="Blood Sugar"
            value="95"
            unit="mg/dL"
            trend="down"
            trendValue="-3%"
          />
          <StatCard
            title="Streak"
            value="7"
            unit="days"
            trend="up"
            trendValue="+2"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Nutrition Goals</Text>
          
          <View style={styles.nutritionProgress}>
            <ProgressBar label="Carbohydrates" current={120} target={185} color="#3B82F6" />
            <ProgressBar label="Protein" current={65} target={74} color="#10B981" />
            <ProgressBar label="Fat" current={35} target={49} color="#F59E0B" />
            <ProgressBar label="Fiber" current={18} target={25} color="#8B5CF6" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Sugar Trends</Text>
          
          <View style={styles.chartContainer}>
            <View style={styles.chartPlaceholder}>
              <TrendingUp size={48} color="#10B981" />
              <Text style={styles.chartText}>Your blood sugar has been stable</Text>
              <Text style={styles.chartSubtext}>Average: 95 mg/dL (Normal Range)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          
          <View style={styles.achievements}>
            <AchievementCard
              icon={<Target size={20} color="#FFFFFF" />}
              title="7-Day Streak"
              description="Logged meals for 7 days straight"
              completed={true}
            />
            <AchievementCard
              icon={<TrendingDown size={20} color="#FFFFFF" />}
              title="Weight Goal"
              description="Lost 2kg this month"
              completed={true}
            />
            <AchievementCard
              icon={<Calendar size={20} color="#FFFFFF" />}
              title="Monthly Challenge"
              description="Complete 30 days of tracking"
              completed={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Insights</Text>
          
          <View style={styles.insights}>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>🎯 Great job!</Text>
              <Text style={styles.insightText}>
                Your carbohydrate intake has been consistently within the recommended range this week.
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>💪 Keep it up!</Text>
              <Text style={styles.insightText}>
                Your protein intake is on track. Try adding more lean proteins to maintain muscle mass.
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>📈 Recommendation</Text>
              <Text style={styles.insightText}>
                Consider increasing your fiber intake by adding more vegetables and whole grains.
              </Text>
            </View>
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
  timeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
  },
  timeSelectorButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  timeSelectorButtonActive: {
    backgroundColor: '#10B981',
  },
  timeSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  timeSelectorTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  nutritionProgress: {
    paddingHorizontal: 20,
    gap: 16,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  progressValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chartText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginTop: 12,
  },
  chartSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  achievements: {
    paddingHorizontal: 20,
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  insights: {
    paddingHorizontal: 20,
    gap: 12,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});