import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import { GeocodingService } from "./geocoding.service.js";
import {
  type GeocodeSearchInput,
  geocodeSearchSchema,
  landmarkIdSchema,
  type SearchLandmarksInput,
  searchLandmarksSchema,
} from "./location.schemas.js";
import { LocationService } from "./location.service.js";

@Controller("locations")
@UseGuards(AccessTokenGuard)
export class LocationController {
  constructor(
    @Inject(LocationService) private readonly locations: LocationService,
    @Inject(GeocodingService) private readonly geocoding: GeocodingService,
  ) {}

  @Get("landmarks")
  searchLandmarks(
    @Query(new ZodValidationPipe(searchLandmarksSchema))
    input: SearchLandmarksInput,
  ) {
    return this.locations.search(input);
  }

  @Get("geocode/search")
  searchProvider(
    @Query(new ZodValidationPipe(geocodeSearchSchema))
    input: GeocodeSearchInput,
  ) {
    return this.geocoding.search(input);
  }

  @Get("landmarks/:landmarkId")
  getLandmark(
    @Param("landmarkId", new ZodValidationPipe(landmarkIdSchema))
    landmarkId: string,
  ) {
    return this.locations.get(landmarkId);
  }
}
