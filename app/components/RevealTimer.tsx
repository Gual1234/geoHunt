import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { formatTimeRemaining } from '@/lib/utils';

export const RevealTimer = () => {
  const { revealState } = useGameStore();
  const [now, setNow] = useState(Date.now());

  // Update every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!revealState) return null;

  const { isRevealing, nextRevealAt } = revealState;

  if (nextRevealAt) {
    const timeLeft = nextRevealAt - now;
    if (timeLeft <= 0) return null;

    // If revealing and time left, show countdown to next reveal
    if (isRevealing) {
      return (
        <View style={[styles.container, styles.revealing]}>
          <View style={styles.pulseIndicator} />
          <Text style={styles.revealingText}>📍 THIEVES REVEALED!</Text>
          <Text style={styles.label}>Next Reveal In</Text>
          <Text style={styles.timerText}>{formatTimeRemaining(timeLeft)}</Text>
        </View>
      );
    }

    // Not revealing yet, show countdown
    return (
      <View style={[styles.container, styles.waiting]}>
        <Text style={styles.label}>Next Reveal In</Text>
        <Text style={styles.timerText}>{formatTimeRemaining(timeLeft)}</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  waiting: {
    backgroundColor: '#E8F4F8',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  revealing: {
    backgroundColor: '#FFE5E5',
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  label: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  revealingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 4,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E74C3C',
    marginBottom: 8,
  },
});













