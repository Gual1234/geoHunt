import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { Role } from '@/types';
import { calculateDistance, formatDistance, getDistanceColor } from '@/lib/utils';

export const ThiefRadar = () => {
  const { room, playerId, myLocation, myRole } = useGameStore();

  // Find nearest police (always call hooks first!)
  const nearestPolice = useMemo(() => {
    if (!myLocation || !room) return null;
    
    const police = room.players.filter(
      (p) => p.role === Role.POLICE && p.location && !p.isCaptured
    );

    if (police.length === 0) return null;

    let nearest = police[0];
    let minDistance = calculateDistance(
      myLocation.latitude,
      myLocation.longitude,
      nearest.location!.latitude,
      nearest.location!.longitude
    );

    for (let i = 1; i < police.length; i++) {
      const p = police[i];
      if (!p.location) continue;

      const distance = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        p.location.latitude,
        p.location.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = p;
      }
    }

    return { player: nearest, distance: minDistance };
  }, [room, myLocation]);

  // All hooks called - now we can do early returns
  // Only show for thieves
  if (myRole() !== Role.THIEF) return null;
  if (!myLocation || !room) return null;

  if (!nearestPolice) {
    return (
      <View style={[styles.container, { backgroundColor: '#E8F4F8' }]}>
        <Text style={styles.emoji}>👮</Text>
        <Text style={styles.label}>No Police Nearby</Text>
      </View>
    );
  }

  const { distance } = nearestPolice;
  const color = getDistanceColor(distance);

  // Determine threat level
  let threatLevel = 'Safe';
  let emoji = '😌';
  if (distance < 60) {
    threatLevel = 'DANGER!';
    emoji = '🚨';
  } else if (distance < 100) {
    threatLevel = 'Close!';
    emoji = '😰';
  } else if (distance < 200) {
    threatLevel = 'Caution';
    emoji = '⚠️';
  }

  return (
    <View style={[styles.container, { backgroundColor: color + '20' }]}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.info}>
          <Text style={[styles.threat, { color }]}>{threatLevel}</Text>
          <Text style={styles.distance}>Nearest Police: {formatDistance(distance)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  indicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  threat: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  distance: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  label: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
});




