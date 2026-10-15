import { Prisma } from "@commuteshare/database";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import type { RideRouteInput } from "../rides/ride.schemas.js";
import type {
  CreateLandmarkInput,
  SearchLandmarksInput,
  UpdateLandmarkInput,
} from "./location.schemas.js";

interface LandmarkRow {
  id: string;
  name: string;
  address: string;
  category: string;
  city: string;
  state: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  externalSource: string | null;
  externalId: string | null;
  safetyNotes: string | null;
  metadata: Prisma.JsonValue | null;
  isActive: boolean;
  distanceMeters: number | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LocationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async search(input: SearchLandmarksInput) {
    const conditions: Prisma.Sql[] = [Prisma.sql`is_active = TRUE`];
    if (input.q) {
      const pattern = `%${input.q}%`;
      conditions.push(
        Prisma.sql`(name ILIKE ${pattern} OR address ILIKE ${pattern})`,
      );
    }
    if (input.city) {
      conditions.push(Prisma.sql`city ILIKE ${input.city}`);
    }
    if (input.category) {
      conditions.push(Prisma.sql`category ILIKE ${input.category}`);
    }
    const hasCoordinates =
      input.latitude !== undefined && input.longitude !== undefined;
    if (hasCoordinates) {
      conditions.push(
        Prisma.sql`ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
          ${input.radiusMeters}
        )`,
      );
    }
    const distance = hasCoordinates
      ? Prisma.sql`ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography
        )`
      : Prisma.sql`NULL::DOUBLE PRECISION`;
    const rows = await this.database.client.$queryRaw<LandmarkRow[]>(Prisma.sql`
      SELECT
        id,
        name,
        address,
        category,
        city,
        state,
        latitude,
        longitude,
        external_source AS "externalSource",
        external_id AS "externalId",
        safety_notes AS "safetyNotes",
        metadata,
        is_active AS "isActive",
        ${distance} AS "distanceMeters",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM safe_landmarks
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY "distanceMeters" ASC NULLS LAST, name ASC
      LIMIT ${input.limit}
    `);
    return rows.map((row) => this.toResponse(row));
  }

  async get(landmarkId: string) {
    const landmark = await this.database.client.safeLandmark.findFirst({
      where: { id: landmarkId, isActive: true },
    });
    if (!landmark) {
      throw new NotFoundException("Safe landmark not found");
    }
    return this.toResponse({ ...landmark, distanceMeters: null });
  }

  async listAdmin() {
    const landmarks = await this.database.client.safeLandmark.findMany({
      orderBy: [{ isActive: "desc" }, { city: "asc" }, { name: "asc" }],
      take: 500,
    });
    return landmarks.map((item) =>
      this.toResponse({ ...item, distanceMeters: null }),
    );
  }

  async create(input: CreateLandmarkInput) {
    const data: Prisma.SafeLandmarkCreateInput = {
      name: input.name,
      address: input.address,
      category: input.category,
      city: input.city,
      state: input.state,
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.externalSource ? { externalSource: input.externalSource } : {}),
      ...(input.externalId ? { externalId: input.externalId } : {}),
      ...(input.safetyNotes ? { safetyNotes: input.safetyNotes } : {}),
      ...(input.metadata
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
    };
    const landmark = await this.database.client.safeLandmark.create({
      data,
    });
    return this.toResponse({ ...landmark, distanceMeters: null });
  }

  async update(landmarkId: string, input: UpdateLandmarkInput) {
    const existing = await this.database.client.safeLandmark.findUnique({
      where: { id: landmarkId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Safe landmark not found");
    }
    const data: Prisma.SafeLandmarkUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.externalSource !== undefined
        ? { externalSource: input.externalSource }
        : {}),
      ...(input.externalId !== undefined
        ? { externalId: input.externalId }
        : {}),
      ...(input.safetyNotes !== undefined
        ? { safetyNotes: input.safetyNotes }
        : {}),
      ...(input.metadata !== undefined
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    const landmark = await this.database.client.safeLandmark.update({
      where: { id: landmarkId },
      data,
    });
    return this.toResponse({ ...landmark, distanceMeters: null });
  }

  async assertRouteLandmarks(route: RideRouteInput): Promise<void> {
    const points = [route.origin, ...route.waypoints, route.destination].filter(
      (point) => point.safeLandmarkId,
    );
    if (points.length === 0) {
      return;
    }
    const ids = [...new Set(points.map((point) => point.safeLandmarkId ?? ""))];
    const landmarks = await this.database.client.safeLandmark.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, latitude: true, longitude: true },
    });
    const byId = new Map(landmarks.map((landmark) => [landmark.id, landmark]));
    for (const point of points) {
      const landmark = byId.get(point.safeLandmarkId ?? "");
      if (!landmark) {
        throw new BadRequestException("Route references an inactive landmark");
      }
      if (
        this.distanceMeters(
          point.latitude,
          point.longitude,
          Number(landmark.latitude),
          Number(landmark.longitude),
        ) > 250
      ) {
        throw new BadRequestException(
          "Route coordinates do not match the selected landmark",
        );
      }
    }
  }

  private distanceMeters(
    firstLatitude: number,
    firstLongitude: number,
    secondLatitude: number,
    secondLongitude: number,
  ): number {
    const radians = Math.PI / 180;
    const latitudeDelta = (secondLatitude - firstLatitude) * radians;
    const longitudeDelta = (secondLongitude - firstLongitude) * radians;
    const first = firstLatitude * radians;
    const second = secondLatitude * radians;
    const value =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(first) * Math.cos(second) * Math.sin(longitudeDelta / 2) ** 2;
    return 12_742_000 * Math.asin(Math.sqrt(value));
  }

  private toResponse(row: LandmarkRow) {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      category: row.category,
      city: row.city,
      state: row.state,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      externalSource: row.externalSource,
      externalId: row.externalId,
      safetyNotes: row.safetyNotes,
      metadata: row.metadata,
      isActive: row.isActive,
      distanceMeters:
        row.distanceMeters === null ? null : Math.round(row.distanceMeters),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
