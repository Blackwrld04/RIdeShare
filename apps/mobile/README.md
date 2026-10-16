# RideShare Nigeria — Mobile App (React Native & Expo Go)

RideShare Nigeria is a corridor-matched carpooling mobile application localized for Nigerian commuters (Lagos corridors e.g., Berger $\leftrightarrow$ Lekki, Ikorodu $\leftrightarrow$ CMS, Ajah $\leftrightarrow$ Ikoyi; Abuja corridors e.g., Kubwa $\leftrightarrow$ CBD; Intercity e.g., Lagos $\leftrightarrow$ Ibadan).

---

## 🚀 How to Run with Expo Go on Android

### 1. Ensure your phone and development machine are on the same Wi-Fi network
Ensure your phone running the **Expo Go** app and your computer are connected to the same Wi-Fi router (or use mobile hotspot).

### 2. Start the Expo Development Server
From the root of the repository or from `apps/mobile`:

```bash
# Option A: From root directory
npm run dev:mobile

# Option B: Directly from apps/mobile
cd apps/mobile
npx expo start
```

### 3. Open in Expo Go on Android
1. Open the **Expo Go** app on your Android phone.
2. Tap **"Scan QR code"** and point your camera at the QR code displayed in your terminal.
3. The bundle will load and the RideShare app will launch!

---

## 🎨 Dual Theme Design System (Warm Sunrise & Vanta Dark)
- **Vanta Dark**: Deep obsidian canvas (`#090A0E`), dark slate cards (`#14161F` / `#1C1F2B`), emerald verified trust badges, amber highlights.
- **Warm Sunrise Light**: Radiant sunset header gradient (`#FF6A00` to `#FFA048`), clean white cards, dark typography.
- **Theme Toggle**: Switch between Light and Dark mode instantly using the Moon/Sun toggle in the top header or in the Profile tab.

---

## 📱 Implemented Screens & Features

1. **Onboarding Carousel (`/onboarding`)**:
   - 3-slide visual onboarding matching sample screens (*Track Your Driver Live Now*, *Request Your Ride in Seconds*, *Your City, One Tap Away*).
   - Bottom pill CTA button with orange arrow circle.

2. **Phone Number OTP Verification (`/auth/otp`)**:
   - Nigerian `+234` phone format.
   - 6-digit Termii SMS OTP input with 60-second cooldown timer.
   - Test PIN in sandbox: `000000`.

3. **Home & Corridor Discovery (`/(tabs)/index`)**:
   - Warm sunset header with location dropdown (`Berger Bus Stop, Lagos ⌄`).
   - Mode switcher: *Ride (Leaves in 15m)* vs *Schedule (Workday Commute)*.
   - Route Search Card with Origin/Destination, 1-tap `↑↓` Swap, Date & Seats selector, and Safe Meeting Hub.
   - High-volume Nigerian highway corridors: Berger $\rightarrow$ VI (`₦2,000`), Ikorodu $\rightarrow$ CMS (`₦1,800`), Ajah $\rightarrow$ Ikoyi (`₦1,500`), Kubwa $\rightarrow$ CBD (`₦1,200`).
   - Verified Rides feed with driver avatars, ratings, and vehicle models.

4. **Corridor Search & Date Strip (`/(tabs)/search`)**:
   - Date calendar horizontal strip (`TUE 16`, `WED 17`, `THU 18`...).
   - Filters: *All Corridors*, *Cheapest*, *Fastest Lane*, *Women-Only*.
   - PostGIS 5km corridor distance matching.

5. **Triple-Tab Trip Tracker & Safety Cockpit (`/(tabs)/trips`)**:
   - Tabs: `UPCOMING` | `PAST` | `CANCELLED`.
   - Active ride status progression: `[Booked ✓] ──▶ [Confirmed ✓] ──▶ [In Transit ●]`.
   - Driver & car details (`Silver Toyota Corolla LAG-492-AA`).
   - One-tap WhatsApp Live Trip Share.
   - Emergency SOS: Dial 112 / 767 dispatch.

6. **Ride Details & Cashless Escrow Checkout (`/rides/[id]`)**:
   - Waypoints timeline with safe landmark meeting hubs (e.g. Oando Berger $\rightarrow$ Ebeano Lekki 1).
   - Paystack 100% Cashless Escrow cost breakdown:
     - Base Contribution: `₦2,000`
     - Platform Escrow Fee (15%): `₦300`
     - Total Escrow Hold: `₦2,300`
   - Payment channels: Debit Card, Bank Transfer, USSD.

7. **Pickup Tracking & Live ETA (`/tracking/[id]`)**:
   - Route map with simulated driver vehicle puck and highway line.
   - Live ETA pill: *"The driver will arrive in... 5min"*.
   - Driver profile with direct Call and In-App Message buttons.
   - *"End Ride & Release Escrow"* settlement trigger.

8. **In-App Real-Time Chat (`/chat/[bookingId]`)**:
   - Direct message bubbles matching the design inspiration.
   - Automated anti-scam word filter (blocks off-platform cash diversion).
   - Quick-reply transit shortcuts.

9. **Profile & Trust Cockpit (`/(tabs)/profile`)**:
   - NIMC National Identification Number (NIN) verified badge with last 4 digits.
   - Driver mode switch (FRSC driver license verification & vehicle info).
   - Paystack NUBAN bank resolution check.
   - Emergency SOS contacts list.
