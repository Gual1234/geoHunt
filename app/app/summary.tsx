import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { Role } from '@/types';
import { disconnectSocket, reconnectSocket } from '@/lib/socket';
import { MapReplay } from '@/components/MapReplay';

export default function SummaryScreen() {
  const router = useRouter();
  const { room, gameEndData, reset } = useGameStore();

  // Debug logging
  console.log('🎬 Summary Screen - gameEndData:', gameEndData);
  console.log('🎬 Has movements:', gameEndData?.movements?.length || 0);
  console.log('🎬 Room area:', room?.area);
  console.log('🎬 Game end reason:', gameEndData?.reason);
  
  if (gameEndData?.movements) {
    gameEndData.movements.forEach((m, idx) => {
      console.log(`🎬 Movement ${idx}: ${m.playerName} - ${m.path.length} locations`);
    });
  } else {
    console.log('🎬 No movements data received from server');
  }

  const handleBackToHome = () => {
    // Reset state and prepare for reconnection
    reset();
    reconnectSocket(); // This will allow fresh connection when needed
    router.replace('/');
  };

  if (!room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <Text style={styles.title}>Game Over</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleBackToHome}
          >
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const police = room.players.filter((p) => p.role === Role.POLICE);
  const thieves = room.players.filter((p) => p.role === Role.THIEF);
  const captured = thieves.filter((p) => p.isCaptured);

  const policeWon = thieves.length > 0 && captured.length === thieves.length;

  const hasMovements = gameEndData?.movements && gameEndData.movements.length > 0;

  return (
    <View style={styles.container}>
      {/* Map Replay Section */}
      {hasMovements && gameEndData?.movements && (
        <View style={styles.mapSection}>
          <MapReplay 
            movements={gameEndData.movements} 
            area={room.area}
          />
        </View>
      )}

      {/* Stats Section */}
      <SafeAreaView style={[styles.statsSection, !hasMovements && styles.statsFullScreen]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Game Over!</Text>

          <View style={styles.resultContainer}>
            <Text style={styles.resultEmoji}>
              {policeWon ? '👮' : '🥷'}
            </Text>
            <Text style={styles.resultText}>
              {policeWon ? 'Police Win!' : 'Game Ended'}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{police.length}</Text>
              <Text style={styles.statLabel}>Police</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{thieves.length}</Text>
              <Text style={styles.statLabel}>Thieves</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{captured.length}</Text>
              <Text style={styles.statLabel}>Captured</Text>
            </View>
          </View>

          {gameEndData?.gameDuration && (
            <View style={styles.durationContainer}>
              <Text style={styles.durationLabel}>Game Duration</Text>
              <Text style={styles.durationValue}>
                {Math.floor(gameEndData.gameDuration / 60000)}:{(Math.floor((gameEndData.gameDuration % 60000) / 1000)).toString().padStart(2, '0')}
              </Text>
            </View>
          )}

          <View style={styles.playersSection}>
            <Text style={styles.sectionTitle}>Final Standings</Text>

            <View style={styles.teamSection}>
              <Text style={styles.teamTitle}>👮 Police</Text>
              {police.map((player) => (
                <Text key={player.id} style={styles.playerName}>
                  {player.name} {player.isHost && '👑'}
                </Text>
              ))}
            </View>

            <View style={styles.teamSection}>
              <Text style={styles.teamTitle}>🥷 Thieves</Text>
              {thieves.map((player) => (
                <Text
                  key={player.id}
                  style={[
                    styles.playerName,
                    player.isCaptured && styles.capturedPlayer,
                  ]}
                >
                  {player.name} {player.isHost && '👑'}
                  {player.isCaptured && ' (Caught)'}
                </Text>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleBackToHome}
          >
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapSection: {
    flex: 1,
    minHeight: '60%',
    maxHeight: '60%',
  },
  statsSection: {
    flex: 1,
    minHeight: '40%',
    maxHeight: '40%',
    backgroundColor: '#fff',
  },
  statsFullScreen: {
    minHeight: '100%',
    maxHeight: '100%',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    minWidth: 100,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498DB',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  durationContainer: {
    alignItems: 'center',
    marginVertical: 16,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  durationLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  playersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  teamSection: {
    marginBottom: 20,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    color: '#7F8C8D',
    paddingVertical: 4,
    paddingLeft: 16,
  },
  capturedPlayer: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3498DB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});







