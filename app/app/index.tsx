import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getSocket } from '@/lib/socket';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/gameStore';
import {
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
} from '@/types';
import { haptics } from '../lib/haptics';

export default function StartScreen() {
  const router = useRouter();
  useSocket(); // Initialize socket connection
  const { setPlayerId, setPlayerName, setRoom, isConnected, connectionError } =
    useGameStore();

  const [playerName, setPlayerNameInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      haptics.error();
      setError('Please enter your name');
      return;
    }

    haptics.light();
    setIsLoading(true);
    setError('');

    const socket = getSocket();
    const payload: CreateRoomPayload = { playerName: playerName.trim() };

    socket.emit('createRoom', payload, (response: CreateRoomResponse) => {
      setIsLoading(false);

      if (response.success && response.roomCode && response.playerId) {
        haptics.success();
        setPlayerId(response.playerId);
        setPlayerName(playerName.trim());
        console.log('✅ Room created:', response.roomCode);
        
        // Small delay to allow roomState event to be received
        setTimeout(() => {
          router.push('/lobby');
        }, 200);
      } else {
        haptics.error();
        setError(response.error || 'Failed to create room. Please try again.');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      haptics.error();
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim() || roomCode.trim().length !== 6) {
      haptics.error();
      setError('Please enter a valid 6-character room code');
      return;
    }

    haptics.light();
    setIsLoading(true);
    setError('');

    const socket = getSocket();
    const payload: JoinRoomPayload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
    };

    socket.emit('joinRoom', payload, (response: JoinRoomResponse) => {
      setIsLoading(false);

      if (response.success && response.playerId && response.room) {
        haptics.success();
        setPlayerId(response.playerId);
        setPlayerName(playerName.trim());
        setRoom(response.room);
        console.log('✅ Joined room:', response.room.code);
        
        // Small delay to allow roomState event to be received
        setTimeout(() => {
          router.push('/lobby');
        }, 200);
      } else {
        haptics.error();
        const errorMsg = response.error || 'Failed to join room';
        setError(
          errorMsg === 'Room not found'
            ? 'Room not found. Check the code and try again.'
            : errorMsg === 'Game already in progress'
            ? 'This game has already started.'
            : errorMsg
        );
      }
    });
  };

  const renderMenu = () => (
    <View style={styles.content}>
      <Text style={styles.title}>GeoHunt</Text>
      <Text style={styles.subtitle}>Police vs Thieves</Text>

      {!isConnected && (
        <View style={styles.connectionStatus}>
          <ActivityIndicator size="small" color="#FF6B6B" />
          <Text style={styles.connectionText}>Connecting to server...</Text>
        </View>
      )}

      {connectionError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{connectionError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={() => setMode('create')}
        disabled={!isConnected}
      >
        <Text style={styles.buttonText}>Create Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => setMode('join')}
        disabled={!isConnected}
      >
        <Text style={styles.buttonTextSecondary}>Join Game</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreateRoom = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Create Game</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={playerName}
        onChangeText={setPlayerNameInput}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={20}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleCreateRoom}
        disabled={isLoading || !isConnected}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Room</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => {
          setMode('menu');
          setError('');
        }}
        disabled={isLoading}
      >
        <Text style={styles.buttonTextSecondary}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderJoinRoom = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Join Game</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={playerName}
        onChangeText={setPlayerNameInput}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={20}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit room code"
        value={roomCode}
        onChangeText={(text) => setRoomCode(text.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleJoinRoom}
        disabled={isLoading || !isConnected}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Join Room</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => {
          setMode('menu');
          setError('');
        }}
        disabled={isLoading}
      >
        <Text style={styles.buttonTextSecondary}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {mode === 'menu' && renderMenu()}
        {mode === 'create' && renderCreateRoom()}
        {mode === 'join' && renderJoinRoom()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#7F8C8D',
    marginBottom: 60,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  connectionText: {
    color: '#7F8C8D',
    fontSize: 14,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#3498DB',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#3498DB',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    textAlign: 'center',
  },
});

