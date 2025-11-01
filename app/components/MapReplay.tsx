import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { PlayerMovement, Role, Area } from '@/types';

interface MapReplayProps {
  movements: PlayerMovement[];
  area: Area | null;
}

export const MapReplay: React.FC<MapReplayProps> = ({ movements, area }) => {
  const [progress, setProgress] = useState(100); // 0-100, start at end

  // Calculate total game duration from movements
  const gameDuration = useMemo(() => {
    if (movements.length === 0) return 0;
    
    let maxTime = 0;
    movements.forEach(m => {
      if (m.path.length > 0) {
        const lastTimestamp = m.path[m.path.length - 1].timestamp;
        if (lastTimestamp > maxTime) maxTime = lastTimestamp;
      }
    });
    
    let minTime = Infinity;
    movements.forEach(m => {
      if (m.path.length > 0) {
        const firstTimestamp = m.path[0].timestamp;
        if (firstTimestamp < minTime) minTime = firstTimestamp;
      }
    });
    
    return maxTime - minTime;
  }, [movements]);

  // Get start time
  const startTime = useMemo(() => {
    if (movements.length === 0) return 0;
    let minTime = Infinity;
    movements.forEach(m => {
      if (m.path.length > 0 && m.path[0].timestamp < minTime) {
        minTime = m.path[0].timestamp;
      }
    });
    return minTime;
  }, [movements]);

  // Calculate current timestamp based on slider progress
  const currentTimestamp = startTime + (gameDuration * progress / 100);

  // Get paths up to current timestamp
  const visiblePaths = useMemo(() => {
    return movements.map(m => ({
      ...m,
      path: m.path.filter(p => p.timestamp <= currentTimestamp),
    }));
  }, [movements, currentTimestamp]);

  // Get initial region from area or first movement
  const initialRegion = useMemo(() => {
    console.log('🗺️ MapReplay - Calculating initial region');
    console.log('🗺️ Area:', area);
    console.log('🗺️ Movements count:', movements.length);
    
    if (area) {
      console.log('🗺️ Using area for initial region:', area.center);
      return {
        latitude: area.center.latitude,
        longitude: area.center.longitude,
        latitudeDelta: (area.radiusMeters / 111320) * 2.5,
        longitudeDelta: (area.radiusMeters / 111320) * 2.5,
      };
    }
    
    // Try to find first valid location from any movement
    for (const movement of movements) {
      if (movement.path.length > 0) {
        const firstPoint = movement.path[0];
        console.log('🗺️ Using first movement point for initial region:', firstPoint);
        return {
          latitude: firstPoint.latitude,
          longitude: firstPoint.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
      }
    }
    
    console.warn('⚠️ No area or movements found, using default region');
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [movements, area]);

  // Dark map style
  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
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
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
  ];

  // Format time for display
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  console.log('🎬 MapReplay rendering with:', {
    movementsCount: movements.length,
    gameDuration,
    hasArea: !!area,
  });

  if (movements.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No movement data available</Text>
        <Text style={styles.emptySubtext}>Players must move during the game to see replay</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        //customMapStyle={darkMapStyle}
      >
        {/* Game Area */}
        {area && (
          <Circle
            center={{
              latitude: area.center.latitude,
              longitude: area.center.longitude,
            }}
            radius={area.radiusMeters}
            strokeColor="rgba(52, 152, 219, 0.5)"
            fillColor="rgba(52, 152, 219, 0.1)"
            strokeWidth={2}
          />
        )}

        {/* Player paths */}
        {visiblePaths.map((movement) => {
          if (movement.path.length < 2) return null;
          
          const color = movement.role === Role.POLICE ? '#3498DB' : '#E74C3C';
          
          return (
            <Polyline
              key={movement.playerId}
              coordinates={movement.path.map(p => ({
                latitude: p.latitude,
                longitude: p.longitude,
              }))}
              strokeColor={color}
              strokeWidth={2}
            />
          );
        })}

        {/* Player markers at current position */}
        {visiblePaths.map((movement) => {
          if (movement.path.length === 0) return null;
          
          const currentPos = movement.path[movement.path.length - 1];
          const emoji = movement.role === Role.POLICE ? '👮' : '🥷';
          
          return (
            <Marker
              key={`marker-${movement.playerId}`}
              coordinate={{
                latitude: currentPos.latitude,
                longitude: currentPos.longitude,
              }}
            >
              <View style={styles.markerContainer}>
                <Text style={styles.markerEmoji}>{emoji}</Text>
                <View style={styles.markerBadge}>
                  <Text style={styles.markerBadgeText}>{movement.playerName}</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Replay Controls */}
      <View style={styles.controls}>
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>
            {formatTime((gameDuration * progress / 100))} / {formatTime(gameDuration)}
          </Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={progress}
          onValueChange={setProgress}
          minimumTrackTintColor="#3498DB"
          maximumTrackTintColor="#BDC3C7"
          thumbTintColor="#3498DB"
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3498DB' }]} />
            <Text style={styles.legendText}>Police</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#E74C3C' }]} />
            <Text style={styles.legendText}>Thieves</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 16,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  legendText: {
    color: '#fff',
    fontSize: 14,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerEmoji: {
    fontSize: 24,
    textAlign: 'center',
  },
  markerBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: -3,
    borderWidth: 1,
    borderColor: '#fff',
    maxWidth: 80,
  },
  markerBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});


