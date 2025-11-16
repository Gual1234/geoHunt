import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface GameTimerProps {
  startedAt: number;
  durationMs: number;
  onTimeUp?: () => void;
}

export const GameTimer: React.FC<GameTimerProps> = ({ startedAt, durationMs, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && onTimeUp) {
        onTimeUp();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMs, onTimeUp]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft <= 60000; // Last minute
  const isCritical = timeLeft <= 30000; // Last 30 seconds

  return (
    <View style={styles.container}>
      <Text style={[
        styles.timerText,
        isWarning && styles.warningText,
        isCritical && styles.criticalText,
      ]}>
        ⏱️ {formatTime(timeLeft)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  warningText: {
    color: '#F39C12',
  },
  criticalText: {
    color: '#E74C3C',
  },
});











