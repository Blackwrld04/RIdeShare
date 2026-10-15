import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type ThemeColors, type ThemeMode } from '../constants/theme';
import type { Booking, EmergencyContact, RideOffer, UserProfile } from '../types';

export interface AppState {
  // Theme
  themeMode: ThemeMode;
  theme: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;

  // Auth & Profile
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;

  // Search State
  searchOrigin: string;
  searchDest: string;
  searchDate: string;
  searchSeats: number;
  searchLandmark: string;
  setSearchOrigin: (val: string) => void;
  setSearchDest: (val: string) => void;
  swapRoute: () => void;
  setSearchDate: (val: string) => void;
  setSearchSeats: (val: number) => void;
  setSearchLandmark: (val: string) => void;

  // Rides & Bookings
  rides: RideOffer[];
  bookings: Booking[];
  activeTrip: Booking | null;
  addRide: (ride: RideOffer) => void;
  addBooking: (booking: Booking) => void;
  setActiveTrip: (booking: Booking | null) => void;

  // Emergency & Safety
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (id: string) => void;
}

const mockInitialUser: UserProfile = {
  id: 'usr-101',
  phoneE164: '+2348031234567',
  displayName: 'Alina Okafor',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  bio: 'Daily corporate commuter from Berger to VI. Splitting fuel smartly.',
  ninVerified: true,
  ninLast4: '8821',
  isDriver: true,
  driverStatus: 'APPROVED',
  rating: 4.95,
  totalTrips: 34,
};

const mockInitialRides: RideOffer[] = [
  {
    id: 'ride-1',
    driverId: 'drv-201',
    driverName: 'Olajide Abdulquadri',
    driverAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    driverRating: 4.98,
    driverTripCount: 142,
    ninVerified: true,
    vehicle: {
      make: 'Toyota',
      model: 'Corolla 2018',
      year: 2018,
      color: 'Silver',
      registrationNumber: 'LAG-492-AA',
      seatCapacity: 4,
    },
    originTitle: 'Berger Bus Stop, Lagos',
    originLandmark: 'Oando Filling Station, Berger',
    destTitle: 'Admiralty Way, Lekki Phase 1',
    destLandmark: 'Ebeano Supermarket, Lekki 1',
    departureTime: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    estimatedArrival: new Date(Date.now() + 3600 * 1000 * 3.5).toISOString(),
    passengerSeats: 3,
    availableSeats: 2,
    contributionKobo: 200000,
    currency: 'NGN',
    isRecurring: true,
    isFemaleOnly: false,
    amenities: ['Direct Highway', 'Air Conditioned', 'No Smoking', 'Music'],
    status: 'SCHEDULED',
  },
  {
    id: 'ride-2',
    driverId: 'drv-202',
    driverName: 'Fatima Sanusi',
    driverAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    driverRating: 5.0,
    driverTripCount: 88,
    ninVerified: true,
    vehicle: {
      make: 'Hyundai',
      model: 'Elantra',
      year: 2021,
      color: 'Pearl White',
      registrationNumber: 'KJA-810-BQ',
      seatCapacity: 4,
    },
    originTitle: 'Ikorodu Garage, Lagos',
    originLandmark: 'Ikorodu BRT Terminal Gate 2',
    destTitle: 'CMS / Marina, Lagos Island',
    destLandmark: 'Sterling Towers, Marina',
    departureTime: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
    estimatedArrival: new Date(Date.now() + 3600 * 1000 * 5.2).toISOString(),
    passengerSeats: 3,
    availableSeats: 3,
    contributionKobo: 180000,
    currency: 'NGN',
    isRecurring: true,
    isFemaleOnly: true,
    amenities: ['Women-Only', 'Air Conditioned', 'Quiet Ride', 'Bottled Water'],
    status: 'SCHEDULED',
  },
  {
    id: 'ride-3',
    driverId: 'drv-203',
    driverName: 'Emeka Nwosu',
    driverAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    driverRating: 4.88,
    driverTripCount: 65,
    ninVerified: true,
    vehicle: {
      make: 'Honda',
      model: 'Civic',
      year: 2019,
      color: 'Midnight Blue',
      registrationNumber: 'APP-304-LK',
      seatCapacity: 4,
    },
    originTitle: 'Ajah / Sangotedo',
    originLandmark: 'Shoprite Sangotedo Frontage',
    destTitle: 'Ikoyi / Victoria Island',
    destLandmark: 'Falomo Roundabout Underbridge',
    departureTime: new Date(Date.now() + 3600 * 1000 * 6).toISOString(),
    estimatedArrival: new Date(Date.now() + 3600 * 1000 * 7.5).toISOString(),
    passengerSeats: 3,
    availableSeats: 1,
    contributionKobo: 150000,
    currency: 'NGN',
    isRecurring: false,
    isFemaleOnly: false,
    amenities: ['Air Conditioned', 'Luggage Space', 'Fast Lane Express'],
    status: 'SCHEDULED',
  },
];

const mockInitialBooking: Booking = {
  id: 'book-901',
  rideId: 'ride-1',
  ride: mockInitialRides[0],
  seatsBooked: 1,
  status: 'IN_TRANSIT',
  pickupLandmark: 'Oando Filling Station, Berger',
  dropoffLandmark: 'Ebeano Supermarket, Lekki 1',
  fareAmountKobo: 200000,
  platformFeeKobo: 30000,
  totalKobo: 230000,
  paystackReference: 'PSTK-COMMUTE-984210',
  createdAt: new Date().toISOString(),
};

export const useAppStore = create<AppState>((set, get) => ({
  themeMode: 'dark', // default to sleek Vanta dark as seen in the primary inspiration image, toggleable
  theme: darkTheme,
  toggleTheme: () => {
    const nextMode = get().themeMode === 'light' ? 'dark' : 'light';
    set({
      themeMode: nextMode,
      theme: nextMode === 'light' ? lightTheme : darkTheme,
    });
    AsyncStorage.setItem('@commuteshare_theme', nextMode);
  },
  setThemeMode: (mode: ThemeMode) => {
    set({
      themeMode: mode,
      theme: mode === 'light' ? lightTheme : darkTheme,
    });
    AsyncStorage.setItem('@commuteshare_theme', mode);
  },

  user: mockInitialUser,
  isAuthenticated: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),

  searchOrigin: 'Berger Bus Stop, Lagos',
  searchDest: 'Admiralty Way, Lekki Phase 1',
  searchDate: 'Today',
  searchSeats: 1,
  searchLandmark: 'Oando Filling Station, Berger',
  setSearchOrigin: (searchOrigin) => set({ searchOrigin }),
  setSearchDest: (searchDest) => set({ searchDest }),
  swapRoute: () => {
    const { searchOrigin, searchDest } = get();
    set({ searchOrigin: searchDest, searchDest: searchOrigin });
  },
  setSearchDate: (searchDate) => set({ searchDate }),
  setSearchSeats: (searchSeats) => set({ searchSeats }),
  setSearchLandmark: (searchLandmark) => set({ searchLandmark }),

  rides: mockInitialRides,
  bookings: [mockInitialBooking],
  activeTrip: mockInitialBooking,
  addRide: (ride) => set((state) => ({ rides: [ride, ...state.rides] })),
  addBooking: (booking) => set((state) => ({ bookings: [booking, ...state.bookings], activeTrip: booking })),
  setActiveTrip: (activeTrip) => set({ activeTrip }),

  emergencyContacts: [
    {
      id: 'em-1',
      name: 'Adewale Okafor (Brother)',
      phoneE164: '+2348023456789',
      relationship: 'Brother',
      isPrimary: true,
    },
    {
      id: 'em-2',
      name: 'Dr. Ifeoma Okafor (Mother)',
      phoneE164: '+2348098765432',
      relationship: 'Mother',
      isPrimary: false,
    },
  ],
  addEmergencyContact: (contact) =>
    set((state) => ({ emergencyContacts: [...state.emergencyContacts, contact] })),
  removeEmergencyContact: (id) =>
    set((state) => ({
      emergencyContacts: state.emergencyContacts.filter((c) => c.id !== id),
    })),
}));
