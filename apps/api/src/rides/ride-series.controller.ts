import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type CreateRideSeriesInput,
  createRideSeriesSchema,
  rideSeriesIdSchema,
} from "./ride-series.schemas.js";
import {
  type RideSeriesResponse,
  RideSeriesService,
} from "./ride-series.service.js";

@Controller("ride-series")
@UseGuards(AccessTokenGuard)
export class RideSeriesController {
  constructor(
    @Inject(RideSeriesService) private readonly series: RideSeriesService,
  ) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createRideSeriesSchema))
    input: CreateRideSeriesInput,
  ): Promise<RideSeriesResponse> {
    return this.series.create(request.auth.userId, input);
  }

  @Get("mine")
  getMine(@Req() request: AuthenticatedRequest): Promise<RideSeriesResponse[]> {
    return this.series.getMine(request.auth.userId);
  }

  @Post(":seriesId/pause")
  @HttpCode(200)
  pause(
    @Req() request: AuthenticatedRequest,
    @Param("seriesId", new ZodValidationPipe(rideSeriesIdSchema))
    seriesId: string,
  ): Promise<RideSeriesResponse> {
    return this.series.pause(request.auth.userId, seriesId);
  }

  @Post(":seriesId/resume")
  @HttpCode(200)
  resume(
    @Req() request: AuthenticatedRequest,
    @Param("seriesId", new ZodValidationPipe(rideSeriesIdSchema))
    seriesId: string,
  ): Promise<RideSeriesResponse> {
    return this.series.resume(request.auth.userId, seriesId);
  }

  @Post(":seriesId/cancel")
  @HttpCode(200)
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param("seriesId", new ZodValidationPipe(rideSeriesIdSchema))
    seriesId: string,
  ): Promise<RideSeriesResponse> {
    return this.series.cancel(request.auth.userId, seriesId);
  }
}
