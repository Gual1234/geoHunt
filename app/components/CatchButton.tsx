import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import { Role, CatchAttemptPayload, CatchAttemptResponse } from '@/types';
import { calculateDistance, formatDistance } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

export const CatchButton = () => {
  const { room, playerId, myLocation, myRole } = useGameStore();
  const [isCatching, setIsCatching] = useState(false);

  // Calculate nearby thieves (within 50m)
  const nearbyThieves = useMemo(() => {
    if (!myLocation || !room) return [];
    
    const thieves = room.players.filter(
      (p) =>
        p.role === Role.THIEF &&
        p.location &&
        !p.isCaptured &&
        p.id !== playerId
    );

    return thieves
      .map((thief) => {
        const distance = calculateDistance(
          myLocation.latitude,
          myLocation.longitude,
          thief.location!.latitude,
          thief.location!.longitude
        );
        return { thief, distance };
      })
      .filter((t) => t.distance <= 30)
      .sort((a, b) => a.distance - b.distance);
  }, [room, myLocation, playerId]);

  // All hooks called - now we can do early returns
  // Only show for police
  if (myRole() !== Role.POLICE) return null;
  if (!myLocation || !room) return null;

  const myPlayer = room.players.find((p) => p.id === playerId);
  if (myPlayer?.isOutOfBounds) return null;
  
  if (nearbyThieves.length === 0) return null;

  const handleCatch = (targetId: string, targetName: string, distance: number) => {
    haptics.light();
    Alert.alert(
      'Catch Thief',
      `Attempt to catch ${targetName} (${formatDistance(distance)} away)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Catch',
          style: 'destructive',
          onPress: () => {
            haptics.medium();
            setIsCatching(true);
            const socket = getSocket();
            const payload: CatchAttemptPayload = { targetPlayerId: targetId };

            socket.emit(
              'catchAttempt',
              payload,
              (response: CatchAttemptResponse) => {
                setIsCatching(false);

                if (response.success && response.captured) {
                  haptics.success();
                  Alert.alert(
                    '🎉 Success!',
                    `You caught ${targetName}! Distance: ${formatDistance(
                      response.distance || 0
                    )}`
                  );
                } else if (response.error) {
                  haptics.error();
                  Alert.alert('Failed', response.error);
                } else if (response.distance) {
                  haptics.warning();
                  Alert.alert(
                    'Too Far',
                    `${targetName} is ${formatDistance(
                      response.distance
                    )} away. You need to be within 50m.`
                  );
                }
              }
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Thieves in Range</Text>
      {nearbyThieves.map(({ thief, distance }) => (
        <TouchableOpacity
          key={thief.id}
          style={styles.thiefButton}
          onPress={() => handleCatch(thief.id, thief.name, distance)}
          disabled={isCatching}
        >
          <View style={styles.thiefInfo}>
            <Text style={styles.thiefName}>🥷 {thief.name}</Text>
            <Text style={styles.thiefDistance}>{formatDistance(distance)}</Text>
          </View>
          <Text style={styles.catchText}>CATCH</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 8,
    textAlign: 'center',
  },
  thiefButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E74C3C',
    marginBottom: 8,
  },
  thiefInfo: {
    flex: 1,
  },
  thiefName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  thiefDistance: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  catchText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
    paddingHorizontal: 16,
  },
});

