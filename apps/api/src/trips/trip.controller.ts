import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type TripTrackerQuery,
  tripTrackerQuerySchema,
} from "./trip.schemas.js";
import { TripService, type TripTrackerResponse } from "./trip.service.js";

@Controller("trips")
@UseGuards(AccessTokenGuard)
export class TripController {
  constructor(@Inject(TripService) private readonly trips: TripService) {}

  @Get()
  getTracker(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(tripTrackerQuerySchema))
    query: TripTrackerQuery,
  ): Promise<TripTrackerResponse> {
    return this.trips.getTracker(request.auth.userId, query.view);
  }
}
