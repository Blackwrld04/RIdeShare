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
  bookingIdSchema,
  bookingRideIdSchema,
  type CancelBookingInput,
  type CreateBookingInput,
  cancelBookingSchema,
  createBookingSchema,
  type DeclineBookingInput,
  declineBookingSchema,
} from "./booking.schemas.js";
import { type BookingResponse, BookingService } from "./booking.service.js";

@Controller("bookings")
@UseGuards(AccessTokenGuard)
export class BookingController {
  constructor(
    @Inject(BookingService) private readonly bookings: BookingService,
  ) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createBookingSchema)) input: CreateBookingInput,
  ): Promise<BookingResponse> {
    return this.bookings.create(request.auth.userId, input);
  }

  @Get("mine")
  getMine(@Req() request: AuthenticatedRequest): Promise<BookingResponse[]> {
    return this.bookings.getMine(request.auth.userId);
  }

  @Get("ride/:rideId")
  getForRide(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(bookingRideIdSchema)) rideId: string,
  ): Promise<BookingResponse[]> {
    return this.bookings.getForRide(request.auth.userId, rideId);
  }

  @Post(":bookingId/confirm")
  @HttpCode(200)
  confirm(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(bookingIdSchema))
    bookingId: string,
  ): Promise<BookingResponse> {
    return this.bookings.confirm(request.auth.userId, bookingId);
  }

  @Post(":bookingId/decline")
  @HttpCode(200)
  decline(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(bookingIdSchema))
    bookingId: string,
    @Body(new ZodValidationPipe(declineBookingSchema))
    input: DeclineBookingInput,
  ): Promise<BookingResponse> {
    return this.bookings.decline(request.auth.userId, bookingId, input);
  }

  @Post(":bookingId/cancel")
  @HttpCode(200)
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(bookingIdSchema))
    bookingId: string,
    @Body(new ZodValidationPipe(cancelBookingSchema)) input: CancelBookingInput,
  ): Promise<BookingResponse> {
    return this.bookings.cancel(request.auth.userId, bookingId, input);
  }
}
