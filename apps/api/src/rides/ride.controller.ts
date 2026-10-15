import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type CancelRideInput,
  type CreateRideInput,
  cancelRideSchema,
  createRideSchema,
  rideIdSchema,
  type SearchRidesInput,
  searchRidesSchema,
  type UpdateRideInput,
  updateRideSchema,
} from "./ride.schemas.js";
import {
  type RideOfferResponse,
  type RideSearchResult,
  RideService,
} from "./ride.service.js";

@Controller("rides")
@UseGuards(AccessTokenGuard)
export class RideController {
  constructor(@Inject(RideService) private readonly rides: RideService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createRideSchema)) input: CreateRideInput,
  ): Promise<RideOfferResponse> {
    return this.rides.create(request.auth.userId, input);
  }

  @Get("mine")
  getMine(@Req() request: AuthenticatedRequest): Promise<RideOfferResponse[]> {
    return this.rides.getMine(request.auth.userId);
  }

  @Get("search")
  search(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(searchRidesSchema)) input: SearchRidesInput,
  ): Promise<RideSearchResult[]> {
    return this.rides.search(request.auth.userId, input);
  }

  @Get(":rideId")
  get(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(rideIdSchema)) rideId: string,
  ): Promise<RideOfferResponse> {
    return this.rides.get(request.auth.userId, rideId);
  }

  @Patch(":rideId")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(rideIdSchema)) rideId: string,
    @Body(new ZodValidationPipe(updateRideSchema)) input: UpdateRideInput,
  ): Promise<RideOfferResponse> {
    return this.rides.update(request.auth.userId, rideId, input);
  }

  @Post(":rideId/publish")
  publish(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(rideIdSchema)) rideId: string,
  ): Promise<RideOfferResponse> {
    return this.rides.publish(request.auth.userId, rideId);
  }

  @Post(":rideId/cancel")
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(rideIdSchema)) rideId: string,
    @Body(new ZodValidationPipe(cancelRideSchema)) input: CancelRideInput,
  ): Promise<RideOfferResponse> {
    return this.rides.cancel(request.auth.userId, rideId, input);
  }

  @Post(":rideId/start")
  @HttpCode(200)
  start(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(rideIdSchema)) rideId: string,
  ): Promise<RideOfferResponse> {
    return this.rides.start(request.auth.userId, rideId);
  }

  @Post(":rideId/complete")
  @HttpCode(200)
  complete(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(rideIdSchema)) rideId: string,
  ): Promise<RideOfferResponse> {
    return this.rides.complete(request.auth.userId, rideId);
  }
}
