import {
  type AppConfig,
  CREATE_RIDE_REMINDERS_JOB,
  MATERIALIZE_ACTIVE_RIDE_SERIES_JOB,
  MATERIALIZE_RIDE_SERIES_JOB,
  RIDE_SCHEDULING_QUEUE_NAME,
} from "@commuteshare/config";
import {
  BookingStatus,
  checkDatabase,
  createDatabase,
  type Database,
  Prisma,
  RidePointKind,
  RideSeriesStatus,
  RideStatus,
} from "@commuteshare/database";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { type Job, Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { APP_CONFIG } from "./config.provider.js";
import { buildRideReminderNotifications } from "./ride-reminder.policy.js";

interface RideSchedulingJobData {
  seriesId?: string;
}

@Injectable()
export class SchedulingRuntimeService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(SchedulingRuntimeService.name);
  private readonly database: Database;
  private readonly redis: Redis;
  private queue: Queue<RideSchedulingJobData> | null = null;
  private worker: Worker<RideSchedulingJobData> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.database = createDatabase(config.DATABASE_URL);
    this.redis = new Redis(config.REDIS_URL, {
      connectTimeout: 5_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    this.redis.on("error", () => undefined);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      await Promise.all([checkDatabase(this.database), this.redis.ping()]);
      this.queue = new Queue(RIDE_SCHEDULING_QUEUE_NAME, {
        connection: this.redis,
      });
      this.worker = new Worker(
        RIDE_SCHEDULING_QUEUE_NAME,
        (job) => this.processJob(job),
        { connection: this.redis, concurrency: 2 },
      );
      this.worker.on("error", (error) => this.logger.error(error));
      await Promise.all([
        this.queue.upsertJobScheduler(
          "active-ride-series-materializer",
          { every: this.config.RIDE_SERIES_MATERIALIZATION_SECONDS * 1_000 },
          {
            name: MATERIALIZE_ACTIVE_RIDE_SERIES_JOB,
            data: {},
            opts: { removeOnComplete: 100, removeOnFail: 100 },
          },
        ),
        this.queue.upsertJobScheduler(
          "ride-reminder-scanner",
          { every: this.config.RIDE_REMINDER_SCAN_SECONDS * 1_000 },
          {
            name: CREATE_RIDE_REMINDERS_JOB,
            data: {},
            opts: { removeOnComplete: 100, removeOnFail: 100 },
          },
        ),
      ]);
      await Promise.all([
        this.materializeActiveSeries(),
        this.createRideReminders(),
      ]);
      this.logger.log("Ride scheduling worker ready");
    } catch (error) {
      await this.worker?.close();
      await this.queue?.close();
      this.redis.disconnect();
      await this.database.close();
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    this.redis.disconnect();
    await this.database.close();
  }

  private async processJob(job: Job<RideSchedulingJobData>): Promise<void> {
    if (job.name === CREATE_RIDE_REMINDERS_JOB) {
      await this.createRideReminders();
      return;
    }

    if (job.name === MATERIALIZE_ACTIVE_RIDE_SERIES_JOB) {
      await this.materializeActiveSeries();
      return;
    }

    if (job.name === MATERIALIZE_RIDE_SERIES_JOB && job.data.seriesId) {
      await this.materializeSeries(job.data.seriesId);
    }
  }

  private async materializeActiveSeries(): Promise<void> {
    const series = await this.database.client.rideSeries.findMany({
      where: {
        status: RideSeriesStatus.ACTIVE,
        startsOn: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000) },
        OR: [{ endsOn: null }, { endsOn: { gte: new Date() } }],
      },
      orderBy: { updatedAt: "asc" },
      take: 500,
      select: { id: true },
    });

    for (const item of series) {
      await this.materializeSeries(item.id);
    }
  }

  private async materializeSeries(seriesId: string): Promise<void> {
    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        WITH selected_series AS (
          SELECT *
          FROM ride_series
          WHERE id = ${seriesId}::uuid
            AND status = 'ACTIVE'::ride_series_status
          FOR UPDATE
        ),
        service_dates AS (
          SELECT generated.day::date AS service_date
          FROM selected_series AS series
          CROSS JOIN LATERAL generate_series(
            GREATEST(
              series.starts_on,
              (NOW() AT TIME ZONE series.timezone)::date
            ),
            LEAST(
              COALESCE(
                series.ends_on,
                (NOW() AT TIME ZONE series.timezone)::date
                  + series.lookahead_days
              ),
              (NOW() AT TIME ZONE series.timezone)::date
                + series.lookahead_days
            ),
            INTERVAL '1 day'
          ) AS generated(day)
          WHERE EXTRACT(DOW FROM generated.day)::integer = ANY(series.days_of_week)
            AND (
              generated.day::date
              + series.departure_time_minutes * INTERVAL '1 minute'
            ) AT TIME ZONE series.timezone > NOW() + INTERVAL '15 minutes'
        ),
        inserted_rides AS (
          INSERT INTO ride_offers (
            driver_application_id,
            status,
            departure_at,
            timezone,
            passenger_seats,
            contribution_kobo,
            currency,
            route_path,
            route_distance_meters,
            route_duration_seconds,
            routing_source,
            routing_profile,
            route_corridor,
            series_id,
            service_date,
            notes,
            published_at,
            created_at,
            updated_at
          )
          SELECT
            series.driver_application_id,
            'PUBLISHED'::ride_status,
            (
              dates.service_date
              + series.departure_time_minutes * INTERVAL '1 minute'
            ) AT TIME ZONE series.timezone,
            series.timezone,
            series.passenger_seats,
            series.contribution_kobo,
            series.currency,
            series.route_path,
            series.route_distance_meters,
            series.route_duration_seconds,
            series.routing_source,
            series.routing_profile,
            series.route_corridor,
            series.id,
            dates.service_date,
            series.notes,
            NOW(),
            NOW(),
            NOW()
          FROM selected_series AS series
          CROSS JOIN service_dates AS dates
          ON CONFLICT (series_id, service_date) DO NOTHING
          RETURNING id, series_id
        ),
        inserted_points AS (
          INSERT INTO ride_route_points (
            ride_offer_id,
            sequence,
            kind,
            label,
            address,
            latitude,
            longitude,
            external_source,
            external_id,
            safe_landmark_id,
            created_at
          )
          SELECT
            ride.id,
            point.sequence,
            point.kind,
            point.label,
            point.address,
            point.latitude,
            point.longitude,
            point.external_source,
            point.external_id,
            point.safe_landmark_id,
            NOW()
          FROM inserted_rides AS ride
          INNER JOIN ride_series_route_points AS point
            ON point.ride_series_id = ride.series_id
          RETURNING id
        )
        SELECT COUNT(*)::integer AS count
        FROM inserted_rides
      `);
      await transaction.$executeRaw(Prisma.sql`
        UPDATE ride_series
        SET last_generated_through = LEAST(
          COALESCE(
            ends_on,
            (NOW() AT TIME ZONE timezone)::date + lookahead_days
          ),
          (NOW() AT TIME ZONE timezone)::date + lookahead_days
        )
        WHERE id = ${seriesId}::uuid
          AND status = 'ACTIVE'::ride_series_status
      `);
    });
  }

  private async createRideReminders(): Promise<void> {
    const now = new Date();
    const rides = await this.database.client.rideOffer.findMany({
      where: {
        status: { in: [RideStatus.PUBLISHED, RideStatus.FULL] },
        departureAt: {
          gt: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
        },
      },
      orderBy: { departureAt: "asc" },
      take: 500,
      select: {
        id: true,
        departureAt: true,
        driverApplication: { select: { userId: true } },
        bookings: {
          where: { status: BookingStatus.CONFIRMED },
          select: { passengerUserId: true },
        },
        routePoints: {
          where: {
            kind: { in: [RidePointKind.ORIGIN, RidePointKind.DESTINATION] },
          },
          select: { kind: true, label: true },
        },
      },
    });
    const reminders = buildRideReminderNotifications(
      rides.flatMap((ride) => {
        const origin = ride.routePoints.find(
          (point) => point.kind === RidePointKind.ORIGIN,
        );
        const destination = ride.routePoints.find(
          (point) => point.kind === RidePointKind.DESTINATION,
        );

        return origin && destination
          ? [
              {
                id: ride.id,
                departureAt: ride.departureAt,
                driverUserId: ride.driverApplication.userId,
                passengerUserIds: ride.bookings.map(
                  (booking) => booking.passengerUserId,
                ),
                originLabel: origin.label,
                destinationLabel: destination.label,
              },
            ]
          : [];
      }),
      now,
    );

    if (reminders.length > 0) {
      await this.database.client.userNotification.createMany({
        data: reminders,
        skipDuplicates: true,
      });
    }
  }
}
