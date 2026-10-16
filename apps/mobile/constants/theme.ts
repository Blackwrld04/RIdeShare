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

export interface NigerianCorridor {
  id: string;
  from: string;
  to: string;
  priceKobo: number;
  priceNaira: string;
  distanceKm: number;
  landmarks: string[];
}

export const OSUN_CORRIDORS: NigerianCorridor[] = [
  {
    id: 'corridor-osun-1',
    from: 'Olaiya Flyover (Osogbo)',
    to: 'Mayfair / OAU Gate (Ile-Ife)',
    priceKobo: 120000,
    priceNaira: '₦1,200',
    distanceKm: 42,
    landmarks: ['Olaiya Flyover', 'Abere Secretariat', 'Gbongan Interchange', 'Mayfair Roundabout'],
  },
  {
    id: 'corridor-osun-2',
    from: 'Oke-Fia / Old Garage (Osogbo)',
    to: 'Federal Poly / Adeleke Univ (Ede)',
    priceKobo: 60000,
    priceNaira: '₦600',
    distanceKm: 18,
    landmarks: ['Old Garage MDS', 'Oke-Fia Bus Stop', 'Aregbe Junction', 'Federal Poly Gate'],
  },
  {
    id: 'corridor-osun-3',
    from: 'Ilesa Central Roundabout',
    to: 'Osun State Secretariat (Abere, Osogbo)',
    priceKobo: 80000,
    priceNaira: '₦800',
    distanceKm: 31,
    landmarks: ['Wesley Guild Hospital', 'Ilesa Roundabout', 'Iperindo Junction', 'Abere Secretariat'],
  },
  {
    id: 'corridor-osun-4',
    from: 'Osogbo (Olaiya Flyover)',
    to: 'Ibadan (Iwo Road Interchange)',
    priceKobo: 220000,
    priceNaira: '₦2,200',
    distanceKm: 95,
    landmarks: ['Olaiya Flyover', 'Gbongan Express', 'Ikire Toll', 'Iwo Road Ibadan'],
  },
  {
    id: 'corridor-osun-5',
    from: 'Ile-Ife (Mayfair Roundabout)',
    to: 'Lagos (Berger Bus Stop)',
    priceKobo: 450000,
    priceNaira: '₦4,500',
    distanceKm: 210,
    landmarks: ['Mayfair Ife', 'Ife Grand Resort', 'Sagamu Interchange', 'Berger Lagos'],
  },
];

export const LAGOS_CORRIDORS: NigerianCorridor[] = [
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
    id: 'corridor-lag-ibd',
    from: 'Lagos (Berger Interchange)',
    to: 'Ibadan (Iwo Road Interchange)',
    priceKobo: 250000,
    priceNaira: '₦2,500',
    distanceKm: 128,
    landmarks: ['Berger Oando', 'Sagamu Interchange', 'Challenge Ibadan', 'Iwo Road Terminal'],
  },
  {
    id: 'corridor-lag-vi',
    from: 'Ikeja City Mall (Alausa)',
    to: 'Victoria Island (Eko Hotel)',
    priceKobo: 150000,
    priceNaira: '₦1,500',
    distanceKm: 22,
    landmarks: ['Alausa Secretariat', 'Maryland Mall', 'Eko Bridge', 'Eko Hotel VI'],
  },
];

export const ABUJA_CORRIDORS: NigerianCorridor[] = [
  {
    id: 'corridor-abj-1',
    from: 'Kubwa / Gwarinpa',
    to: 'Central Business District (CBD), Abuja',
    priceKobo: 120000,
    priceNaira: '₦1,200',
    distanceKm: 22,
    landmarks: ['Kubwa Bridge', 'Gwarinpa 1st Avenue', 'Wuse 2 Zone 4', 'Federal Secretariat'],
  },
  {
    id: 'corridor-abj-2',
    from: 'Lugbe (Airport Road)',
    to: 'Area 1 / Central Area, Abuja',
    priceKobo: 100000,
    priceNaira: '₦1,000',
    distanceKm: 18,
    landmarks: ['Lugbe Total', 'Games Village', 'City Gate', 'Area 1 Flyover'],
  },
  {
    id: 'corridor-abj-3',
    from: 'Nyanya / Mararaba',
    to: 'Wuse 2 / Maitama',
    priceKobo: 100000,
    priceNaira: '₦1,000',
    distanceKm: 24,
    landmarks: ['Nyanya Bridge', 'Ado Junction', 'Mogadishu Barracks', 'Wuse 2'],
  },
  {
    id: 'corridor-abj-kad',
    from: 'Abuja (Zuba / Berger)',
    to: 'Kaduna (Command Junction)',
    priceKobo: 350000,
    priceNaira: '₦3,500',
    distanceKm: 190,
    landmarks: ['Zuba Interchange', 'Suleja Toll', 'Jere Junction', 'Command Junction'],
  },
];

export const NigerianCorridors = LAGOS_CORRIDORS;

export function getCorridorsForState(stateName: string = 'Lagos'): NigerianCorridor[] {
  const norm = (stateName || 'Lagos').trim().toLowerCase();
  if (norm === 'osun') {
    return OSUN_CORRIDORS;
  }
  if (norm === 'fct abuja' || norm === 'abuja') {
    return ABUJA_CORRIDORS;
  }
  if (norm === 'lagos') {
    return LAGOS_CORRIDORS;
  }
  if (norm === 'oyo') {
    return [
      {
        id: 'corridor-oyo-1',
        from: 'Challenge / Ring Road (Ibadan)',
        to: 'Iwo Road Interchange (Ibadan)',
        priceKobo: 100000,
        priceNaira: '₦1,000',
        distanceKm: 16,
        landmarks: ['Challenge Terminal', 'Toll Gate', 'Bodija', 'Iwo Road'],
      },
      {
        id: 'corridor-oyo-2',
        from: 'UI (University of Ibadan)',
        to: 'Dugbe / Cocoa House',
        priceKobo: 80000,
        priceNaira: '₦800',
        distanceKm: 12,
        landmarks: ['UI Main Gate', 'Samonda', 'Mokola Roundabout', 'Dugbe'],
      },
      {
        id: 'corridor-oyo-3',
        from: 'Ibadan (Iwo Road Interchange)',
        to: 'Osogbo (Olaiya Flyover)',
        priceKobo: 220000,
        priceNaira: '₦2,200',
        distanceKm: 95,
        landmarks: ['Iwo Road Express', 'Ikire Toll', 'Gbongan Interchange', 'Olaiya Flyover'],
      },
      {
        id: 'corridor-oyo-4',
        from: 'Ibadan (Challenge Interchange)',
        to: 'Lagos (Berger Bus Stop)',
        priceKobo: 250000,
        priceNaira: '₦2,500',
        distanceKm: 128,
        landmarks: ['Challenge Ibadan', 'Sagamu Interchange', 'Mowe', 'Berger Lagos'],
      },
    ];
  }

  // Dynamic fallback for other states
  return [
    {
      id: `corridor-${norm}-1`,
      from: `${stateName} Central Motor Park`,
      to: `${stateName} City Commercial Hub`,
      priceKobo: 120000,
      priceNaira: '₦1,200',
      distanceKm: 25,
      landmarks: [`${stateName} Central Hub`, `${stateName} Secretariat`, `${stateName} Commercial Hub`],
    },
    {
      id: `corridor-${norm}-2`,
      from: `${stateName} State Secretariat`,
      to: `${stateName} University Campus Gate`,
      priceKobo: 80000,
      priceNaira: '₦800',
      distanceKm: 15,
      landmarks: [`${stateName} Secretariat`, `${stateName} High Court`, `${stateName} Campus`],
    },
    {
      id: `corridor-${norm}-3`,
      from: `${stateName} Main Interchange`,
      to: `Ibadan / Lagos Federal Highway Corridor`,
      priceKobo: 350000,
      priceNaira: '₦3,500',
      distanceKm: 160,
      landmarks: [`${stateName} Main Interchange`, 'State Bypass', 'Federal Highway Gateway'],
    },
  ];
}
