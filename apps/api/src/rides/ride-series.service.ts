import {
  BankAccountStatus,
  DriverApplicationStatus,
  Prisma,
  RideSeriesStatus,
} from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import { buildRoutePoints, isRouteGeometryAligned } from "./ride.policy.js";
import type { CreateRideSeriesInput } from "./ride-series.schemas.js";
import { RideSeriesQueueService } from "./ride-series-queue.service.js";

const seriesInclude = {
  routePoints: { orderBy: { sequence: "asc" } },
} satisfies Prisma.RideSeriesInclude;

type RideSeriesRecord = Prisma.RideSeriesGetPayload<{
  include: typeof seriesInclude;
}>;

export interface RideSeriesResponse {
  id: string;
  status: string;
  timezone: string;
  departureTime: string;
  daysOfWeek: number[];
  startsOn: string;
  endsOn: string | null;
  lookaheadDays: number;
  passengerSeats: number;
  contributionKobo: number;
  currency: string;
  notes: string | null;
  routePath: Array<{ latitude: number; longitude: number }>;
  routeDistanceMeters: number;
  routeDurationSeconds: number;
  routingSource: string | null;
  routingProfile: string | null;
  route: Array<{
    sequence: number;
    kind: string;
    label: string;
    address: string | null;
    latitude: number;
    longitude: number;
    externalSource: string | null;
    externalId: string | null;
  }>;
  lastGeneratedThrough: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RideSeriesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RideSeriesQueueService)
    private readonly queue: RideSeriesQueueService,
  ) {}

  async create(
    userId: string,
    input: CreateRideSeriesInput,
  ): Promise<RideSeriesResponse> {
    const driver = await this.database.client.driverApplication.findUnique({
      where: { userId },
      include: { vehicle: true, bankAccount: true },
    });

    if (!driver || driver.status !== DriverApplicationStatus.APPROVED) {
      throw new ForbiddenException("Approved driver account required");
    }
    if (driver.bankAccount?.status !== BankAccountStatus.VERIFIED) {
      throw new BadRequestException("Verified driver bank account required");
    }
    if (
      !driver.vehicle ||
      input.passengerSeats > driver.vehicle.seatCapacity - 1
    ) {
      throw new BadRequestException(
        "Passenger seats exceed approved vehicle capacity",
      );
    }
    if (!input.route.path || !isRouteGeometryAligned(input.route)) {
      throw new BadRequestException(
        "Recurring route geometry must follow all supplied landmarks",
      );
    }
    const routePath = input.route.path;
    const routeDistanceMeters = input.route.distanceMeters;
    const routeDurationSeconds = input.route.durationSeconds;
    if (
      routeDistanceMeters === undefined ||
      routeDurationSeconds === undefined
    ) {
      throw new BadRequestException(
        "Recurring rides require complete route geometry",
      );
    }

    const seriesId = await this.database.client.$transaction(
      async (transaction) => {
        const series = await transaction.rideSeries.create({
          data: {
            driverApplicationId: driver.id,
            timezone: input.timezone,
            departureTimeMinutes: this.departureMinutes(input.departureTime),
            daysOfWeek: [...input.daysOfWeek].sort(
              (first, second) => first - second,
            ),
            startsOn: this.dateOnly(input.startsOn),
            endsOn: input.endsOn ? this.dateOnly(input.endsOn) : null,
            lookaheadDays: input.lookaheadDays,
            passengerSeats: input.passengerSeats,
            contributionKobo: BigInt(input.contributionKobo),
            currency: input.currency,
            routePath: routePath as Prisma.InputJsonValue,
            routeDistanceMeters,
            routeDurationSeconds,
            ...(input.route.routingSource
              ? { routingSource: input.route.routingSource }
              : {}),
            ...(input.route.routingProfile
              ? { routingProfile: input.route.routingProfile }
              : {}),
            ...(input.notes ? { notes: input.notes } : {}),
            routePoints: {
              create: buildRoutePoints(input.route).map((point) => ({
                sequence: point.sequence,
                kind: point.kind,
                label: point.label,
                ...(point.address ? { address: point.address } : {}),
                latitude: point.latitude,
                longitude: point.longitude,
                ...(point.externalSource
                  ? { externalSource: point.externalSource }
                  : {}),
                ...(point.externalId ? { externalId: point.externalId } : {}),
              })),
            },
          },
          select: { id: true },
        });
        await this.syncRouteCorridor(transaction, series.id, routePath);
        return series.id;
      },
    );

    await this.queue.enqueue(seriesId).catch(() => undefined);
    return this.getOwned(userId, seriesId);
  }

  async getMine(userId: string): Promise<RideSeriesResponse[]> {
    const series = await this.database.client.rideSeries.findMany({
      where: { driverApplication: { userId } },
      include: seriesInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return series.map((item) => this.toResponse(item));
  }

  pause(userId: string, seriesId: string): Promise<RideSeriesResponse> {
    return this.changeStatus(
      userId,
      seriesId,
      [RideSeriesStatus.ACTIVE],
      RideSeriesStatus.PAUSED,
    );
  }

  async resume(userId: string, seriesId: string): Promise<RideSeriesResponse> {
    const series = await this.changeStatus(
      userId,
      seriesId,
      [RideSeriesStatus.PAUSED],
      RideSeriesStatus.ACTIVE,
    );
    await this.queue.enqueue(seriesId).catch(() => undefined);
    return series;
  }

  cancel(userId: string, seriesId: string): Promise<RideSeriesResponse> {
    return this.changeStatus(
      userId,
      seriesId,
      [RideSeriesStatus.ACTIVE, RideSeriesStatus.PAUSED],
      RideSeriesStatus.CANCELLED,
    );
  }

  private async changeStatus(
    userId: string,
    seriesId: string,
    currentStatuses: RideSeriesStatus[],
    status: RideSeriesStatus,
  ): Promise<RideSeriesResponse> {
    const changed = await this.database.client.rideSeries.updateMany({
      where: {
        id: seriesId,
        driverApplication: { userId },
        status: { in: currentStatuses },
      },
      data: { status },
    });

    if (changed.count !== 1) {
      throw new ConflictException("Ride series cannot change status");
    }

    return this.getOwned(userId, seriesId);
  }

  private async getOwned(
    userId: string,
    seriesId: string,
  ): Promise<RideSeriesResponse> {
    const series = await this.database.client.rideSeries.findFirst({
      where: { id: seriesId, driverApplication: { userId } },
      include: seriesInclude,
    });

    if (!series) {
      throw new NotFoundException("Ride series not found");
    }

    return this.toResponse(series);
  }

  private async syncRouteCorridor(
    transaction: Prisma.TransactionClient,
    seriesId: string,
    path: NonNullable<CreateRideSeriesInput["route"]["path"]>,
  ): Promise<void> {
    const geoJson = JSON.stringify({
      type: "LineString",
      coordinates: path.map((point) => [point.longitude, point.latitude]),
    });
    await transaction.$executeRaw(
      Prisma.sql`
        UPDATE ride_series
        SET route_corridor = ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326)
        WHERE id = ${seriesId}::uuid
      `,
    );
  }

  private departureMinutes(value: string): number {
    const [hour, minute] = value.split(":").map(Number);
    return (hour ?? 0) * 60 + (minute ?? 0);
  }

  private dateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toResponse(series: RideSeriesRecord): RideSeriesResponse {
    const routePath = Array.isArray(series.routePath)
      ? series.routePath.flatMap((point) => {
          if (
            typeof point !== "object" ||
            point === null ||
            Array.isArray(point) ||
            typeof point.latitude !== "number" ||
            typeof point.longitude !== "number"
          ) {
            return [];
          }
          return [{ latitude: point.latitude, longitude: point.longitude }];
        })
      : [];
    const hours = Math.floor(series.departureTimeMinutes / 60);
    const minutes = series.departureTimeMinutes % 60;

    return {
      id: series.id,
      status: series.status,
      timezone: series.timezone,
      departureTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      daysOfWeek: series.daysOfWeek,
      startsOn: series.startsOn.toISOString().slice(0, 10),
      endsOn: series.endsOn?.toISOString().slice(0, 10) ?? null,
      lookaheadDays: series.lookaheadDays,
      passengerSeats: series.passengerSeats,
      contributionKobo: Number(series.contributionKobo),
      currency: series.currency,
      notes: series.notes,
      routePath,
      routeDistanceMeters: series.routeDistanceMeters,
      routeDurationSeconds: series.routeDurationSeconds,
      routingSource: series.routingSource,
      routingProfile: series.routingProfile,
      route: series.routePoints.map((point) => ({
        sequence: point.sequence,
        kind: point.kind,
        label: point.label,
        address: point.address,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        externalSource: point.externalSource,
        externalId: point.externalId,
      })),
      lastGeneratedThrough:
        series.lastGeneratedThrough?.toISOString().slice(0, 10) ?? null,
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
    };
  }
}
