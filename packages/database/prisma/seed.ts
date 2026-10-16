import "dotenv/config";
import { createDatabase, RideStatus, RidePointKind, DriverApplicationStatus, BankAccountStatus, ProfileGender } from "../src/index.js";

async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://commuteshare:commuteshare@localhost:5435/commuteshare?schema=public";
  console.log(`Connecting to database at ${connectionString}...`);
  const db = createDatabase(connectionString);

  try {
    console.log("Seeding Safe Landmarks...");
    const landmarks = [
      {
        name: "Oando Filling Station Berger",
        address: "Lagos-Ibadan Expressway, Berger, Lagos",
        category: "FUEL_STATION",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.6521,
        longitude: 3.3591,
      },
      {
        name: "Maryland Mall",
        address: "Ikorodu Road, Maryland, Lagos",
        category: "SHOPPING_MALL",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.5721,
        longitude: 3.3681,
      },
      {
        name: "Oriental Hotel Lekki",
        address: "3 Lekki - Epe Expressway, Victoria Island, Lagos",
        category: "HOTEL",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.4351,
        longitude: 3.4411,
      },
      {
        name: "Ebeano Supermarket Lekki Phase 1",
        address: "Admiralty Way, Lekki Phase 1, Lagos",
        category: "SUPERMARKET",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.4281,
        longitude: 3.4219,
      },
      {
        name: "Ikorodu Garage Terminal",
        address: "Sagamu Road, Ikorodu, Lagos",
        category: "BRT_TERMINAL",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.6194,
        longitude: 3.5105,
      },
      {
        name: "CMS Bus Stop Marina",
        address: "Marina, Lagos Island, Lagos",
        category: "BRT_TERMINAL",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.4531,
        longitude: 3.3882,
      },
      {
        name: "Shoprite Sangotedo",
        address: "Novare Lekki Mall, Sangotedo, Lagos",
        category: "SHOPPING_MALL",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.4674,
        longitude: 3.5684,
      },
      {
        name: "Awolowo Road Ikoyi",
        address: "Awolowo Road, Ikoyi, Lagos",
        category: "COMMERCIAL_HUB",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.4474,
        longitude: 3.4326,
      },
      {
        name: "Kubwa Total Station",
        address: "Kubwa Expressway, Kubwa, Abuja",
        category: "FUEL_STATION",
        city: "Abuja",
        state: "FCT",
        latitude: 9.1538,
        longitude: 7.322,
      },
      {
        name: "Central Business District Metro",
        address: "Shehu Shagari Way, Central Business District, Abuja",
        category: "METRO_STATION",
        city: "Abuja",
        state: "FCT",
        latitude: 9.0579,
        longitude: 7.4951,
      },
    ];

    const createdLandmarks: Record<string, string> = {};
    for (const lm of landmarks) {
      const existing = await db.client.safeLandmark.findFirst({
        where: { name: lm.name },
      });
      if (existing) {
        createdLandmarks[lm.name] = existing.id;
      } else {
        const created = await db.client.safeLandmark.create({
          data: {
            name: lm.name,
            address: lm.address,
            category: lm.category,
            city: lm.city,
            state: lm.state,
            latitude: lm.latitude,
            longitude: lm.longitude,
          },
        });
        createdLandmarks[lm.name] = created.id;
      }
    }
    console.log("Safe landmarks created.");

    console.log("Seeding Verified Drivers...");
    // Driver 1: Olajide
    const driverPhone1 = "+2348011112222";
    let driverUser1 = await db.client.user.findUnique({
      where: { phoneE164: driverPhone1 },
    });
    if (!driverUser1) {
      driverUser1 = await db.client.user.create({
        data: {
          phoneE164: driverPhone1,
          phoneVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: "Olajide Abdulquadri",
              gender: ProfileGender.MAN,
              bio: "Senior corporate accountant. Commuting daily from Berger to VI via 3rd Mainland Bridge.",
            },
          },
        },
      });
    }

    let driverApp1 = await db.client.driverApplication.findUnique({
      where: { userId: driverUser1.id },
    });
    if (!driverApp1) {
      driverApp1 = await db.client.driverApplication.create({
        data: {
          userId: driverUser1.id,
          status: DriverApplicationStatus.APPROVED,
          legalFirstName: "Olajide",
          legalLastName: "Abdulquadri",
          residentialAddress: "Magodo Phase 2, Lagos",
          city: "Lagos",
          state: "Lagos",
          submittedAt: new Date(),
          reviewedAt: new Date(),
          vehicle: {
            create: {
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              color: "Silver",
              registrationNumber: "LAG-492-AA",
              seatCapacity: 4,
            },
          },
          bankAccount: {
            create: {
              bankCode: "058",
              bankName: "Guaranty Trust Bank",
              accountName: "OLAJIDE ABDULQUADRI",
              accountNumberLast4: "6789",
              providerRecipientCode: "RCP_gtb12345",
              status: BankAccountStatus.VERIFIED,
              resolvedAt: new Date(),
            },
          },
        },
      });
    }

    // Driver 2: Fatima (Female Driver)
    const driverPhone2 = "+2348022223333";
    let driverUser2 = await db.client.user.findUnique({
      where: { phoneE164: driverPhone2 },
    });
    if (!driverUser2) {
      driverUser2 = await db.client.user.create({
        data: {
          phoneE164: driverPhone2,
          phoneVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: "Fatima Sanusi",
              gender: ProfileGender.WOMAN,
              bio: "Product Manager in tech. Clean ride with AC, smooth highway corridor commute.",
            },
          },
        },
      });
    }

    let driverApp2 = await db.client.driverApplication.findUnique({
      where: { userId: driverUser2.id },
    });
    if (!driverApp2) {
      driverApp2 = await db.client.driverApplication.create({
        data: {
          userId: driverUser2.id,
          status: DriverApplicationStatus.APPROVED,
          legalFirstName: "Fatima",
          legalLastName: "Sanusi",
          residentialAddress: "Sangotedo, Ajah, Lagos",
          city: "Lagos",
          state: "Lagos",
          submittedAt: new Date(),
          reviewedAt: new Date(),
          vehicle: {
            create: {
              make: "Hyundai",
              model: "Elantra",
              year: 2021,
              color: "Dark Grey",
              registrationNumber: "ABJ-771-BK",
              seatCapacity: 4,
            },
          },
          bankAccount: {
            create: {
              bankCode: "057",
              bankName: "Zenith Bank",
              accountName: "FATIMA SANUSI",
              accountNumberLast4: "5566",
              providerRecipientCode: "RCP_zenith6789",
              status: BankAccountStatus.VERIFIED,
              resolvedAt: new Date(),
            },
          },
        },
      });
    }

    console.log("Seeding Rides...");
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const ridesToCreate = [
      {
        driverAppId: driverApp1.id,
        departureAt: tomorrow,
        passengerSeats: 6,
        contributionKobo: 200000n, // ₦2,000
        womenOnly: false,
        notes: "Departure sharp 6:30 AM from Oando Berger. AC on full, Third Mainland Bridge express.",
        origin: {
          label: "Berger Bus Stop, Lagos",
          address: "Lagos-Ibadan Expressway, Berger, Lagos",
          latitude: 6.6521,
          longitude: 3.3591,
          landmarkId: createdLandmarks["Oando Filling Station Berger"],
        },
        waypoint: {
          label: "Maryland Mall, Lagos",
          address: "Ikorodu Road, Maryland, Lagos",
          latitude: 6.5721,
          longitude: 3.3681,
          landmarkId: createdLandmarks["Maryland Mall"],
        },
        destination: {
          label: "Admiralty Way, Lekki Phase 1",
          address: "Admiralty Way, Lekki Phase 1, Lagos",
          latitude: 6.4281,
          longitude: 3.4219,
          landmarkId: createdLandmarks["Ebeano Supermarket Lekki Phase 1"],
        },
        pathPoints: [
          [3.3591, 6.6521],
          [3.3681, 6.5721],
          [3.3882, 6.4531],
          [3.4411, 6.4351],
          [3.4219, 6.4281],
        ],
        distanceMeters: 34500,
        durationSeconds: 3600,
      },
      {
        driverAppId: driverApp1.id,
        departureAt: dayAfter,
        passengerSeats: 3,
        contributionKobo: 180000n, // ₦1,800
        womenOnly: false,
        notes: "Morning rush commute straight to Marina CMS. No delays.",
        origin: {
          label: "Ikorodu Garage, Lagos",
          address: "Sagamu Road, Ikorodu, Lagos",
          latitude: 6.6194,
          longitude: 3.5105,
          landmarkId: createdLandmarks["Ikorodu Garage Terminal"],
        },
        waypoint: {
          label: "Maryland Mall, Lagos",
          address: "Ikorodu Road, Maryland, Lagos",
          latitude: 6.5721,
          longitude: 3.3681,
          landmarkId: createdLandmarks["Maryland Mall"],
        },
        destination: {
          label: "CMS Bus Stop, Marina",
          address: "Marina, Lagos Island, Lagos",
          latitude: 6.4531,
          longitude: 3.3882,
          landmarkId: createdLandmarks["CMS Bus Stop Marina"],
        },
        pathPoints: [
          [3.5105, 6.6194],
          [3.3681, 6.5721],
          [3.3882, 6.4531],
        ],
        distanceMeters: 36200,
        durationSeconds: 4200,
      },
      {
        driverAppId: driverApp2.id,
        departureAt: tomorrow,
        passengerSeats: 3,
        contributionKobo: 150000n, // ₦1,500
        womenOnly: true,
        notes: "Women-only commute. Smooth ride with pleasant music, Ajah to Ikoyi via toll gate.",
        origin: {
          label: "Shoprite Sangotedo, Lagos",
          address: "Novare Lekki Mall, Sangotedo, Lagos",
          latitude: 6.4674,
          longitude: 3.5684,
          landmarkId: createdLandmarks["Shoprite Sangotedo"],
        },
        waypoint: {
          label: "Oriental Hotel Lekki",
          address: "3 Lekki - Epe Expressway, Victoria Island, Lagos",
          latitude: 6.4351,
          longitude: 3.4411,
          landmarkId: createdLandmarks["Oriental Hotel Lekki"],
        },
        destination: {
          label: "Awolowo Road, Ikoyi",
          address: "Awolowo Road, Ikoyi, Lagos",
          latitude: 6.4474,
          longitude: 3.4326,
          landmarkId: createdLandmarks["Awolowo Road Ikoyi"],
        },
        pathPoints: [
          [3.5684, 6.4674],
          [3.4411, 6.4351],
          [3.4326, 6.4474],
        ],
        distanceMeters: 28000,
        durationSeconds: 3000,
      },
      {
        driverAppId: driverApp2.id,
        departureAt: dayAfter,
        passengerSeats: 3,
        contributionKobo: 120000n, // ₦1,200
        womenOnly: false,
        notes: "Abuja corridor: Kubwa Expressway straight to Federal Secretariat and CBD.",
        origin: {
          label: "Kubwa Total Station, Abuja",
          address: "Kubwa Expressway, Kubwa, Abuja",
          latitude: 9.1538,
          longitude: 7.322,
          landmarkId: createdLandmarks["Kubwa Total Station"],
        },
        waypoint: null,
        destination: {
          label: "CBD Metro Station, Abuja",
          address: "Shehu Shagari Way, Central Business District, Abuja",
          latitude: 9.0579,
          longitude: 7.4951,
          landmarkId: createdLandmarks["Central Business District Metro"],
        },
        pathPoints: [
          [7.322, 9.1538],
          [7.4951, 9.0579],
        ],
        distanceMeters: 22000,
        durationSeconds: 1800,
      },
    ];

    for (const r of ridesToCreate) {
      const ride = await db.client.rideOffer.create({
        data: {
          driverApplicationId: r.driverAppId,
          status: RideStatus.PUBLISHED,
          departureAt: r.departureAt,
          timezone: "Africa/Lagos",
          passengerSeats: r.passengerSeats,
          contributionKobo: r.contributionKobo,
          currency: "NGN",
          womenOnly: r.womenOnly,
          notes: r.notes,
          routeDistanceMeters: r.distanceMeters,
          routeDurationSeconds: r.durationSeconds,
          routingSource: "osrm",
          routingProfile: "driving",
          routePath: r.pathPoints.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
          publishedAt: new Date(),
          routePoints: {
            create: [
              {
                sequence: 0,
                kind: RidePointKind.ORIGIN,
                label: r.origin.label,
                address: r.origin.address,
                latitude: r.origin.latitude,
                longitude: r.origin.longitude,
                safeLandmarkId: r.origin.landmarkId,
              },
              ...(r.waypoint
                ? [
                    {
                      sequence: 1,
                      kind: RidePointKind.WAYPOINT,
                      label: r.waypoint.label,
                      address: r.waypoint.address,
                      latitude: r.waypoint.latitude,
                      longitude: r.waypoint.longitude,
                      safeLandmarkId: r.waypoint.landmarkId,
                    },
                  ]
                : []),
              {
                sequence: r.waypoint ? 2 : 1,
                kind: RidePointKind.DESTINATION,
                label: r.destination.label,
                address: r.destination.address,
                latitude: r.destination.latitude,
                longitude: r.destination.longitude,
                safeLandmarkId: r.destination.landmarkId,
              },
            ],
          },
        },
      });

      // Build WKT for LineString
      const wktPoints = r.pathPoints.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
      await db.client.$executeRawUnsafe(`
        UPDATE ride_offers
        SET route_corridor = ST_SetSRID(ST_GeomFromText('LINESTRING(${wktPoints})'), 4326)
        WHERE id = '${ride.id}'::uuid
      `);


      console.log(`Created & Published ride: ${r.origin.label} -> ${r.destination.label} (${ride.id})`);
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
