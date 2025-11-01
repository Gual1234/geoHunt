import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { getSocket } from '@/lib/socket';
import { UpdateAreaPayload, Area } from '@/types';
import { formatDistance } from '@/lib/utils';

interface AreaPickerProps {
  visible: boolean;
  onClose: () => void;
  currentArea: Area | null;
}

export const AreaPicker = ({ visible, onClose, currentArea }: AreaPickerProps) => {
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: 37.7749,
    longitude: -122.4194,
  });
  const [radius, setRadius] = useState(500); // Default 500m
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      initializeLocation();
    }
  }, [visible]);

  const initializeLocation = async () => {
    try {
      // If there's a current area, use it
      if (currentArea) {
        setCenter(currentArea.center);
        setRadius(currentArea.radiusMeters);
        setIsLoading(false);
        return;
      }

      // Otherwise, try to get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCenter({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetArea = () => {
    const socket = getSocket();
    const payload: UpdateAreaPayload = {
      area: {
        center,
        radiusMeters: radius,
      },
    };

    socket.emit('updateArea', payload);
    onClose();
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setCenter(coordinate);
  };

  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCenter({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Game Area</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            📍 Tap on the map to set the center
          </Text>
          <Text style={styles.instructionsText}>
            🎚️ Adjust the radius slider below
          </Text>
        </View>

        <View style={styles.mapContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading map...</Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: center.latitude,
                longitude: center.longitude,
                latitudeDelta: (radius / 111320) * 4,
                longitudeDelta: (radius / 111320) * 4,
              }}
              onPress={handleMapPress}
            >
              <Circle
                center={center}
                radius={radius}
                strokeColor="rgba(52, 152, 219, 0.8)"
                fillColor="rgba(52, 152, 219, 0.2)"
                strokeWidth={3}
              />
            </MapView>
          )}
        </View>

        <View style={styles.controls}>
          <View style={styles.radiusControl}>
            <Text style={styles.label}>Radius: {formatDistance(radius)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={5000}
              step={50}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor="#3498DB"
              maximumTrackTintColor="#BDC3C7"
            />
            <View style={styles.radiusLabels}>
              <Text style={styles.radiusLabelText}>100m</Text>
              <Text style={styles.radiusLabelText}>5km</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleUseCurrentLocation}
          >
            <Text style={styles.buttonTextSecondary}>
              📍 Use My Location
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSetArea}
          >
            <Text style={styles.buttonText}>Set Area</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#7F8C8D',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#E8F4F8',
    borderBottomWidth: 1,
    borderBottomColor: '#3498DB',
  },
  instructionsText: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 4,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  radiusControl: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  radiusLabelText: {
    fontSize: 12,
    color: '#7F8C8D',
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
    backgroundColor: '#27AE60',
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
    fontSize: 16,
    fontWeight: '600',
  },
});




