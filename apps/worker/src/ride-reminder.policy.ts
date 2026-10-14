export interface ReminderRide {
  id: string;
  departureAt: Date;
  driverUserId: string;
  passengerUserIds: string[];
  originLabel: string;
  destinationLabel: string;
}

export interface ReminderNotification {
  userId: string;
  kind: string;
  title: string;
  body: string;
  data: {
    rideId: string;
    departureAt: string;
    reminder: string;
  };
  idempotencyKey: string;
}

export function buildRideReminderNotifications(
  rides: ReminderRide[],
  now = new Date(),
): ReminderNotification[] {
  return rides.flatMap((ride) => {
    const millisecondsUntilDeparture =
      ride.departureAt.getTime() - now.getTime();

    if (
      millisecondsUntilDeparture <= 0 ||
      millisecondsUntilDeparture > 24 * 60 * 60 * 1_000
    ) {
      return [];
    }

    const reminder =
      millisecondsUntilDeparture <= 60 * 60 * 1_000 ? "1h" : "24h";
    const windowLabel = reminder === "1h" ? "one hour" : "24 hours";
    const recipients = new Set([ride.driverUserId, ...ride.passengerUserIds]);

    return [...recipients].map((userId) => ({
      userId,
      kind: "ride_reminder",
      title: "Upcoming ride",
      body: `${ride.originLabel} to ${ride.destinationLabel} departs within ${windowLabel}`,
      data: {
        rideId: ride.id,
        departureAt: ride.departureAt.toISOString(),
        reminder,
      },
      idempotencyKey: `ride:${ride.id}:reminder:${reminder}:user:${userId}`,
    }));
  });
}
