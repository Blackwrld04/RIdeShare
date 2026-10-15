import { createHash } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { APP_CONFIG } from "../config.provider.js";
import { RedisService } from "../infrastructure/redis.service.js";
import type { GeocodeSearchInput } from "./location.schemas.js";

const responseSchema = z.array(
  z.object({
    osm_type: z.enum(["node", "way", "relation"]),
    osm_id: z.union([z.number(), z.string()]),
    display_name: z.string().min(1),
    lat: z.string(),
    lon: z.string(),
    category: z.string().optional(),
    type: z.string().optional(),
  }),
);

export interface GeocodingResult {
  source: string;
  externalId: string;
  label: string;
  latitude: number;
  longitude: number;
  category: string | null;
  type: string | null;
}

@Injectable()
export class GeocodingService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async search(input: GeocodeSearchInput): Promise<GeocodingResult[]> {
    const normalized = input.q.toLocaleLowerCase("en-NG");
    const digest = createHash("sha256")
      .update(`${normalized}:${input.limit}`)
      .digest("hex");
    const cacheKey = `geocoding:search:${digest}`;
    const cached = await this.readCache(cacheKey);
    if (cached) {
      return cached;
    }

    const allowed = await this.claimUpstreamRequest();
    if (!allowed) {
      throw new HttpException("Geocoding is busy; retry shortly", 429);
    }

    const url = new URL("search", this.config.GEOCODING_BASE_URL);
    url.searchParams.set("q", input.q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("countrycodes", "ng");
    url.searchParams.set("limit", String(input.limit));

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-NG,en;q=0.8",
        "User-Agent": this.config.GEOCODING_USER_AGENT,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new HttpException("Geocoding provider unavailable", 502);
    }

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new HttpException("Geocoding provider returned invalid data", 502);
    }

    const results = parsed.data.flatMap((result) => {
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return [];
      }
      return [
        {
          source: "openstreetmap",
          externalId: `${result.osm_type}:${result.osm_id}`,
          label: result.display_name,
          latitude,
          longitude,
          category: result.category ?? null,
          type: result.type ?? null,
        },
      ];
    });
    await this.writeCache(cacheKey, results);
    return results;
  }

  private async claimUpstreamRequest(): Promise<boolean> {
    try {
      await this.redis.ping();
      const result = await this.redis.connection.set(
        "geocoding:upstream-lock",
        "1",
        "PX",
        1_000,
        "NX",
      );
      return result === "OK";
    } catch {
      return false;
    }
  }

  private async readCache(key: string): Promise<GeocodingResult[] | null> {
    try {
      await this.redis.ping();
      const value = await this.redis.connection.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as GeocodingResult[];
    } catch {
      return null;
    }
  }

  private async writeCache(
    key: string,
    results: GeocodingResult[],
  ): Promise<void> {
    await this.redis.connection
      .set(
        key,
        JSON.stringify(results),
        "EX",
        this.config.GEOCODING_CACHE_SECONDS,
      )
      .catch(() => undefined);
  }
}
