import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  User,
  Settings,
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  ChevronRight,
  CreditCard as Edit3,
} from 'lucide-react-native';

const ProfileSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ProfileItem = ({
  icon,
  title,
  value,
  onPress,
  showSwitch = false,
  switchValue = false,
}: {
  icon: any;
  title: string;
  value?: string;
  onPress: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
}) => (
  <TouchableOpacity style={styles.profileItem} onPress={onPress}>
    <View style={styles.profileItemIcon}>{icon}</View>
    <View style={styles.profileItemContent}>
      <Text style={styles.profileItemTitle}>{title}</Text>
      {value && <Text style={styles.profileItemValue}>{value}</Text>}
    </View>
    {showSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onPress}
        trackColor={{ false: '#E5E7EB', true: '#10B981' }}
        thumbColor="#FFFFFF"
      />
    ) : (
      <ChevronRight size={20} color="#9CA3AF" />
    )}
  </TouchableOpacity>
);

const StatCard = ({
  title,
  value,
  unit,
}: {
  title: string;
  value: string;
  unit: string;
}) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statUnit}>{unit}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Edit3 size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={48} color="#10B981" />
          </View>
          <Text style={styles.userName}>Siddhartha</Text>
          <Text style={styles.userEmail}>sid1827763@gmail.com</Text>
          <Text style={styles.userType}>
            Diabetes Management & Healthy Living
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard title="Current Weight" value="50.0" unit="kg" />
          <StatCard title="Age" value="22" unit="years" />
          <StatCard title="BMI" value="19.8" unit="" />
        </View>

        <ProfileSection title="Health Information">
          <ProfileItem
            icon={<User size={20} color="#10B981" />}
            title="Personal Details"
            value="Age 22, Male"
            onPress={() => {}}
          />
          <ProfileItem
            icon={<Settings size={20} color="#10B981" />}
            title="Health Goal"
            value="Diabetes Prevention & Healthy Living"
            onPress={() => {}}
          />
          <ProfileItem
            icon={<Settings size={20} color="#10B981" />}
            title="Daily Calorie Goal"
            value="2,000 kcal"
            onPress={() => {}}
          />
        </ProfileSection>

        <ProfileSection title="Preferences">
          <ProfileItem
            icon={<Bell size={20} color="#10B981" />}
            title="Meal Reminders"
            onPress={() => {}}
            showSwitch={true}
            switchValue={true}
          />
          <ProfileItem
            icon={<Bell size={20} color="#10B981" />}
            title="Blood Sugar Reminders"
            onPress={() => {}}
            showSwitch={true}
            switchValue={true}
          />
          <ProfileItem
            icon={<Settings size={20} color="#10B981" />}
            title="Units"
            value="Metric"
            onPress={() => {}}
          />
        </ProfileSection>

        <ProfileSection title="Privacy & Security">
          <ProfileItem
            icon={<Shield size={20} color="#10B981" />}
            title="Data Privacy"
            value="Manage your data"
            onPress={() => {}}
          />
          <ProfileItem
            icon={<Settings size={20} color="#10B981" />}
            title="Export Data"
            value="Download your information"
            onPress={() => {}}
          />
        </ProfileSection>

        <ProfileSection title="Support">
          <ProfileItem
            icon={<HelpCircle size={20} color="#10B981" />}
            title="Help Center"
            value="Get help and support"
            onPress={() => {}}
          />
          <ProfileItem
            icon={<Settings size={20} color="#10B981" />}
            title="Contact Us"
            value="Reach out to our team"
            onPress={() => {}}
          />
        </ProfileSection>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>DiabetesTracker v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 HealthTech Solutions</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  userType: {
    fontSize: 14,
    color: '#10B981',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileItemContent: {
    flex: 1,
  },
  profileItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  profileItemValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
