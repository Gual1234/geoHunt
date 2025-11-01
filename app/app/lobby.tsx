import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';
import { Role, GameStatus, SelectRolePayload } from '@/types';
import { AreaPicker } from '@/components/AreaPicker';
import { haptics } from '../lib/haptics';

export default function LobbyScreen() {
  const router = useRouter();
  const { room, playerId, isHost, myRole } = useGameStore();
  const [isStarting, setIsStarting] = useState(false);
  const [isAreaPickerVisible, setIsAreaPickerVisible] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const durationOptions = [
    { label: 'No Limit', value: null },
    { label: '5 Minutes', value: 5 * 60 * 1000 },
    { label: '10 Minutes', value: 10 * 60 * 1000 },
    { label: '15 Minutes', value: 15 * 60 * 1000 },
    { label: '20 Minutes', value: 20 * 60 * 1000 },
    { label: '30 Minutes', value: 30 * 60 * 1000 },
  ];

  useEffect(() => {
    // Navigate to game screen when game starts
    if (room?.status === GameStatus.IN_PROGRESS) {
      setIsStarting(false); // Reset the spinner
      router.replace('/game');
    }
  }, [room?.status]);

  const handleSelectRole = (role: Role) => {
    console.log('🎭 Selecting role:', role);
    haptics.selection();
    const socket = getSocket();
    const payload: SelectRolePayload = { role };
    socket.emit('selectRole', payload);
  };

  const handleStartGame = () => {
    if (!isHost()) return;

    // Check if all players have roles
    const allHaveRoles = room?.players.every((p) => p.role !== null);
    if (!allHaveRoles) {
      haptics.warning();
      Alert.alert('Cannot Start', 'All players must select a role before starting');
      return;
    }

    if (!room?.area) {
      haptics.warning();
      Alert.alert('Cannot Start', 'Please set the game area first');
      return;
    }

    haptics.success();
    setIsStarting(true);
    const socket = getSocket();
    socket.emit('startGame');
  };

  const handleSetArea = () => {
    haptics.light();
    setIsAreaPickerVisible(true);
  };

  const handleSetDuration = (durationMs: number | null) => {
    if (!isHost()) return;
    haptics.selection();
    setSelectedDuration(durationMs);
    const socket = getSocket();
    socket.emit('setGameDuration', { durationMs });
  };

  if (!room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading lobby...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canStart =
    isHost() &&
    room.area &&
    room.players.every((p) => p.role !== null) &&
    !isStarting;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lobby</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Room Code:</Text>
          <Text style={styles.code}>{room.code}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Role Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Role</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                styles.policeButton,
                myRole() === Role.POLICE && styles.roleButtonSelected,
              ]}
              onPress={() => handleSelectRole(Role.POLICE)}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  myRole() === Role.POLICE && styles.roleButtonTextSelected,
                ]}
              >
                👮 Police
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                styles.thiefButton,
                myRole() === Role.THIEF && styles.roleButtonSelected,
              ]}
              onPress={() => handleSelectRole(Role.THIEF)}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  myRole() === Role.THIEF && styles.roleButtonTextSelected,
                ]}
              >
                🥷 Thief
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Players List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Players ({room.players.length})
          </Text>
          <FlatList
            data={room.players}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.playerItem}>
                <Text style={styles.playerName}>
                  {item.name}
                  {item.isHost && ' 👑'}
                  {item.id === playerId && ' (You)'}
                </Text>
                <View style={styles.playerRole}>
                  {item.role === Role.POLICE && (
                    <Text style={styles.rolePolice}>👮 Police</Text>
                  )}
                  {item.role === Role.THIEF && (
                    <Text style={styles.roleThief}>🥷 Thief</Text>
                  )}
                  {!item.role && (
                    <Text style={styles.roleNone}>Selecting...</Text>
                  )}
                </View>
              </View>
            )}
            style={styles.playersList}
          />
        </View>

        {/* Game Area Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Area</Text>
          {room.area ? (
            <View>
              <Text style={styles.areaText}>
                ✅ Area set ({(room.area.radiusMeters / 1000).toFixed(1)}km radius)
              </Text>
              {isHost() && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleSetArea}
                >
                  <Text style={styles.buttonTextSecondary}>Change Area</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.areaText}>❌ Area not set</Text>
              {isHost() && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleSetArea}
                >
                  <Text style={styles.buttonTextSecondary}>Set Area</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Game Duration (Host Only) */}
        {isHost() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Game Duration</Text>
            <View style={styles.durationOptions}>
              {durationOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.durationButton,
                    (selectedDuration === option.value || (room.gameDurationMs === option.value)) && styles.durationButtonSelected,
                  ]}
                  onPress={() => handleSetDuration(option.value)}
                >
                  <Text style={[
                    styles.durationButtonText,
                    (selectedDuration === option.value || (room.gameDurationMs === option.value)) && styles.durationButtonTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Start Button (Host Only) */}
      {isHost() && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              !canStart && styles.buttonDisabled,
            ]}
            onPress={handleStartGame}
            disabled={!canStart}
          >
            {isStarting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start Game</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!isHost() && (
        <View style={styles.footer}>
          <Text style={styles.waitingText}>Waiting for host to start...</Text>
        </View>
      )}

      {/* Area Picker Modal */}
      <AreaPicker
        visible={isAreaPickerVisible}
        onClose={() => setIsAreaPickerVisible(false)}
        currentArea={room.area}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginRight: 8,
  },
  code: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498DB',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  policeButton: {
    borderColor: '#3498DB',
    backgroundColor: '#F0F8FF',
  },
  thiefButton: {
    borderColor: '#E74C3C',
    backgroundColor: '#FFF5F5',
  },
  roleButtonSelected: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  roleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  playersList: {
    maxHeight: 200,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  playerRole: {
    flexDirection: 'row',
  },
  rolePolice: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: '600',
  },
  roleThief: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
  },
  roleNone: {
    color: '#95A5A6',
    fontSize: 14,
    fontStyle: 'italic',
  },
  areaText: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#27AE60',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  buttonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  durationButtonSelected: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  durationButtonTextSelected: {
    color: '#fff',
  },
});

