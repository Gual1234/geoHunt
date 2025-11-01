import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Location as LocationType } from '@/types';

interface UseLocationOptions {
  onLocationUpdate?: (location: LocationType) => void;
  interval?: number; // milliseconds
}

export const useLocation = (options?: UseLocationOptions) => {
  const [location, setLocation] = useState<LocationType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setHasPermission(status === 'granted');

        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        // Start watching location
        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: options?.interval || 1000,
            distanceInterval: 5,
          },
          (loc) => {
            const newLocation: LocationType = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              timestamp: Date.now(),
            };

            setLocation(newLocation);
            options?.onLocationUpdate?.(newLocation);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    requestPermission();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [options?.interval]);

  return { location, error, hasPermission };
};
















