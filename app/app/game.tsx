import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';
import {
  Role,
  GameStatus,
  LocationUpdatePayload,
  Location as LocationType,
} from '@/types';
import { RevealTimer } from '@/components/RevealTimer';
import { ThiefRadar } from '@/components/ThiefRadar';
import { CatchButton } from '@/components/CatchButton';
import { ChatPanel } from '@/components/ChatPanel';
import { PlayerCaughtToast } from '@/components/PlayerCaughtToast';
import { GameTimer } from '@/components/GameTimer';
import { haptics } from '../lib/haptics';

// Dark mode map style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.business",
    elementType: "geometry",
    stylers: [{ color: "#bec5d1" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "geometry",
    stylers: [{ color: "#bec5d1" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

export default function GameScreen() {
  const router = useRouter();
  const { 
    room, 
    playerId, 
    myRole, 
    setMyLocation, 
    myLocation, 
    revealState, 
    chatMessages,
    bonusRevealedPlayers,
    bonusRevealedUntil,
    clearExpiredBonusReveals,
  } = useGameStore();
  const [hasPermission, setHasPermission] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageIndex, setLastReadMessageIndex] = useState(0);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastUpdateTime = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Navigate to summary when game ends
    if (room?.status === GameStatus.ENDED) {
      router.replace('/summary');
    }
  }, [room?.status]);

  // Track unread messages
  useEffect(() => {
    if (isChatOpen) {
      // Reset unread when chat is open
      setUnreadCount(0);
      setLastReadMessageIndex(chatMessages.length);
    } else {
      // Count new messages when chat is closed
      const newMessages = chatMessages.length - lastReadMessageIndex;
      if (newMessages > 0) {
        setUnreadCount(newMessages);
        haptics.light(); // Subtle notification for new message
      }
    }
  }, [chatMessages, isChatOpen]);

  // Watch for reveal state changes
  useEffect(() => {
    if (revealState?.isRevealing) {
      haptics.warning(); // Notify about reveal
    }
  }, [revealState?.isRevealing]);

  // Clear expired bonus reveals every second
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredBonusReveals();
    }, 1000);
    return () => clearInterval(interval);
  }, [clearExpiredBonusReveals]);

  // Pulsing animation for bonus areas
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  useEffect(() => {
    // Request location permissions and start tracking
    (async () => {
      console.log('🔐 Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🔐 Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to play the game.'
        );
        return;
      }

      console.log('✅ Location permission granted, starting tracking...');
      setHasPermission(true);

      // Start watching location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // 1 second
          distanceInterval: 5, // 5 meters
        },
        (location) => {
          const now = Date.now();
          // Rate limit to 1 Hz
          if (now - lastUpdateTime.current >= 1000) {
            const newLocation: LocationType = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: now,
            };

            console.log('📍 Location update:', newLocation);
            setMyLocation(newLocation);

            // Send to server
            const socket = getSocket();
            const payload: LocationUpdatePayload = { location: newLocation };
            console.log('📤 Sending location to server:', payload);
            socket.emit('locationUpdate', payload);

            lastUpdateTime.current = now;
          }
        }
      );
    })();

    return () => {
      // Cleanup location subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const handleEndGame = () => {
    haptics.light();
    Alert.alert('End Game', 'Are you sure you want to end the game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Game',
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          const socket = getSocket();
          socket.emit('endGame');
        },
      },
    ]);
  };

  const handleToggleChat = () => {
    haptics.light();
    setIsChatOpen(!isChatOpen);
  };

  if (!room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isHost = room.hostId === playerId;
  const myPlayer = room.players.find((p) => p.id === playerId);
  const isPolice = myRole() === Role.POLICE;
  const isRevealing = revealState?.isRevealing || false;

  // Get initial region from room area or my location
  const initialRegion = room.area
    ? {
        latitude: room.area.center.latitude,
        longitude: room.area.center.longitude,
        latitudeDelta: (room.area.radiusMeters / 111320) * 3,
        longitudeDelta: (room.area.radiusMeters / 111320) * 3,
      }
    : myLocation
    ? {
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  // Determine which players to show on map
  const getVisiblePlayers = () => {
    const basePlayers = [];
    
    if (isPolice) {
      // Police always see all police + themselves
      basePlayers.push(...room.players.filter((p) => p.location && (p.role === Role.POLICE || p.id === playerId)));
      
      // Add bonus-revealed thieves (real-time positions)
      basePlayers.push(...room.players.filter((p) => 
        p.location && p.role === Role.THIEF && bonusRevealedPlayers.has(p.id)
      ));
      
      // Add static revealed thieves (from revealState) - PRIORITIZE these over live positions
      if (isRevealing && revealState?.revealedThieves) {
        // Use the static snapshot positions from revealState
        const revealedThievesWithLocations = revealState.revealedThieves.filter(t => t.location);
        basePlayers.push(...revealedThievesWithLocations);
      }
    } else {
      // Thieves always see all thieves + themselves
      basePlayers.push(...room.players.filter((p) => p.location && (p.role === Role.THIEF || p.id === playerId)));
      
      // If I'm currently revealed by bonus, show all police
      if (playerId && bonusRevealedPlayers.has(playerId)) {
        basePlayers.push(...room.players.filter((p) => p.location && p.role === Role.POLICE));
      }
    }
    
    // Remove duplicates by id, but prioritize static revealed positions over live positions
    const playerMap = new Map();
    
    // First pass: add all players
    basePlayers.forEach(player => {
      playerMap.set(player.id, player);
    });
    
    // Second pass: if we have both static and live positions for a revealed thief, prioritize static
    if (isPolice && isRevealing && revealState?.revealedThieves) {
      revealState.revealedThieves.forEach(staticThief => {
        if (staticThief.location) {
          playerMap.set(staticThief.id, staticThief);
        }
      });
    }
    
    return Array.from(playerMap.values());
  };

  const visiblePlayers = getVisiblePlayers();


  return (
    <View style={styles.container}>
      {/* Player Caught Toast Notification */}
      <PlayerCaughtToast />

      {/* Full Screen Map */}
      <View style={styles.mapContainer}>
        {hasPermission ? (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={initialRegion}
            showsMyLocationButton={true}
            followsUserLocation={true}
            //customMapStyle={darkMapStyle}
          >
            {/* Game Area Circle */}
            {room.area && (
              <Circle
                center={{
                  latitude: room.area.center.latitude,
                  longitude: room.area.center.longitude,
                }}
                radius={room.area.radiusMeters}
                strokeColor="rgba(52, 152, 219, 0.5)"
                fillColor="rgba(52, 152, 219, 0.1)"
                strokeWidth={2}
              />
            )}

            {/* Bonus Area Circles (Thieves only) */}
            {!isPolice && room.bonusAreas && room.bonusAreas.map((bonusArea) => (
              <React.Fragment key={bonusArea.id}>
                {/* Pulsing Circle */}
                <Circle
                  center={{
                    latitude: bonusArea.center.latitude,
                    longitude: bonusArea.center.longitude,
                  }}
                  radius={bonusArea.radiusMeters}
                  strokeColor="rgba(155, 89, 182, 0.9)"
                  fillColor="rgba(155, 89, 182, 0.4)"
                  strokeWidth={3}
                />
                {/* Bonus Gift Marker */}
                <Marker
                  coordinate={{
                    latitude: bonusArea.center.latitude,
                    longitude: bonusArea.center.longitude,
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.bonusMarkerContainer}>
                    <Animated.Text style={[
                      styles.bonusEmoji,
                      { transform: [{ scale: pulseAnim }] }
                    ]}>🎁</Animated.Text>
                    <View style={styles.bonusGlow} />
                  </View>
                </Marker>
              </React.Fragment>
            ))}


            {/* Player Markers */}
            {visiblePlayers.map((player) => {
              if (!player.location) return null;

              const isMe = player.id === playerId;
              
              return (
                <Marker
                  key={player.id}
                  coordinate={{
                    latitude: player.location.latitude,
                    longitude: player.location.longitude,
                  }}
                  title={`${isMe ? '(You) ' : ''}${player.name}`}
                  description={player.role || 'No role'}
                  //opacity={player.isCaptured ? 0.5 : 1}
                >
                  <View style={styles.markerContainer}>
                    <Text style={styles.markerEmoji}>
                      {player.role === Role.POLICE ? '👮' : player.role === Role.THIEF ? '🥷' : '❓'}
                    </Text>
                    {isMe && (
                      <View style={styles.markerBadge}>
                        <Text style={styles.markerBadgeText}>YOU</Text>
                      </View>
                    )}
                  </View>
                </Marker>
              );
            })}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.placeholderText}>
              Location permission required
            </Text>
          </View>
        )}
      </View>

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {isPolice ? '👮 Police' : '🥷 Thief'}
          </Text>
          <Text style={styles.headerSubtitle}>Room: {room.code}</Text>
        </View>
        {room.startedAt && room.gameDurationMs ? (
          <View style={styles.headerCenter}>
            <GameTimer 
              startedAt={room.startedAt}
              durationMs={room.gameDurationMs}
            />
          </View>
        ) : (
          <View style={styles.headerCenter} />
        )}
        <View style={styles.headerRight}>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={handleToggleChat}
            >
              <Text style={styles.chatButtonText}>💬</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {isHost && (
              <TouchableOpacity style={styles.endButton} onPress={handleEndGame}>
                <Text style={styles.endButtonText}>End</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Floating Game Controls & Info */}
      <View style={styles.floatingFooter}>
        <ScrollView contentContainerStyle={styles.footerContent}>
        {/* Reveal Timer (for all players) */}
        <RevealTimer />

        {/* Thief Radar (for thieves only) */}
        <ThiefRadar />

        {/* Catch Button (for police only) */}
        <CatchButton />

        {/* Game Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Players</Text>
            <Text style={styles.statValue}>{room.players.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Police</Text>
            <Text style={styles.statValue}>
              {room.players.filter((p) => p.role === Role.POLICE).length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Thieves</Text>
            <Text style={styles.statValue}>
              {room.players.filter((p) => p.role === Role.THIEF).length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Captured</Text>
            <Text style={styles.statValue}>
              {room.players.filter((p) => p.isCaptured).length}
            </Text>
          </View>
        </View>

        {/* Out of bounds warning */}
        {myPlayer?.isOutOfBounds && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ You are out of bounds! Return to the game area.
            </Text>
          </View>
        )}

        {/* Captured warning */}
        {myPlayer?.isCaptured && (
          <View style={styles.capturedBanner}>
            <Text style={styles.capturedText}>
              🚨 You have been captured!
            </Text>
          </View>
        )}

        {/* Police reveal info */}
        {isPolice && isRevealing && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              👁️ All thieves are visible on the map!
            </Text>
          </View>
        )}
        </ScrollView>
      </View>

      {/* Chat Panel */}
      <ChatPanel isVisible={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  floatingHeader: {
    position: 'absolute',
    top: 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chatButtonText: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    justifyContent: 'center',
  },
  endButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  placeholderText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  markerBadge: {
    backgroundColor: '#3498DB',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: -3,
    borderWidth: 1,
    borderColor: '#fff',
  },
  markerBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    maxHeight: '35%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  footerContent: {
    padding: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    backgroundColor: 'rgb(255, 255, 255)',
    padding: 8,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgb(165, 23, 23)',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  capturedBanner: {
    backgroundColor: '#FFE5E5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  capturedText: {
    color: '#C0392B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBanner: {
    backgroundColor: '#E8F4F8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3498DB',
  },
  infoText: {
    color: '#2C3E50',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  bonusMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    position: 'relative',
  },
  bonusEmoji: {
    fontSize: 20,
    zIndex: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bonusGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(155, 89, 182, 0.3)',
    zIndex: 1,
    // Note: For true pulsing animation, you'd need to use Animated API
    // This creates a subtle glow effect
  },
});
