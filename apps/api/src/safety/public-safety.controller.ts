import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type PublicTripShareResponse,
  RideSafetyService,
} from "./ride-safety.service.js";
import { publicShareTokenSchema } from "./safety.schemas.js";

@Controller("trip-shares")
export class PublicSafetyController {
  constructor(
    @Inject(RideSafetyService)
    private readonly safety: RideSafetyService,
  ) {}

  @Get(":token")
  getShare(
    @Param("token", new ZodValidationPipe(publicShareTokenSchema))
    token: string,
  ): Promise<PublicTripShareResponse> {
    return this.safety.getPublicShare(token);
  }
}
