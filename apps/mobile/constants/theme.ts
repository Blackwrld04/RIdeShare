export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceBorder: string;
  surfaceCard: string;
  surfaceInput: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryForeground: string;
  primaryGradient: [string, string, ...string[]];
  headerGradient: [string, string, ...string[]];
  accent: string;
  accentSoft: string;
  verifiedBadge: string;
  verifiedBadgeBg: string;
  cardShadow: string;
  statusSuccess: string;
  statusWarning: string;
  statusDanger: string;
  bottomBarBackground: string;
  bottomBarBorder: string;
  bottomBarActive: string;
  bottomBarActiveText: string;
  bottomBarInactive: string;
  chipActiveBg: string;
  chipActiveText: string;
  chipInactiveBg: string;
  chipInactiveText: string;
  heroCardBg: string;
  heroCardText: string;
  heroCardSubtext: string;
  heroCardBorder: string;
  heroCardButton: string;
  heroCardButtonText: string;
  starColor: string;
  pickupDot: string;
  dropoffDot: string;
  pillTagBg: string;
  pillTagText: string;
}

export const lightTheme: ThemeColors = {
  mode: 'light',
  background: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  surfaceBorder: '#E5E7EB',
  surfaceCard: '#FFFFFF',
  surfaceInput: '#F5F6F9',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryForeground: '#FFFFFF',
  primaryGradient: ['#FF6B00', '#FF8533'],
  headerGradient: ['#FF6A00', '#FFA048', '#FFDEC2'],
  accent: '#FF7A00',
  accentSoft: '#FFF3E8',
  verifiedBadge: '#059669',
  verifiedBadgeBg: '#ECFDF5',
  cardShadow: 'rgba(0, 0, 0, 0.05)',
  statusSuccess: '#10B981',
  statusWarning: '#F59E0B',
  statusDanger: '#EF4444',
  bottomBarBackground: '#FFFFFF',
  bottomBarBorder: '#E5E7EB',
  bottomBarActive: '#111827',
  bottomBarActiveText: '#FFFFFF',
  bottomBarInactive: '#9CA3AF',
  chipActiveBg: '#111827',
  chipActiveText: '#FFFFFF',
  chipInactiveBg: '#F3F4F6',
  chipInactiveText: '#4B5563',
  heroCardBg: '#FFFFFF',
  heroCardText: '#111827',
  heroCardSubtext: '#6B7280',
  heroCardBorder: '#E5E7EB',
  heroCardButton: '#111827',
  heroCardButtonText: '#FFFFFF',
  starColor: '#F59E0B',
  pickupDot: '#FF6B00',
  dropoffDot: '#111827',
  pillTagBg: '#F3F4F6',
  pillTagText: '#4B5563',
};

export const darkTheme: ThemeColors = {
  mode: 'dark',
  background: '#0A0B0E',
  surface: '#18191E',
  surfaceSecondary: '#22232A',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  surfaceCard: '#18191E',
  surfaceInput: '#18191E',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#64748B',
  primary: '#FFFFFF',
  primaryForeground: '#0A0B0E',
  primaryGradient: ['#FFFFFF', '#E4E4E7'],
  headerGradient: ['#0A0B0E', '#0A0B0E', '#0A0B0E'],
  accent: '#FFFFFF',
  accentSoft: 'rgba(255, 255, 255, 0.08)',
  verifiedBadge: '#FFFFFF',
  verifiedBadgeBg: '#22232A',
  cardShadow: 'rgba(0, 0, 0, 0.7)',
  statusSuccess: '#10B981',
  statusWarning: '#F5B800',
  statusDanger: '#EF4444',
  bottomBarBackground: '#18191E',
  bottomBarBorder: 'rgba(255, 255, 255, 0.08)',
  bottomBarActive: '#FFFFFF',
  bottomBarActiveText: '#0A0B0E',
  bottomBarInactive: '#71717A',
  chipActiveBg: '#FFFFFF',
  chipActiveText: '#0A0B0E',
  chipInactiveBg: '#18191E',
  chipInactiveText: '#9CA3AF',
  heroCardBg: '#FFFFFF',
  heroCardText: '#111827',
  heroCardSubtext: '#6B7280',
  heroCardBorder: '#FFFFFF',
  heroCardButton: '#0A0B0E',
  heroCardButtonText: '#FFFFFF',
  starColor: '#F5B800',
  pickupDot: '#F5B800',
  dropoffDot: '#FFFFFF',
  pillTagBg: '#25262E',
  pillTagText: '#9CA3AF',
};

export const NigerianCorridors = [
  {
    id: 'corridor-1',
    from: 'Berger Bus Stop, Lagos',
    to: 'Victoria Island / Lekki',
    priceKobo: 200000,
    priceNaira: '₦2,000',
    distanceKm: 32,
    landmarks: ['Oando Berger', 'Maryland Mall', 'Falomo Roundabout', 'Admiralty Way'],
  },
  {
    id: 'corridor-2',
    from: 'Ikorodu Garage, Lagos',
    to: 'CMS / Marina, Lagos Island',
    priceKobo: 180000,
    priceNaira: '₦1,800',
    distanceKm: 36,
    landmarks: ['Ikorodu BRT Terminal', 'Ojota Bus Stop', 'Yaba Tech', 'CMS Marina'],
  },
  {
    id: 'corridor-3',
    from: 'Ajah / Sangotedo',
    to: 'Ikoyi / Victoria Island',
    priceKobo: 150000,
    priceNaira: '₦1,500',
    distanceKm: 26,
    landmarks: ['Shoprite Sangotedo', 'Ajah Under Bridge', 'Jakande Lekki', 'Lekki Toll Gate'],
  },
  {
    id: 'corridor-4',
    from: 'Kubwa / Gwarinpa',
    to: 'Central Business District (CBD), Abuja',
    priceKobo: 120000,
    priceNaira: '₦1,200',
    distanceKm: 22,
    landmarks: ['Kubwa Bridge', 'Gwarinpa 1st Avenue', 'Wuse 2 Zone 4', 'Federal Secretariat'],
  },
  {
    id: 'corridor-5',
    from: 'Lagos (Berger Interchange)',
    to: 'Ibadan (Iwo Road / Challenge)',
    priceKobo: 450000,
    priceNaira: '₦4,500',
    distanceKm: 128,
    landmarks: ['Berger Oando', 'Sagamu Interchange', 'Challenge Ibadan', 'Iwo Road Terminal'],
  },
];
