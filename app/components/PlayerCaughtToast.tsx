import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getSocket } from '@/lib/socket';
import { PlayerCaughtEvent } from '@/types';
import { formatDistance } from '@/lib/utils';

export const PlayerCaughtToast = () => {
  const [event, setEvent] = useState<PlayerCaughtEvent | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const socket = getSocket();

    socket.on('playerCaught', (caughtEvent: PlayerCaughtEvent) => {
      setEvent(caughtEvent);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 4 seconds
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setEvent(null);
        });
      }, 4000);
    });

    return () => {
      socket.off('playerCaught');
    };
  }, []);

  if (!event) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.emoji}>🚨</Text>
      <View style={styles.content}>
        <Text style={styles.title}>Player Caught!</Text>
        <Text style={styles.text}>
          {event.captorPlayerName} caught {event.capturedPlayerName}
        </Text>
        <Text style={styles.distance}>
          Distance: {formatDistance(event.distance)}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  distance: {
    fontSize: 12,
    color: '#FFE5E5',
  },
});


















