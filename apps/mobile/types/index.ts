export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export interface UserProfile {
  id: string;
  phoneE164: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  ninVerified: boolean;
  ninLast4?: string;
  isDriver: boolean;
  driverStatus?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rating: number;
  totalTrips: number;
}

export interface DriverVehicle {
  make: string;
  model: string;
  year: number;
  color: string;
  registrationNumber: string; // e.g. "LAG-492-AA"
  seatCapacity: number;
}

export interface RoutePoint {
  sequence: number;
  kind: 'ORIGIN' | 'WAYPOINT' | 'DESTINATION';
  label: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export interface RideOffer {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  driverRating: number;
  driverTripCount: number;
  ninVerified: boolean;
  vehicle: DriverVehicle;
  originTitle: string;
  originLandmark: string;
  destTitle: string;
  destLandmark: string;
  departureTime: string; // ISO
  estimatedArrival: string; // ISO
  passengerSeats: number;
  availableSeats: number;
  contributionKobo: number;
  currency: 'NGN';
  isRecurring: boolean;
  isFemaleOnly: boolean;
  amenities: string[];
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  routePoints?: RoutePoint[];
}

export interface Booking {
  id: string;
  rideId: string;
  ride: RideOffer;
  seatsBooked: number;
  status: 'PENDING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  pickupLandmark: string;
  dropoffLandmark: string;
  fareAmountKobo: number;
  platformFeeKobo: number;
  totalKobo: number;
  paystackReference?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  body: string;
  isSelf: boolean;
  createdAt: string;
  read: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneE164: string;
  relationship: string;
  isPrimary: boolean;
}

export interface SafetyAlert {
  id: string;
  rideId: string;
  status: 'ACTIVE' | 'RESOLVED';
  latitude: number;
  longitude: number;
  createdAt: string;
  emergencyNumber: string;
}
