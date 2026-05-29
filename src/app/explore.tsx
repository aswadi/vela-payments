import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function ExploreScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Discover new ways to manage and spend your funds.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 16,
  },
});
