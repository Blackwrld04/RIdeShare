import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
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
  type CreateReviewInput,
  createReviewSchema,
  type ListReviewsInput,
  listReviewsSchema,
  reviewBookingIdSchema,
  reviewUserIdSchema,
} from "./review.schemas.js";
import {
  ReviewService,
  type RideReviewResponse,
  type UserReviewSummaryResponse,
} from "./review.service.js";

@Controller("reviews")
@UseGuards(AccessTokenGuard)
export class ReviewController {
  constructor(@Inject(ReviewService) private readonly reviews: ReviewService) {}

  @Post("bookings/:bookingId")
  create(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(reviewBookingIdSchema))
    bookingId: string,
    @Body(new ZodValidationPipe(createReviewSchema)) input: CreateReviewInput,
  ): Promise<RideReviewResponse> {
    return this.reviews.create(request.auth.userId, bookingId, input);
  }

  @Get("users/:userId")
  listForUser(
    @Param("userId", new ZodValidationPipe(reviewUserIdSchema)) userId: string,
    @Query(new ZodValidationPipe(listReviewsSchema)) input: ListReviewsInput,
  ): Promise<UserReviewSummaryResponse> {
    return this.reviews.listForUser(userId, input);
  }
}
