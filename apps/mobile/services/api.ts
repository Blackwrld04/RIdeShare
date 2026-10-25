import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Booking,
  ChatMessage,
  EmergencyContact,
  RideOffer,
  UserProfile,
  NotificationItem,
  SafeLandmarkItem,
  BankItem,
  BankAccountItem,
  LedgerJournalItem,
  DriverPayoutItem,
  DisputeItem,
  RideReviewItem,
  UserReportItem,
  DriverApplicationItem,
  TripShareItem,
} from '../types';
import { Platform } from 'react-native';

export const CUSTOM_API_URL_KEY = '@rideshare_custom_api_url';
export const DEFAULT_PRODUCTION_API_URL = 'https://rideshare-l37j.onrender.com/api/v1';

// Dynamically select backend endpoint:
// 1. Explicit EXPO_PUBLIC_API_URL (from Vercel / GitHub Actions / .env)
// 2. Localhost for Web/iOS, 10.0.2.2 for Android emulator in dev mode
// 3. Live Render production backend for real device APKs & web production
export const getDefaultApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim()) {
    let url = process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
    if (!url.endsWith('/api/v1')) {
      url = `${url}/api/v1`;
    }
    return url;
  }

  return DEFAULT_PRODUCTION_API_URL;
};

export const API_BASE_URL = getDefaultApiBaseUrl();

// Production URL is embedded directly into the application
export const getActiveApiUrl = async (): Promise<string> => {
  return API_BASE_URL;
};

export const setCustomApiUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(CUSTOM_API_URL_KEY, url.trim().replace(/\/+$/, ''));
};

export const getCustomApiUrl = async (): Promise<string | null> => {
  return API_BASE_URL;
};

export const resetCustomApiUrl = async (): Promise<void> => {
  await AsyncStorage.removeItem(CUSTOM_API_URL_KEY);
};

const ACCESS_TOKEN_KEY = '@rideshare_access_token';
const REFRESH_TOKEN_KEY = '@rideshare_refresh_token';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach active base URL and JWT access token to every outgoing request
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const activeBaseUrl = await getActiveApiUrl();
  config.baseURL = activeBaseUrl;

  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/otp') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        isRefreshing = false;
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        return Promise.reject(error);
      }

      try {
        const activeUrl = await getActiveApiUrl();
        const refreshRes = await axios.post(`${activeUrl}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = refreshRes.data;

        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Transformers to map backend DTOs to mobile state models
export function mapBackendRideToOffer(raw: any): RideOffer {
  const origin = raw.route?.find((p: any) => p.kind === 'ORIGIN') || raw.route?.[0];
  const dest = raw.route?.find((p: any) => p.kind === 'DESTINATION') || raw.route?.[raw.route?.length - 1];
  const waypoint = raw.route?.find((p: any) => p.kind === 'WAYPOINT');

  return {
    id: raw.id,
    driverId: raw.driver?.id || 'drv-unknown',
    driverName: raw.driver?.displayName || 'Verified Commuter',
    driverAvatar: raw.driver?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    driverRating: 4.95,
    driverTripCount: 42,
    ninVerified: true,
    vehicle: {
      make: raw.vehicle?.make || 'Toyota',
      model: raw.vehicle?.model || 'Corolla',
      year: raw.vehicle?.year || 2020,
      color: raw.vehicle?.color || 'Silver',
      registrationNumber: raw.vehicle?.registrationNumber || 'LAG-000-AA',
      seatCapacity: raw.passengerSeats || 4,
    },
    originTitle: origin?.label || 'Origin',
    originLandmark: origin?.address || origin?.label || 'Pickup Landmark',
    destTitle: dest?.label || 'Destination',
    destLandmark: dest?.address || dest?.label || 'Dropoff Landmark',
    departureTime: raw.departureAt,
    estimatedArrival: new Date(new Date(raw.departureAt).getTime() + (raw.routeDurationSeconds || 3600) * 1000).toISOString(),
    passengerSeats: raw.passengerSeats,
    availableSeats: raw.availableSeats ?? raw.passengerSeats,
    contributionKobo: Number(raw.segmentContributionKobo ?? raw.contributionKobo),
    currency: 'NGN',
    isRecurring: Boolean(raw.seriesId),
    isFemaleOnly: Boolean(raw.womenOnly),
    amenities: ['Direct Highway', 'Air Conditioned', 'No Smoking'],
    status: raw.status === 'PUBLISHED' ? 'SCHEDULED' : raw.status === 'IN_PROGRESS' ? 'IN_TRANSIT' : raw.status,
    routePoints: (raw.route || []).map((p: any) => ({
      sequence: p.sequence,
      kind: p.kind,
      label: p.label,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
    })),
  };
}

export function mapBackendBookingToModel(raw: any): Booking {
  const origin = raw.ride?.route?.find((p: any) => p.kind === 'ORIGIN') || raw.ride?.route?.[0];
  const dest = raw.ride?.route?.find((p: any) => p.kind === 'DESTINATION') || raw.ride?.route?.[raw.ride?.route?.length - 1];

  const fareAmountKobo = Number(raw.totalContributionKobo || raw.unitContributionKobo || 200000);
  const platformFeeKobo = Math.round(fareAmountKobo * 0.15);

  return {
    id: raw.id,
    rideId: raw.ride?.id || raw.rideOfferId,
    ride: mapBackendRideToOffer(raw.ride || { id: raw.rideOfferId }),
    seatsBooked: raw.seats || 1,
    status: raw.status === 'IN_PROGRESS' ? 'IN_TRANSIT' : raw.status,
    pickupLandmark: origin?.address || origin?.label || 'Designated Pickup Hub',
    dropoffLandmark: dest?.address || dest?.label || 'Designated Dropoff Hub',
    fareAmountKobo,
    platformFeeKobo,
    totalKobo: fareAmountKobo + platformFeeKobo,
    paystackReference: raw.payments?.[0]?.providerReference,
    createdAt: raw.createdAt,
  };
}
export const api = {
  health: {
    check: async (): Promise<{ status: string; service: string; timestamp: string }> => {
      const res = await apiClient.get('/health');
      return res.data;
    },
    ready: async (): Promise<{ status: string; checks: { database: string; redis: string } }> => {
      const res = await apiClient.get('/ready');
      return res.data;
    },
  },

  auth: {
    login: async (email: string, password: string) => {
      const res = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const { accessToken, refreshToken, isNewUser, profileComplete } = res.data;
      if (accessToken) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      return res.data;
    },
    registerRequestOtp: async (
      email: string,
      displayName?: string,
    ): Promise<{ challengeId: string; expiresAt: string; retryAfterSeconds: number }> => {
      const res = await apiClient.post('/auth/register/otp', {
        email: email.trim().toLowerCase(),
        displayName,
      });
      return res.data;
    },
    registerComplete: async (
      challengeId: string,
      code: string,
      password: string,
      displayName?: string,
      phone?: string,
    ) => {
      const res = await apiClient.post('/auth/register/complete', {
        challengeId,
        code,
        password,
        displayName,
        phone,
      });
      const { accessToken, refreshToken, isNewUser, profileComplete } = res.data;
      if (accessToken) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      return res.data;
    },
    setPassword: async (newPassword: string, currentPassword?: string) => {
      const res = await apiClient.post('/auth/password', {
        newPassword,
        currentPassword,
      });
      return res.data;
    },
    getSavedEmail: async (): Promise<string | null> => {
      try {
        return await AsyncStorage.getItem('@rideshare_saved_email');
      } catch {
        return null;
      }
    },
    setSavedEmail: async (email: string | null) => {
      try {
        if (email) {
          await AsyncStorage.setItem('@rideshare_saved_email', email);
        } else {
          await AsyncStorage.removeItem('@rideshare_saved_email');
        }
      } catch {}
    },
    requestOtp: async (
      phoneOrEmail: string | { phone?: string; email?: string },
    ): Promise<{ challengeId: string; expiresAt: string; retryAfterSeconds: number }> => {
      let payload: { phone?: string; email?: string } = {};
      if (typeof phoneOrEmail === 'string') {
        if (phoneOrEmail.includes('@')) {
          payload = { email: phoneOrEmail.trim().toLowerCase() };
        } else {
          payload = { phone: phoneOrEmail.trim() };
        }
      } else {
        payload = phoneOrEmail;
      }
      const res = await apiClient.post('/auth/otp/request', payload);
      return res.data;
    },
    verifyOtp: async (challengeId: string, code: string) => {
      const res = await apiClient.post('/auth/otp/verify', { challengeId, code });
      const { accessToken, refreshToken, isNewUser, profileComplete } = res.data;
      if (accessToken) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      return res.data;
    },
    socialChallenge: async (provider: 'google' | 'apple'): Promise<{ challengeId: string; nonce: string; expiresAt: string }> => {
      const res = await apiClient.post('/auth/social/challenge', { provider });
      return res.data;
    },
    socialLogin: async (payload: { challengeId: string; idToken: string; authorizationCode?: string }) => {
      const res = await apiClient.post('/auth/social/login', payload);
      const { accessToken, refreshToken } = res.data;
      if (accessToken) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      return res.data;
    },
    linkSocialAccount: async (payload: { challengeId: string; idToken: string; authorizationCode?: string }) => {
      const res = await apiClient.post('/auth/social/accounts', payload);
      return res.data;
    },
    getSocialAccounts: async (): Promise<Array<{ provider: string; email?: string }>> => {
      const res = await apiClient.get('/auth/social/accounts');
      return res.data;
    },
    unlinkSocialAccount: async (provider: string) => {
      const res = await apiClient.delete(`/auth/social/accounts/${provider}`);
      return res.data;
    },
    refresh: async (refreshToken: string) => {
      const res = await apiClient.post('/auth/refresh', { refreshToken });
      return res.data;
    },
    logout: async () => {
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
        }
      } catch (err) {
        // Continue clearing local tokens
      } finally {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      }
    },
    getToken: async () => {
      return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    },
  },

  profile: {
    get: async (): Promise<UserProfile> => {
      const res = await apiClient.get('/profile');
      const data = res.data;
      const [ninRes, driverRes] = await Promise.allSettled([
        apiClient.get('/identity/nin'),
        apiClient.get('/driver/application'),
      ]);
      const ninData = ninRes.status === 'fulfilled' ? ninRes.value.data : null;
      const driverData = driverRes.status === 'fulfilled' ? driverRes.value.data : null;

      return {
        id: data.id,
        phoneE164: data.phone,
        displayName: data.displayName || 'Commuter',
        email: data.billingEmail || undefined,
        billingEmail: data.billingEmail || undefined,
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        bio: data.bio || '',
        gender: data.gender,
        ninVerified: Boolean(ninData?.status === 'VERIFIED'),
        ninLast4: ninData?.ninLast4,
        isDriver: Boolean(driverData?.status === 'APPROVED'),
        driverStatus: driverData?.status || 'DRAFT',
        rating: 4.98,
        totalTrips: 12,
      };
    },
    update: async (input: { displayName?: string; bio?: string; gender?: 'WOMAN' | 'MAN' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY'; billingEmail?: string }) => {
      const res = await apiClient.patch('/profile', input);
      return res.data;
    },
  },

  identity: {
    getConsentAndStatus: async () => {
      const res = await apiClient.get('/identity/nin');
      return res.data;
    },
    getStatus: async () => {
      const res = await apiClient.get('/identity/nin');
      return res.data;
    },
    verifyNin: async (input: {
      nin: string;
      legalFirstName: string;
      legalLastName: string;
      dateOfBirth: string;
      consent: true;
      consentVersion?: string;
    }) => {
      const res = await apiClient.post('/identity/nin/verify', {
        ...input,
        consentVersion: input.consentVersion || '2026-10-01',
      });
      return res.data;
    },
  },

  driver: {
    ensureApplication: async (): Promise<DriverApplicationItem> => {
      const res = await apiClient.put('/driver/application');
      return res.data;
    },
    getApplication: async (): Promise<DriverApplicationItem> => {
      const res = await apiClient.get('/driver/application');
      return res.data;
    },
    updateDetails: async (input: {
      legalFirstName?: string;
      legalLastName?: string;
      dateOfBirth?: string;
      address?: string;
      city?: string;
      state?: string;
    }): Promise<DriverApplicationItem> => {
      const res = await apiClient.patch('/driver/application', input);
      return res.data;
    },
    updateApplication: async (input: any): Promise<DriverApplicationItem> => {
      await apiClient.put('/driver/application');
      const res = await apiClient.patch('/driver/application', input);
      return res.data;
    },
    upsertVehicle: async (input: {
      make: string;
      model: string;
      year: number;
      color: string;
      registrationNumber: string;
      seatCapacity: number;
    }): Promise<DriverApplicationItem> => {
      const res = await apiClient.put('/driver/application/vehicle', input);
      return res.data;
    },
    upsertDocument: async (
      kind: string,
      input: { uploadId: string; issuedOn?: string; expiresOn?: string },
    ): Promise<DriverApplicationItem> => {
      const res = await apiClient.put(`/driver/application/documents/${kind}`, input);
      return res.data;
    },
    deleteDocument: async (kind: string): Promise<void> => {
      await apiClient.delete(`/driver/application/documents/${kind}`);
    },
    submitApplication: async (): Promise<DriverApplicationItem> => {
      const res = await apiClient.post('/driver/application/submit');
      return res.data;
    },
  },

  uploads: {
    create: async (input: {
      purpose: 'driver_document';
      documentKind: string;
      contentType: string;
      byteSize: number;
      checksumSha256: string;
    }): Promise<{ id: string; uploadUrl: string; requiredHeaders: Record<string, string>; expiresAt: string }> => {
      const res = await apiClient.post('/uploads', input);
      return res.data;
    },
    get: async (uploadId: string) => {
      const res = await apiClient.get(`/uploads/${uploadId}`);
      return res.data;
    },
    complete: async (uploadId: string) => {
      const res = await apiClient.post(`/uploads/${uploadId}/complete`);
      return res.data;
    },
  },

  bank: {
    listBanks: async (): Promise<BankItem[]> => {
      const res = await apiClient.get('/bank');
      return res.data;
    },
    getAccount: async (): Promise<BankAccountItem | null> => {
      const res = await apiClient.get('/bank/account');
      return res.data;
    },
    resolve: async (bankCode: string, accountNumber: string): Promise<BankAccountItem> => {
      const res = await apiClient.post('/bank/resolve', { bankCode, accountNumber });
      return res.data;
    },
  },

  rides: {
    create: async (payload: any): Promise<any> => {
      let formatted = payload;
      if (payload.originName || payload.pickupLandmark) {
        const originLat = payload.originLatitude ?? payload.pickupLandmark?.latitude ?? 6.6521;
        const originLng = payload.originLongitude ?? payload.pickupLandmark?.longitude ?? 3.3591;
        const destLat = payload.destinationLatitude ?? payload.dropoffLandmark?.latitude ?? 6.4281;
        const destLng = payload.destinationLongitude ?? payload.dropoffLandmark?.longitude ?? 3.4219;

        const R = 6371000;
        const dLat = ((destLat - originLat) * Math.PI) / 180;
        const dLng = ((destLng - originLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((originLat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        const dist = Math.max(1000, Math.round(2 * R * Math.asin(Math.sqrt(a))));

        const departure =
          payload.departureAt ||
          payload.departureTime ||
          new Date(Date.now() + 3600 * 1000 * 4).toISOString();

        formatted = {
          departureAt: departure,
          timezone: 'Africa/Lagos',
          passengerSeats: payload.passengerSeats || 4,
          contributionKobo: payload.contributionKobo || payload.seatPriceKobo || 200000,
          currency: 'NGN',
          womenOnly: Boolean(payload.womenOnly || payload.womenOnlyRide),
          notes: payload.notes || 'Safe corridor commute',
          route: {
            origin: {
              label: payload.originName || payload.pickupLandmark?.name || 'Origin Landmark',
              address: payload.originAddress || payload.pickupLandmark?.address,
              latitude: originLat,
              longitude: originLng,
            },
            destination: {
              label: payload.destinationName || payload.dropoffLandmark?.name || 'Destination Landmark',
              address: payload.destinationAddress || payload.dropoffLandmark?.address,
              latitude: destLat,
              longitude: destLng,
            },
            waypoints: [],
            path: [
              { latitude: originLat, longitude: originLng },
              { latitude: (originLat + destLat) / 2, longitude: (originLng + destLng) / 2 },
              { latitude: destLat, longitude: destLng },
            ],
            distanceMeters: dist,
            durationSeconds: Math.round(dist / 12),
          },
        };
      }
      const res = await apiClient.post('/rides', formatted);
      return res.data;
    },
    getMine: async (): Promise<RideOffer[]> => {
      const res = await apiClient.get('/rides/mine');
      return (res.data || []).map(mapBackendRideToOffer);
    },
    get: async (rideId: string): Promise<RideOffer> => {
      const res = await apiClient.get(`/rides/${rideId}`);
      return mapBackendRideToOffer(res.data);
    },
    update: async (rideId: string, input: any) => {
      const res = await apiClient.patch(`/rides/${rideId}`, input);
      return res.data;
    },
    publish: async (rideId: string) => {
      const res = await apiClient.post(`/rides/${rideId}/publish`);
      return res.data;
    },
    start: async (rideId: string) => {
      const res = await apiClient.post(`/rides/${rideId}/start`);
      return res.data;
    },
    complete: async (rideId: string) => {
      const res = await apiClient.post(`/rides/${rideId}/complete`);
      return res.data;
    },
    cancel: async (rideId: string, reason: string) => {
      const res = await apiClient.post(`/rides/${rideId}/cancel`, { reason });
      return res.data;
    },
    search: async (params: {
      originLatitude: number;
      originLongitude: number;
      destinationLatitude: number;
      destinationLongitude: number;
      radiusMeters?: number;
      seats?: number;
      departureFrom?: string;
      departureTo?: string;
      limit?: number;
    }): Promise<RideOffer[]> => {
      const res = await apiClient.get('/rides/search', { params });
      return (res.data || []).map(mapBackendRideToOffer);
    },
  },

  rideSeries: {
    create: async (payload: any) => {
      const res = await apiClient.post('/ride-series', payload);
      return res.data;
    },
    getMine: async () => {
      const res = await apiClient.get('/ride-series/mine');
      return res.data;
    },
    pause: async (seriesId: string) => {
      const res = await apiClient.post(`/ride-series/${seriesId}/pause`);
      return res.data;
    },
    resume: async (seriesId: string) => {
      const res = await apiClient.post(`/ride-series/${seriesId}/resume`);
      return res.data;
    },
    cancel: async (seriesId: string) => {
      const res = await apiClient.post(`/ride-series/${seriesId}/cancel`);
      return res.data;
    },
  },

  locations: {
    getLandmarks: async (params?: {
      q?: string;
      city?: string;
      category?: string;
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
      limit?: number;
    }): Promise<SafeLandmarkItem[]> => {
      const res = await apiClient.get('/locations/landmarks', { params });
      return res.data;
    },
    getLandmark: async (landmarkId: string): Promise<SafeLandmarkItem> => {
      const res = await apiClient.get(`/locations/landmarks/${landmarkId}`);
      return res.data;
    },
    geocode: async (q: string) => {
      const res = await apiClient.get('/locations/geocode/search', { params: { q } });
      return res.data;
    },
    search: async (query: string) => {
      const res = await apiClient.get('/locations/landmarks', { params: { q: query } });
      return res.data;
    },
  },

  bookings: {
    create: async (payload: {
      rideId: string;
      seats: number;
      journey?: {
        pickupLatitude: number;
        pickupLongitude: number;
        dropoffLatitude: number;
        dropoffLongitude: number;
      };
    }): Promise<Booking> => {
      const res = await apiClient.post('/bookings', payload);
      return mapBackendBookingToModel(res.data);
    },
    getMine: async (statuses?: string[]): Promise<Booking[]> => {
      const res = await apiClient.get('/bookings/mine', { params: { statuses: statuses?.join(',') } });
      return (res.data || []).map(mapBackendBookingToModel);
    },
    getForRide: async (rideId: string): Promise<Booking[]> => {
      const res = await apiClient.get(`/bookings/ride/${rideId}`);
      return (res.data || []).map(mapBackendBookingToModel);
    },
    confirm: async (bookingId: string) => {
      const res = await apiClient.post(`/bookings/${bookingId}/confirm`);
      return mapBackendBookingToModel(res.data);
    },
    decline: async (bookingId: string, reason: string) => {
      const res = await apiClient.post(`/bookings/${bookingId}/decline`, { reason });
      return mapBackendBookingToModel(res.data);
    },
    cancel: async (bookingId: string, reason: string) => {
      const res = await apiClient.post(`/bookings/${bookingId}/cancel`, { reason });
      return mapBackendBookingToModel(res.data);
    },
  },

  trips: {
    getTracker: async (view: 'UPCOMING' | 'PAST' | 'CANCELLED'): Promise<{ driverRides: RideOffer[]; passengerBookings: Booking[] }> => {
      const res = await apiClient.get('/trips', { params: { view } });
      const data = res.data || {};
      return {
        driverRides: (data.driverRides || []).map(mapBackendRideToOffer),
        passengerBookings: (data.passengerBookings || []).map(mapBackendBookingToModel),
      };
    },
  },

  payments: {
    checkout: async (bookingId: string): Promise<{ authorizationUrl?: string; reference: string; amountKobo: number; status: string }> => {
      const res = await apiClient.post('/payments/checkout', { bookingId });
      return {
        authorizationUrl: res.data.authorizationUrl || `https://checkout.paystack.com/${res.data.reference}`,
        reference: res.data.reference || res.data.id,
        amountKobo: Number(res.data.amountKobo),
        status: res.data.status,
      };
    },
    get: async (paymentId: string) => {
      const res = await apiClient.get(`/payments/${paymentId}`);
      return res.data;
    },
    getRefund: async (refundId: string) => {
      const res = await apiClient.get(`/payments/refunds/${refundId}`);
      return res.data;
    },
    getLedger: async (): Promise<LedgerJournalItem[]> => {
      const res = await apiClient.get('/payments/ledger/mine');
      return res.data;
    },
    getPayouts: async (): Promise<DriverPayoutItem[]> => {
      const res = await apiClient.get('/payments/payouts/mine');
      return res.data;
    },
  },

  disputes: {
    create: async (bookingId: string, reason: string): Promise<DisputeItem> => {
      const res = await apiClient.post(`/disputes/bookings/${bookingId}`, { reason });
      return res.data;
    },
    getMine: async (params?: { status?: string; cursor?: string; limit?: number }) => {
      const res = await apiClient.get('/disputes/mine', { params });
      return res.data;
    },
  },

  reviews: {
    create: async (bookingId: string, rating: number, comment?: string): Promise<RideReviewItem> => {
      const res = await apiClient.post(`/reviews/bookings/${bookingId}`, { rating, comment });
      return res.data;
    },
    getUserReviews: async (userId: string, params?: { cursor?: string; limit?: number }) => {
      const res = await apiClient.get(`/reviews/users/${userId}`, { params });
      return res.data;
    },
  },

  reports: {
    create: async (
      bookingId: string,
      category: 'SAFETY' | 'HARASSMENT' | 'FRAUD' | 'NO_SHOW' | 'OTHER',
      details: string,
    ): Promise<UserReportItem> => {
      const res = await apiClient.post(`/reports/bookings/${bookingId}`, { category, details });
      return res.data;
    },
    getMine: async (params?: { status?: string; limit?: number }) => {
      const res = await apiClient.get('/reports/mine', { params });
      return res.data;
    },
  },

  chat: {
    getConversations: async () => {
      const res = await apiClient.get('/chat/conversations');
      return res.data;
    },
    getMessages: async (bookingId: string, params?: { cursor?: string; limit?: number }): Promise<ChatMessage[]> => {
      const res = await apiClient.get(`/chat/bookings/${bookingId}/messages`, { params });
      const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      return items.map((m: any) => ({
        id: m.id,
        bookingId,
        senderId: m.sender?.userId || m.senderUserId || m.senderId,
        senderName: m.sender?.displayName || m.senderName || 'User',
        senderAvatar: m.sender?.avatarUrl,
        body: m.body || m.content,
        isSelf: Boolean(m.isSelf),
        createdAt: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
        read: Boolean(m.read),
      }));
    },
    sendMessage: async (bookingId: string, body: string, clientMessageId?: string) => {
      const msgId =
        clientMessageId ||
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            }));
      const res = await apiClient.post(`/chat/bookings/${bookingId}/messages`, {
        clientMessageId: msgId,
        body,
      });
      return res.data;
    },
    markRead: async (bookingId: string, messageId?: string) => {
      if (messageId) {
        await apiClient.post(`/chat/bookings/${bookingId}/read`, { messageId });
      }
    },
  },

  notifications: {
    list: async (params?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationItem[]> => {
      const res = await apiClient.get('/notifications', { params });
      return res.data;
    },
    markAllRead: async () => {
      const res = await apiClient.post('/notifications/read-all');
      return res.data;
    },
    markRead: async (notificationId: string) => {
      const res = await apiClient.post(`/notifications/${notificationId}/read`);
      return res.data;
    },
    getPushConfig: async () => {
      const res = await apiClient.get('/notifications/push/config');
      return res.data;
    },
    subscribePush: async (subscription: { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } }) => {
      const res = await apiClient.post('/notifications/push/subscriptions', subscription);
      return res.data;
    },
    unsubscribePush: async (subscriptionId: string) => {
      const res = await apiClient.delete(`/notifications/push/subscriptions/${subscriptionId}`);
      return res.data;
    },
  },

  safety: {
    getContacts: async (): Promise<EmergencyContact[]> => {
      const res = await apiClient.get('/safety/contacts');
      return res.data;
    },
    addContact: async (input: { name: string; phoneE164: string; relationship: string; isPrimary?: boolean }) => {
      const res = await apiClient.post('/safety/contacts', input);
      return res.data;
    },
    deleteContact: async (contactId: string) => {
      await apiClient.delete(`/safety/contacts/${contactId}`);
    },
    getShareLinks: async (rideId: string): Promise<TripShareItem[]> => {
      const res = await apiClient.get(`/safety/rides/${rideId}/share-links`);
      return res.data;
    },
    createShareLink: async (rideId: string, label = 'Live RideShare WhatsApp Alert', expiresInHours = 24): Promise<TripShareItem> => {
      const res = await apiClient.post(`/safety/rides/${rideId}/share-links`, {
        label,
        expiresInHours,
      });
      return res.data;
    },
    revokeShareLink: async (linkId: string) => {
      await apiClient.delete(`/safety/share-links/${linkId}`);
    },
    getPublicTripShare: async (token: string) => {
      const res = await apiClient.get(`/trip-shares/${token}`);
      return res.data;
    },
    sendLocationPing: async (
      rideId: string,
      latitude: number,
      longitude: number,
      heading?: number,
      speedMps?: number,
      accuracyMeters?: number,
    ) => {
      await apiClient.post(`/safety/rides/${rideId}/location`, {
        latitude,
        longitude,
        heading,
        speedMps,
        accuracyMeters,
      });
    },
    triggerSos: async (rideId: string, latitude: number, longitude: number) => {
      const clientAlertId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
      const res = await apiClient.post(`/safety/rides/${rideId}/sos`, {
        clientAlertId,
        latitude,
        longitude,
        emergencyNumber: '112',
      });
      return res.data;
    },
    getAlerts: async () => {
      const res = await apiClient.get('/safety/alerts');
      return res.data;
    },
    resolveAlert: async (alertId: string, note: string) => {
      const res = await apiClient.post(`/safety/alerts/${alertId}/resolve`, { note });
      return res.data;
    },
  },

  admin: {
    getDriverApplications: async (params?: any) => {
      const res = await apiClient.get('/admin/driver-applications', { params });
      return res.data;
    },
    getDriverApplication: async (applicationId: string) => {
      const res = await apiClient.get(`/admin/driver-applications/${applicationId}`);
      return res.data;
    },
    reviewDocument: async (applicationId: string, documentId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) => {
      const res = await apiClient.post(`/admin/driver-applications/${applicationId}/documents/${documentId}/review`, { decision, notes });
      return res.data;
    },
    reviewApplication: async (applicationId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) => {
      const res = await apiClient.post(`/admin/driver-applications/${applicationId}/review`, { decision, notes });
      return res.data;
    },
    getLandmarks: async () => {
      const res = await apiClient.get('/admin/landmarks');
      return res.data;
    },
    createLandmark: async (input: any) => {
      const res = await apiClient.post('/admin/landmarks', input);
      return res.data;
    },
    updateLandmark: async (landmarkId: string, input: any) => {
      const res = await apiClient.patch(`/admin/landmarks/${landmarkId}`, input);
      return res.data;
    },
    getReports: async (params?: any) => {
      const res = await apiClient.get('/admin/reports', { params });
      return res.data;
    },
    getReport: async (reportId: string) => {
      const res = await apiClient.get(`/admin/reports/${reportId}`);
      return res.data;
    },
    reviewReport: async (reportId: string, input: { status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'; resolutionNotes?: string }) => {
      const res = await apiClient.post(`/admin/reports/${reportId}/review`, input);
      return res.data;
    },
    getDisputes: async (params?: any) => {
      const res = await apiClient.get('/admin/disputes', { params });
      return res.data;
    },
    getDispute: async (disputeId: string) => {
      const res = await apiClient.get(`/admin/disputes/${disputeId}`);
      return res.data;
    },
    resolveDispute: async (disputeId: string, input: { decision: 'RELEASE' | 'REFUND'; reviewerNotes?: string }) => {
      const res = await apiClient.post(`/admin/disputes/${disputeId}/resolve`, input);
      return res.data;
    },
  },
};
