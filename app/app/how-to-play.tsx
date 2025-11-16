import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type Step = {
  title: string;
  body: string;
  tip?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

export default function HowToPlayScreen() {
  const router = useRouter();
  const steps: Step[] = useMemo(
    () => [
      {
        title: 'Welcome to GeoHunt',
        body:
          'A real-world Police vs Thief game. Create or join a room, pick a role, set the area, and start the chase.',
        icon: 'map-outline',
        iconColor: '#2C3E50',
      },
      {
        title: 'Lobby',
        body:
          'In the lobby, players join, choose roles, and the host selects the play area and duration.',
        tip: 'All players must have a role before the host can start.',
        icon: 'people-outline',
        iconColor: '#8E44AD',
      },
      {
        title: 'Police Radar',
        body:
          'Police see a detection circle that pulses—if the thief is inside, you’ll get visual feedback to close in.',
        tip: 'Stick together and sweep the area systematically.',
        icon: 'radio-outline',
        iconColor: '#2980B9',
      },
      {
        title: 'Thief Gameplay',
        body:
          'Stay within bounds and avoid the police detection range. Use cover and movement to stay hidden.',
        icon: 'walk-outline',
        iconColor: '#E67E22',
      },
      {
        title: 'Bonus Areas',
        body:
          'Special zones spawn during the game. Enter them to trigger events or gain strategic advantages.',
        tip: 'Plan routes that pass through bonuses without getting caught.',
        icon: 'gift-outline',
        iconColor: '#16A085',
      },
      {
        title: 'Reveals',
        body:
          'At intervals, the thief’s approximate location is revealed briefly to police. Time your escapes!',
        icon: 'locate-outline',
        iconColor: '#E74C3C',
      },
      {
        title: 'Win Conditions',
        body:
          'Police win by catching the thief. The thief wins by staying free until the timer runs out.',
        icon: 'trophy-outline',
        iconColor: '#F1C40F',
      },
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index !== activeIndex) setActiveIndex(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>How to Play</Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {steps.map((step, idx) => (
          <View key={idx} style={[styles.step, { width }]}>
            <View style={styles.illustration}>
              {step.icon ? (
                <Ionicons name={step.icon} size={72} color={step.iconColor || '#3498DB'} />
              ) : null}
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.body}</Text>
            {step.tip ? <Text style={styles.stepTip}>Tip: {step.tip}</Text> : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLinkText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  step: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepBody: {
    fontSize: 16,
    color: '#34495E',
    lineHeight: 22,
    textAlign: 'center',
  },
  stepTip: {
    marginTop: 12,
    fontSize: 14,
    color: '#16A085',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#3498DB',
  },
  dotInactive: {
    backgroundColor: '#D0E6F7',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBtn: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  primaryButton: {
    backgroundColor: '#3498DB',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  footerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerBtnTextSecondary: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLinkText: {
    color: '#3498DB',
    textDecorationLine: 'underline',
    fontSize: 16,
    fontWeight: '600',
  },
});


