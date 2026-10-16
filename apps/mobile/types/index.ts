export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export interface UserProfile {
  id: string;
  phoneE164: string;
  displayName: string;
  email?: string;
  billingEmail?: string;
  avatarUrl?: string;
  bio?: string;
  state?: string;
  city?: string;
  gender?: 'WOMAN' | 'MAN' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
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

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
}

export interface SafeLandmarkItem {
  id: string;
  name: string;
  address: string;
  category: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  safetyNotes?: string | null;
  isActive: boolean;
}

export interface BankItem {
  name: string;
  code: string;
  slug?: string;
  active: boolean;
}

export interface BankAccountItem {
  id: string;
  accountNumberMasked: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  isVerified: boolean;
}

export interface LedgerJournalItem {
  id: string;
  kind: string;
  reference: string;
  description?: string;
  createdAt: string;
  amountKobo: number;
}

export interface DriverPayoutItem {
  id: string;
  reference: string;
  amountKobo: number;
  currency: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SUBMITTED' | 'SUCCESS' | 'FAILED' | 'ON_HOLD' | 'REVERSED' | 'CANCELLED';
  scheduledFor: string;
  bankAccount: BankAccountItem;
}

export interface DisputeItem {
  id: string;
  bookingId: string;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface RideReviewItem {
  id: string;
  bookingId: string;
  authorId: string;
  subjectId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface UserReportItem {
  id: string;
  bookingId: string;
  category: 'SAFETY' | 'HARASSMENT' | 'FRAUD' | 'NO_SHOW' | 'OTHER';
  details: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface DriverApplicationItem {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  legalFirstName?: string;
  legalLastName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  vehicle?: DriverVehicle;
  documents?: Array<{
    id: string;
    kind: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    expiresOn?: string;
  }>;
}

export interface TripShareItem {
  id: string;
  token: string;
  label?: string;
  expiresAt: string;
  revokedAt?: string | null;
  shareUrl: string;
}
