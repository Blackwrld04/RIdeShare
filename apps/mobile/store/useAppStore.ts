import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type ThemeColors, type ThemeMode } from '../constants/theme';
import type { Booking, EmergencyContact, RideOffer, UserProfile } from '../types';
import { api } from '../services/api';
import { DEMO_RIDES, ALL_DEMO_RIDES, DEMO_BOOKINGS, DEMO_EMERGENCY_CONTACTS, getRidesForState } from '../constants/demoData';
import { getDefaultRouteForState } from '../constants/nigerianLocations';

export interface AppState {
  // Theme
  themeMode: ThemeMode;
  theme: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;

  // Auth & Session
  user: UserProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  homeState: string;
  setHomeState: (state: string) => void;
  bootstrapAuth: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  logout: () => Promise<void>;

  // Route & Search Parameters
  searchOrigin: string;
  searchDest: string;
  searchDate: string;
  searchSeats: number;
  searchLandmark: string;
  originCoords: { latitude: number; longitude: number };
  destCoords: { latitude: number; longitude: number };
  setSearchOrigin: (val: string, coords?: { latitude: number; longitude: number }) => void;
  setSearchDest: (val: string, coords?: { latitude: number; longitude: number }) => void;
  swapRoute: () => void;
  setSearchDate: (val: string) => void;
  setSearchSeats: (val: number) => void;
  setSearchLandmark: (val: string) => void;

  // Rides & Feed
  rides: RideOffer[];
  isLoadingRides: boolean;
  ridesError: string | null;
  fetchRides: (customParams?: any) => Promise<void>;
  addRide: (ride: RideOffer) => void;

  // Bookings & Active Trips
  bookings: Booking[];
  activeTrip: Booking | null;
  isLoadingTrips: boolean;
  addBooking: (booking: Booking) => void;
  setActiveTrip: (booking: Booking | null) => void;
  fetchTrips: (view?: 'UPCOMING' | 'PAST' | 'CANCELLED') => Promise<void>;

  // Safety & Emergency Contacts
  emergencyContacts: EmergencyContact[];
  isLoadingContacts: boolean;
  fetchEmergencyContacts: () => Promise<void>;
  addEmergencyContact: (contact: { name: string; phoneE164: string; relationship: string }) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;
}

// Default Lagos Berger -> Lekki coordinate anchors
const DEFAULT_ORIGIN = { label: 'Berger Bus Stop, Lagos', latitude: 6.6521, longitude: 3.3591 };
const DEFAULT_DEST = { label: 'Admiralty Way, Lekki Phase 1', latitude: 6.4281, longitude: 3.4219 };

function combineRides(primary: RideOffer[] = [], secondary: RideOffer[] = ALL_DEMO_RIDES): RideOffer[] {
  const map = new Map<string, RideOffer>();
  primary.forEach((r) => map.set(r.id, r));
  secondary.forEach((r) => {
    if (!map.has(r.id)) map.set(r.id, r);
  });
  return Array.from(map.values());
}

export const useAppStore = create<AppState>((set, get) => ({
  // Theme management
  themeMode: 'dark',
  theme: darkTheme,
  toggleTheme: () => {
    const nextMode = get().themeMode === 'light' ? 'dark' : 'light';
    set({
      themeMode: nextMode,
      theme: nextMode === 'light' ? lightTheme : darkTheme,
    });
    AsyncStorage.setItem('@rideshare_theme', nextMode);
  },
  setThemeMode: (mode: ThemeMode) => {
    set({
      themeMode: mode,
      theme: mode === 'light' ? lightTheme : darkTheme,
    });
    AsyncStorage.setItem('@rideshare_theme', mode);
  },

  // Auth & Session
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  homeState: 'Lagos',

  setHomeState: (stateName: string) => {
    const defaults = getDefaultRouteForState(stateName);
    const regionalRides = getRidesForState(stateName);
    set((prev) => ({
      homeState: stateName,
      user: prev.user ? { ...prev.user, state: stateName } : null,
      rides: combineRides(regionalRides, ALL_DEMO_RIDES),
      searchOrigin: defaults.origin.label,
      searchDest: defaults.destination.label,
      searchLandmark: defaults.origin.landmark,
      originCoords: { latitude: defaults.origin.latitude, longitude: defaults.origin.longitude },
      destCoords: { latitude: defaults.destination.latitude, longitude: defaults.destination.longitude },
    }));
    AsyncStorage.setItem('@rideshare_home_state', stateName);
  },

  bootstrapAuth: async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('@rideshare_theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        set({
          themeMode: storedTheme,
          theme: storedTheme === 'light' ? lightTheme : darkTheme,
        });
      }

      const storedHomeState = await AsyncStorage.getItem('@rideshare_home_state');
      if (storedHomeState) {
        const defaults = getDefaultRouteForState(storedHomeState);
        const regionalRides = getRidesForState(storedHomeState);
        set({
          homeState: storedHomeState,
          rides: combineRides(regionalRides, ALL_DEMO_RIDES),
          searchOrigin: defaults.origin.label,
          searchDest: defaults.destination.label,
          searchLandmark: defaults.origin.landmark,
          originCoords: { latitude: defaults.origin.latitude, longitude: defaults.origin.longitude },
          destCoords: { latitude: defaults.destination.latitude, longitude: defaults.destination.longitude },
        });
      }

      const token = await AsyncStorage.getItem('@rideshare_access_token');
      if (!token) {
        set({ user: null, isAuthenticated: false, isInitializing: false });
        return;
      }

      const profile = await api.profile.get();
      if (profile?.state) {
        const defaults = getDefaultRouteForState(profile.state);
        const regionalRides = getRidesForState(profile.state);
        set({
          homeState: profile.state,
          rides: combineRides(regionalRides, ALL_DEMO_RIDES),
          searchOrigin: defaults.origin.label,
          searchDest: defaults.destination.label,
          searchLandmark: defaults.origin.landmark,
          originCoords: { latitude: defaults.origin.latitude, longitude: defaults.origin.longitude },
          destCoords: { latitude: defaults.destination.latitude, longitude: defaults.destination.longitude },
        });
        AsyncStorage.setItem('@rideshare_home_state', profile.state);
      }
      set({ user: profile, isAuthenticated: true, isInitializing: false });
    } catch (err) {
      console.warn('Session restore failed or expired:', err);
      await AsyncStorage.multiRemove(['@rideshare_access_token', '@rideshare_refresh_token']);
      set({ user: null, isAuthenticated: false, isInitializing: false });
    }
  },

  setUser: (user) => {
    set((prev) => {
      const updatedState = user?.state || prev.homeState;
      if (user?.state) {
        AsyncStorage.setItem('@rideshare_home_state', user.state);
      }
      return {
        user,
        isAuthenticated: !!user,
        homeState: updatedState,
      };
    });
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn('api.auth.logout error:', e);
    }
    set({ user: null, isAuthenticated: false, bookings: [], activeTrip: null });
  },

  // Route & Search Coordinates
  searchOrigin: DEFAULT_ORIGIN.label,
  searchDest: DEFAULT_DEST.label,
  searchDate: 'Today',
  searchSeats: 1,
  searchLandmark: 'Oando Filling Station, Berger',
  originCoords: { latitude: DEFAULT_ORIGIN.latitude, longitude: DEFAULT_ORIGIN.longitude },
  destCoords: { latitude: DEFAULT_DEST.latitude, longitude: DEFAULT_DEST.longitude },

  setSearchOrigin: (searchOrigin, coords) =>
    set((state) => ({
      searchOrigin,
      originCoords: coords || state.originCoords,
    })),

  setSearchDest: (searchDest, coords) =>
    set((state) => ({
      searchDest,
      destCoords: coords || state.destCoords,
    })),

  swapRoute: () => {
    const { searchOrigin, searchDest, originCoords, destCoords } = get();
    set({
      searchOrigin: searchDest,
      searchDest: searchOrigin,
      originCoords: destCoords,
      destCoords: originCoords,
    });
  },

  setSearchDate: (searchDate) => set({ searchDate }),
  setSearchSeats: (searchSeats) => set({ searchSeats }),
  setSearchLandmark: (searchLandmark) => set({ searchLandmark }),

  // Rides & Feed
  rides: ALL_DEMO_RIDES,
  isLoadingRides: false,
  ridesError: null,

  fetchRides: async (customParams) => {
    const { originCoords, destCoords, searchSeats, homeState, searchOrigin, searchDest } = get();
    set({ isLoadingRides: true, ridesError: null });

    try {
      const departureFrom = new Date().toISOString();
      const departureTo = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
      const params = {
        originLatitude: customParams?.originLatitude ?? originCoords.latitude,
        originLongitude: customParams?.originLongitude ?? originCoords.longitude,
        destinationLatitude: customParams?.destinationLatitude ?? destCoords.latitude,
        destinationLongitude: customParams?.destinationLongitude ?? destCoords.longitude,
        radiusMeters: customParams?.radiusMeters ?? 25000,
        seats: customParams?.seats ?? searchSeats,
        departureFrom,
        departureTo,
        ...customParams,
      };

      const results = await api.rides.search(params);
      const regionalRides = getRidesForState(homeState, { origin: searchOrigin, dest: searchDest });
      const combined = combineRides(results || [], combineRides(regionalRides, ALL_DEMO_RIDES));
      set({ rides: combined, isLoadingRides: false });
    } catch (err: any) {
      console.warn('Backend rides search fallback to verified regional and corridor rides:', err?.message);
      const regionalRides = getRidesForState(homeState, { origin: searchOrigin, dest: searchDest });
      set({
        rides: combineRides(regionalRides, ALL_DEMO_RIDES),
        isLoadingRides: false,
      });
    }
  },

  addRide: (ride) =>
    set((state) => ({
      rides: [ride, ...state.rides],
    })),

  // Bookings & Trips
  bookings: DEMO_BOOKINGS,
  activeTrip: DEMO_BOOKINGS[0],
  isLoadingTrips: false,

  addBooking: (booking) =>
    set((state) => ({
      bookings: [booking, ...state.bookings],
      activeTrip: booking,
    })),

  setActiveTrip: (activeTrip) => set({ activeTrip }),

  fetchTrips: async (view = 'UPCOMING') => {
    set({ isLoadingTrips: true });
    try {
      const result = await api.trips.getTracker(view);
      const remoteBookings = result?.passengerBookings || [];
      if (remoteBookings.length > 0) {
        const combined = [...remoteBookings];
        DEMO_BOOKINGS.forEach((db) => {
          if (!combined.some((b) => b.id === db.id)) {
            combined.push(db);
          }
        });
        const active = combined.find((t) => t.status === 'CONFIRMED' || t.status === 'IN_TRANSIT') || combined[0] || null;
        set({ bookings: combined, activeTrip: active, isLoadingTrips: false });
      } else {
        const active = DEMO_BOOKINGS.find((t) => t.status === 'CONFIRMED' || t.status === 'IN_TRANSIT') || DEMO_BOOKINGS[0] || null;
        set({ bookings: DEMO_BOOKINGS, activeTrip: active, isLoadingTrips: false });
      }
    } catch (err) {
      const active = DEMO_BOOKINGS.find((t) => t.status === 'CONFIRMED' || t.status === 'IN_TRANSIT') || DEMO_BOOKINGS[0] || null;
      set({ bookings: DEMO_BOOKINGS, activeTrip: active, isLoadingTrips: false });
    }
  },

  // Emergency & Safety
  emergencyContacts: DEMO_EMERGENCY_CONTACTS,
  isLoadingContacts: false,

  fetchEmergencyContacts: async () => {
    set({ isLoadingContacts: true });
    try {
      const contacts = await api.safety.getContacts();
      if (contacts && contacts.length > 0) {
        set({ emergencyContacts: contacts, isLoadingContacts: false });
      } else {
        set({ emergencyContacts: DEMO_EMERGENCY_CONTACTS, isLoadingContacts: false });
      }
    } catch (err) {
      set({ emergencyContacts: DEMO_EMERGENCY_CONTACTS, isLoadingContacts: false });
    }
  },

  addEmergencyContact: async (contact) => {
    try {
      const created = await api.safety.addContact(contact);
      set((state) => ({ emergencyContacts: [...state.emergencyContacts, created] }));
    } catch (err) {
      console.error('Failed to add emergency contact:', err);
      throw err;
    }
  },

  removeEmergencyContact: async (id) => {
    try {
      await api.safety.deleteContact(id);
      set((state) => ({
        emergencyContacts: state.emergencyContacts.filter((c) => c.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete emergency contact:', err);
      throw err;
    }
  },
}));
