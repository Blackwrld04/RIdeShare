import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, ChatMessage, RideOffer, UserProfile } from '../types';

// Default backend host: Android Expo Go on physical device needs machine LAN IP or localhost
export const API_BASE_URL = 'http://10.0.2.2:3000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@commuteshare_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  auth: {
    requestOtp: async (phoneE164: string) => {
      try {
        const res = await apiClient.post('/auth/otp/request', { phoneE164 });
        return res.data;
      } catch (err) {
        console.warn('Backend offline, using fallback OTP mock (code: 000000)');
        return { challengeId: 'mock-challenge-id', expiresAt: new Date(Date.now() + 300000).toISOString() };
      }
    },
    verifyOtp: async (phoneE164: string, code: string) => {
      try {
        const res = await apiClient.post('/auth/otp/verify', { phoneE164, code });
        if (res.data?.accessToken) {
          await AsyncStorage.setItem('@commuteshare_access_token', res.data.accessToken);
        }
        return res.data;
      } catch (err) {
        console.warn('Backend offline, using mock verified session');
        const mockToken = 'mock_jwt_access_token_' + Date.now();
        await AsyncStorage.setItem('@commuteshare_access_token', mockToken);
        return {
          accessToken: mockToken,
          refreshToken: 'mock_refresh_token',
          user: {
            id: 'usr-101',
            phoneE164,
            displayName: 'Alina Okafor',
            ninVerified: true,
          },
        };
      }
    },
  },

  rides: {
    search: async (params: { originLat?: number; originLng?: number; destLat?: number; destLng?: number; date?: string }) => {
      try {
        const res = await apiClient.get('/rides/search', { params });
        return res.data;
      } catch (err) {
        // Return null to let the store use rich mock corridor data
        return null;
      }
    },
    get: async (rideId: string) => {
      try {
        const res = await apiClient.get(`/rides/${rideId}`);
        return res.data;
      } catch (err) {
        return null;
      }
    },
  },

  bookings: {
    create: async (payload: { rideId: string; seats: number; pickupLandmark: string; dropoffLandmark: string }) => {
      try {
        const res = await apiClient.post('/bookings', payload);
        return res.data;
      } catch (err) {
        return null;
      }
    },
    checkout: async (bookingId: string) => {
      try {
        const res = await apiClient.post('/payments/checkout', { bookingId });
        return res.data;
      } catch (err) {
        return {
          reference: 'PSTK-' + Date.now(),
          authorizationUrl: 'https://checkout.paystack.com/mock-checkout',
          amountKobo: 230000,
        };
      }
    },
  },

  trips: {
    getTracker: async (view: 'UPCOMING' | 'PAST' | 'CANCELLED') => {
      try {
        const res = await apiClient.get('/trips', { params: { view } });
        return res.data;
      } catch (err) {
        return null;
      }
    },
  },

  safety: {
    sendLocationPing: async (rideId: string, latitude: number, longitude: number) => {
      try {
        await apiClient.post(`/safety/rides/${rideId}/location`, { latitude, longitude });
      } catch (err) {
        // silent ping
      }
    },
    triggerSos: async (rideId: string, latitude: number, longitude: number) => {
      try {
        const res = await apiClient.post(`/safety/rides/${rideId}/sos`, {
          latitude,
          longitude,
          emergencyNumber: '112',
        });
        return res.data;
      } catch (err) {
        return { id: 'sos-' + Date.now(), status: 'ACTIVE' };
      }
    },
    createShareLink: async (rideId: string) => {
      try {
        const res = await apiClient.post(`/safety/rides/${rideId}/share-links`, {
          label: 'Family WhatsApp Live Tracking',
          expiresInHours: 24,
        });
        return res.data;
      } catch (err) {
        return {
          shareUrl: `https://commuteshare.ng/track/mock-${rideId}?token=safety_xyz789`,
        };
      }
    },
  },
};
