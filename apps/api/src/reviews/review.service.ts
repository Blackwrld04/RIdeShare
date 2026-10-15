import { BookingStatus, Prisma } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import type { CreateReviewInput, ListReviewsInput } from "./review.schemas.js";

const reviewSelect = {
  id: true,
  bookingId: true,
  subjectUserId: true,
  rating: true,
  comment: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      profile: { select: { displayName: true } },
    },
  },
  booking: {
    select: {
      rideOffer: { select: { id: true, departureAt: true } },
    },
  },
} satisfies Prisma.RideReviewSelect;

type ReviewRecord = Prisma.RideReviewGetPayload<{
  select: typeof reviewSelect;
}>;

export interface RideReviewResponse {
  id: string;
  bookingId: string;
  subjectUserId: string;
  author: {
    userId: string;
    displayName: string | null;
  };
  ride: {
    id: string;
    departureAt: string;
  };
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface UserReviewSummaryResponse {
  userId: string;
  averageRating: number | null;
  reviewCount: number;
  items: RideReviewResponse[];
  nextCursor: string | null;
}

@Injectable()
export class ReviewService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async create(
    userId: string,
    bookingId: string,
    input: CreateReviewInput,
  ): Promise<RideReviewResponse> {
    const booking = await this.database.client.rideBooking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        passengerUserId: true,
        rideOffer: {
          select: { driverApplication: { select: { userId: true } } },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException("Completed booking not found");
    }
    const driverUserId = booking.rideOffer.driverApplication.userId;
    if (booking.passengerUserId !== userId && driverUserId !== userId) {
      throw new NotFoundException("Completed booking not found");
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException("Ride reviews require a completed booking");
    }
    const subjectUserId =
      booking.passengerUserId === userId
        ? driverUserId
        : booking.passengerUserId;
    if (subjectUserId === userId) {
      throw new ConflictException("You cannot review yourself");
    }

    try {
      const review = await this.database.client.$transaction(
        async (transaction) => {
          const created = await transaction.rideReview.create({
            data: {
              bookingId,
              authorUserId: userId,
              subjectUserId,
              rating: input.rating,
              comment: input.comment ?? null,
            },
            select: reviewSelect,
          });
          await transaction.userNotification.create({
            data: {
              userId: subjectUserId,
              kind: "ride_review_received",
              title: "New ride rating",
              body: `You received a ${input.rating}-star rating`,
              data: { bookingId, reviewId: created.id },
              idempotencyKey: `ride-review:${bookingId}:author:${userId}`,
            },
          });
          return created;
        },
      );
      return this.toResponse(review);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("You already reviewed this ride");
      }
      throw error;
    }
  }

  async listForUser(
    subjectUserId: string,
    input: ListReviewsInput,
  ): Promise<UserReviewSummaryResponse> {
    const user = await this.database.client.user.findUnique({
      where: { id: subjectUserId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const cursor = input.cursor
      ? await this.database.client.rideReview.findFirst({
          where: { id: input.cursor, subjectUserId },
          select: { id: true, createdAt: true },
        })
      : null;
    if (input.cursor && !cursor) {
      throw new BadRequestException("Review cursor is invalid");
    }

    const [aggregate, reviews] = await Promise.all([
      this.database.client.rideReview.aggregate({
        where: { subjectUserId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.database.client.rideReview.findMany({
        where: {
          subjectUserId,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        select: reviewSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
      }),
    ]);
    const hasMore = reviews.length > input.limit;
    const page = hasMore ? reviews.slice(0, input.limit) : reviews;
    const averageRating = aggregate._avg.rating;

    return {
      userId: subjectUserId,
      averageRating:
        averageRating === null ? null : Number(averageRating.toFixed(2)),
      reviewCount: aggregate._count._all,
      items: page.map((review) => this.toResponse(review)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private toResponse(review: ReviewRecord): RideReviewResponse {
    return {
      id: review.id,
      bookingId: review.bookingId,
      subjectUserId: review.subjectUserId,
      author: {
        userId: review.author.id,
        displayName: review.author.profile?.displayName ?? null,
      },
      ride: {
        id: review.booking.rideOffer.id,
        departureAt: review.booking.rideOffer.departureAt.toISOString(),
      },
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }
}
