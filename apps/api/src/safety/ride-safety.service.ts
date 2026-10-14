import type { AppConfig } from "@commuteshare/config";
import { Prisma } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import {
  canCreateTripShare,
  canRecordTripLocation,
  canTriggerSos,
  isSafetyParticipant,
  SAFETY_PARTICIPANT_BOOKING_STATUSES,
} from "./safety.policy.js";
import type {
  CreateShareLinkInput,
  CreateSosAlertInput,
  LocationPingInput,
  ResolveSosAlertInput,
} from "./safety.schemas.js";
import {
  createSafetyShareToken,
  digestSafetyShareToken,
} from "./safety-token.js";

const rideParticipationSelect = {
  id: true,
  status: true,
  departureAt: true,
  timezone: true,
  driverApplication: {
    select: {
      userId: true,
      user: { select: { profile: { select: { displayName: true } } } },
    },
  },
  bookings: {
    where: { status: { in: [...SAFETY_PARTICIPANT_BOOKING_STATUSES] } },
    select: {
      id: true,
      passengerUserId: true,
      status: true,
      passenger: {
        select: { profile: { select: { displayName: true } } },
      },
    },
  },
} satisfies Prisma.RideOfferSelect;

const alertSelect = {
  id: true,
  rideOfferId: true,
  bookingId: true,
  initiatedByUserId: true,
  clientAlertId: true,
  status: true,
  latitude: true,
  longitude: true,
  accuracyMeters: true,
  message: true,
  emergencyNumber: true,
  resolvedAt: true,
  resolutionNote: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SafetyAlertSelect;

type RideParticipationRecord = Prisma.RideOfferGetPayload<{
  select: typeof rideParticipationSelect;
}>;
type AlertRecord = Prisma.SafetyAlertGetPayload<{ select: typeof alertSelect }>;
type SafetyDatabaseClient = Pick<Prisma.TransactionClient, "rideOffer">;

interface Participation extends RideParticipationRecord {
  isDriver: boolean;
  bookingId: string | null;
}

export interface LocationPingResponse {
  id: string;
  rideId: string;
  source: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  headingDegrees: number | null;
  speedMetersPerSecond: number | null;
  recordedAt: string;
}

export interface ShareLinkResponse {
  id: string;
  rideId: string;
  label: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedShareLinkResponse extends ShareLinkResponse {
  token: string;
}

export interface PublicTripShareResponse {
  ride: {
    id: string;
    status: string;
    departureAt: string;
    timezone: string;
    route: Array<{
      kind: string;
      label: string;
      latitude: number;
      longitude: number;
    }>;
  };
  participant: {
    displayName: string | null;
    role: "driver" | "passenger";
  };
  latestLocation: LocationPingResponse | null;
  expiresAt: string;
}

export interface SafetyAlertResponse {
  id: string;
  rideId: string;
  bookingId: string | null;
  status: string;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
  };
  message: string | null;
  emergencyNumber: string;
  dispatchStatus: "NOT_DISPATCHED";
  emergencyContacts: Array<{
    id: string;
    name: string;
    phoneE164: string;
    relationship: string | null;
    isPrimary: boolean;
  }>;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RideSafetyService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async createShareLink(
    userId: string,
    rideId: string,
    input: CreateShareLinkInput,
  ): Promise<CreatedShareLinkResponse> {
    const participation = await this.requireParticipant(userId, rideId);
    if (!canCreateTripShare(participation.status)) {
      throw new ConflictException("Trip sharing is unavailable for this ride");
    }
    if (input.expiresInHours > this.config.SAFETY_SHARE_MAX_HOURS) {
      throw new BadRequestException(
        `Share links may last at most ${this.config.SAFETY_SHARE_MAX_HOURS} hours`,
      );
    }
    const token = createSafetyShareToken();
    const link = await this.database.client.rideShareLink.create({
      data: {
        rideOfferId: rideId,
        createdByUserId: userId,
        tokenDigest: digestSafetyShareToken(token),
        ...(input.label ? { label: input.label } : {}),
        expiresAt: new Date(
          Date.now() + input.expiresInHours * 60 * 60 * 1_000,
        ),
      },
    });
    return { ...this.toShareLink(link), token };
  }

  async listShareLinks(
    userId: string,
    rideId: string,
  ): Promise<ShareLinkResponse[]> {
    await this.requireParticipant(userId, rideId);
    const links = await this.database.client.rideShareLink.findMany({
      where: { rideOfferId: rideId, createdByUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return links.map((link) => this.toShareLink(link));
  }

  async revokeShareLink(userId: string, linkId: string): Promise<void> {
    const revoked = await this.database.client.rideShareLink.updateMany({
      where: { id: linkId, createdByUserId: userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      throw new NotFoundException("Active share link not found");
    }
  }

  async getPublicShare(token: string): Promise<PublicTripShareResponse> {
    const link = await this.database.client.rideShareLink.findUnique({
      where: { tokenDigest: digestSafetyShareToken(token) },
      include: {
        createdBy: {
          select: { profile: { select: { displayName: true } } },
        },
        rideOffer: {
          select: {
            id: true,
            status: true,
            departureAt: true,
            timezone: true,
            driverApplication: { select: { userId: true } },
            routePoints: {
              orderBy: { sequence: "asc" },
              select: {
                kind: true,
                label: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });
    if (!link || link.revokedAt || link.expiresAt <= new Date()) {
      throw new NotFoundException("Trip share link not found");
    }
    const latestLocation =
      await this.database.client.rideLocationPing.findFirst({
        where: {
          rideOfferId: link.rideOfferId,
          userId: link.createdByUserId,
        },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
      });

    return {
      ride: {
        id: link.rideOffer.id,
        status: link.rideOffer.status,
        departureAt: link.rideOffer.departureAt.toISOString(),
        timezone: link.rideOffer.timezone,
        route: link.rideOffer.routePoints.map((point) => ({
          kind: point.kind,
          label: point.label,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
        })),
      },
      participant: {
        displayName: link.createdBy.profile?.displayName ?? null,
        role:
          link.rideOffer.driverApplication.userId === link.createdByUserId
            ? "driver"
            : "passenger",
      },
      latestLocation: latestLocation ? this.toLocation(latestLocation) : null,
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  async recordLocation(
    userId: string,
    rideId: string,
    input: LocationPingInput,
  ): Promise<LocationPingResponse> {
    const recordedAt = input.recordedAt
      ? new Date(input.recordedAt)
      : new Date();
    if (Math.abs(recordedAt.getTime() - Date.now()) > 5 * 60 * 1_000) {
      throw new BadRequestException(
        "Location timestamp must be within five minutes of server time",
      );
    }

    const ping = await this.database.client.$transaction(
      async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM ride_offers WHERE id = ${rideId}::uuid FOR UPDATE`,
        );
        const participation = await this.requireParticipant(
          userId,
          rideId,
          transaction,
        );
        if (!canRecordTripLocation(participation.status)) {
          throw new ConflictException(
            "Live location requires a trip in progress",
          );
        }
        const recent = await transaction.rideLocationPing.findFirst({
          where: {
            rideOfferId: rideId,
            userId,
            createdAt: {
              gt: new Date(
                Date.now() -
                  this.config.LOCATION_PING_MIN_INTERVAL_SECONDS * 1_000,
              ),
            },
          },
          select: { id: true },
        });
        if (recent) {
          throw new HttpException(
            "Location updates are too frequent",
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        return this.createLocationPing(
          transaction,
          userId,
          rideId,
          input,
          recordedAt,
        );
      },
    );
    return this.toLocation(ping);
  }

  async createSosAlert(
    userId: string,
    rideId: string,
    input: CreateSosAlertInput,
  ): Promise<SafetyAlertResponse> {
    const duplicate = await this.findAlert(userId, input.clientAlertId);
    if (duplicate) {
      return this.resolveDuplicateAlert(userId, rideId, duplicate);
    }

    try {
      const alert = await this.database.client.$transaction(
        async (transaction) => {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM ride_offers WHERE id = ${rideId}::uuid FOR UPDATE`,
          );
          const participation = await this.requireParticipant(
            userId,
            rideId,
            transaction,
          );
          if (!canTriggerSos(participation.status, participation.departureAt)) {
            throw new ConflictException("SOS is unavailable for this ride");
          }
          const created = await transaction.safetyAlert.create({
            data: {
              rideOfferId: rideId,
              ...(participation.bookingId
                ? { bookingId: participation.bookingId }
                : {}),
              initiatedByUserId: userId,
              clientAlertId: input.clientAlertId,
              latitude: input.latitude,
              longitude: input.longitude,
              ...(input.accuracyMeters !== undefined
                ? { accuracyMeters: input.accuracyMeters }
                : {}),
              ...(input.message ? { message: input.message } : {}),
              emergencyNumber: this.config.EMERGENCY_CALL_NUMBER,
            },
            select: alertSelect,
          });
          await this.createLocationPing(
            transaction,
            userId,
            rideId,
            {
              latitude: input.latitude,
              longitude: input.longitude,
              ...(input.accuracyMeters !== undefined
                ? { accuracyMeters: input.accuracyMeters }
                : {}),
            },
            new Date(),
            "sos",
          );
          const recipients = new Set([
            participation.driverApplication.userId,
            ...participation.bookings.map((booking) => booking.passengerUserId),
          ]);
          recipients.delete(userId);
          if (recipients.size > 0) {
            await transaction.userNotification.createMany({
              data: [...recipients].map((recipientUserId) => ({
                userId: recipientUserId,
                kind: "safety_sos",
                title: "Ride SOS alert",
                body: "A trip participant triggered an SOS alert",
                data: { alertId: created.id, rideId },
                idempotencyKey: `sos:${created.id}:user:${recipientUserId}`,
              })),
              skipDuplicates: true,
            });
          }
          return created;
        },
      );
      return this.toAlertResponse(userId, alert);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.findAlert(userId, input.clientAlertId);
        if (existing) {
          return this.resolveDuplicateAlert(userId, rideId, existing);
        }
      }
      throw error;
    }
  }

  async listAlerts(userId: string): Promise<SafetyAlertResponse[]> {
    const alerts = await this.database.client.safetyAlert.findMany({
      where: { initiatedByUserId: userId },
      select: alertSelect,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const contacts = await this.getEmergencyContacts(userId);
    return alerts.map((alert) => this.formatAlert(alert, contacts));
  }

  async resolveAlert(
    userId: string,
    alertId: string,
    input: ResolveSosAlertInput,
  ): Promise<SafetyAlertResponse> {
    const resolved = await this.database.client.safetyAlert.updateMany({
      where: { id: alertId, initiatedByUserId: userId, status: "ACTIVE" },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNote: input.note,
      },
    });
    if (resolved.count !== 1) {
      throw new NotFoundException("Active SOS alert not found");
    }
    const alert = await this.database.client.safetyAlert.findUniqueOrThrow({
      where: { id: alertId },
      select: alertSelect,
    });
    return this.toAlertResponse(userId, alert);
  }

  private async requireParticipant(
    userId: string,
    rideId: string,
    client: SafetyDatabaseClient = this.database.client,
  ): Promise<Participation> {
    const ride = await client.rideOffer.findUnique({
      where: { id: rideId },
      select: rideParticipationSelect,
    });
    const isDriver = ride?.driverApplication.userId === userId;
    const booking = ride?.bookings.find(
      (item) => item.passengerUserId === userId,
    );
    if (!ride || !isSafetyParticipant(isDriver, booking?.status ?? null)) {
      throw new NotFoundException("Ride safety session not found");
    }
    return { ...ride, isDriver, bookingId: booking?.id ?? null };
  }

  private async createLocationPing(
    transaction: Prisma.TransactionClient,
    userId: string,
    rideId: string,
    input: LocationPingInput,
    recordedAt: Date,
    source = "participant",
  ) {
    const ping = await transaction.rideLocationPing.create({
      data: {
        rideOfferId: rideId,
        userId,
        source,
        latitude: input.latitude,
        longitude: input.longitude,
        ...(input.accuracyMeters !== undefined
          ? { accuracyMeters: input.accuracyMeters }
          : {}),
        ...(input.headingDegrees !== undefined
          ? { headingDegrees: input.headingDegrees }
          : {}),
        ...(input.speedMetersPerSecond !== undefined
          ? { speedMetersPerSecond: input.speedMetersPerSecond }
          : {}),
        recordedAt,
      },
    });
    await transaction.$executeRaw(Prisma.sql`
      UPDATE ride_location_pings
      SET location = ST_SetSRID(
        ST_MakePoint(${input.longitude}, ${input.latitude}),
        4326
      )::geography
      WHERE id = ${ping.id}::uuid
    `);
    return ping;
  }

  private findAlert(
    userId: string,
    clientAlertId: string,
  ): Promise<AlertRecord | null> {
    return this.database.client.safetyAlert.findUnique({
      where: {
        initiatedByUserId_clientAlertId: {
          initiatedByUserId: userId,
          clientAlertId,
        },
      },
      select: alertSelect,
    });
  }

  private async toAlertResponse(
    userId: string,
    alert: AlertRecord,
  ): Promise<SafetyAlertResponse> {
    return this.formatAlert(alert, await this.getEmergencyContacts(userId));
  }

  private resolveDuplicateAlert(
    userId: string,
    rideId: string,
    alert: AlertRecord,
  ): Promise<SafetyAlertResponse> {
    if (alert.rideOfferId !== rideId) {
      throw new ConflictException("Client alert ID has already been used");
    }
    return this.toAlertResponse(userId, alert);
  }

  private async getEmergencyContacts(userId: string) {
    return this.database.client.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        phoneE164: true,
        relationship: true,
        isPrimary: true,
      },
    });
  }

  private formatAlert(
    alert: AlertRecord,
    emergencyContacts: Awaited<
      ReturnType<RideSafetyService["getEmergencyContacts"]>
    >,
  ): SafetyAlertResponse {
    return {
      id: alert.id,
      rideId: alert.rideOfferId,
      bookingId: alert.bookingId,
      status: alert.status,
      location: {
        latitude: Number(alert.latitude),
        longitude: Number(alert.longitude),
        accuracyMeters:
          alert.accuracyMeters === null ? null : Number(alert.accuracyMeters),
      },
      message: alert.message,
      emergencyNumber: alert.emergencyNumber,
      dispatchStatus: "NOT_DISPATCHED",
      emergencyContacts,
      resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      resolutionNote: alert.resolutionNote,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    };
  }

  private toLocation(location: {
    id: string;
    rideOfferId: string;
    source: string;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
    accuracyMeters: Prisma.Decimal | null;
    headingDegrees: number | null;
    speedMetersPerSecond: Prisma.Decimal | null;
    recordedAt: Date;
  }): LocationPingResponse {
    return {
      id: location.id,
      rideId: location.rideOfferId,
      source: location.source,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      accuracyMeters:
        location.accuracyMeters === null
          ? null
          : Number(location.accuracyMeters),
      headingDegrees: location.headingDegrees,
      speedMetersPerSecond:
        location.speedMetersPerSecond === null
          ? null
          : Number(location.speedMetersPerSecond),
      recordedAt: location.recordedAt.toISOString(),
    };
  }

  private toShareLink(link: {
    id: string;
    rideOfferId: string;
    label: string | null;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }): ShareLinkResponse {
    return {
      id: link.id,
      rideId: link.rideOfferId,
      label: link.label,
      expiresAt: link.expiresAt.toISOString(),
      revokedAt: link.revokedAt?.toISOString() ?? null,
      createdAt: link.createdAt.toISOString(),
    };
  }
}
