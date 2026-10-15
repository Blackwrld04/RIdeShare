import { Prisma, UserReportStatus } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import type {
  CreateReportInput,
  ListAdminReportsInput,
  ListMyReportsInput,
  ReviewReportInput,
} from "./report.schemas.js";

const reportSelect = {
  id: true,
  bookingId: true,
  category: true,
  details: true,
  status: true,
  resolutionNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reporter: {
    select: { id: true, profile: { select: { displayName: true } } },
  },
  subject: {
    select: { id: true, profile: { select: { displayName: true } } },
  },
  reviewedBy: {
    select: { id: true, profile: { select: { displayName: true } } },
  },
  booking: {
    select: { rideOffer: { select: { id: true, departureAt: true } } },
  },
} satisfies Prisma.UserReportSelect;

type ReportRecord = Prisma.UserReportGetPayload<{
  select: typeof reportSelect;
}>;

interface ReportListInput {
  status?: ListMyReportsInput["status"] | undefined;
  category?: ListAdminReportsInput["category"] | undefined;
  cursor?: string | undefined;
  limit: number;
}

export interface UserReportResponse {
  id: string;
  bookingId: string;
  ride: { id: string; departureAt: string };
  reporter: { userId: string; displayName: string | null };
  subject: { userId: string; displayName: string | null };
  category: string;
  details: string;
  status: string;
  resolutionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserReportPageResponse {
  items: UserReportResponse[];
  nextCursor: string | null;
}

export interface AdminUserReportResponse extends UserReportResponse {
  reviewedBy: { userId: string; displayName: string | null } | null;
}

export interface AdminUserReportPageResponse {
  items: AdminUserReportResponse[];
  nextCursor: string | null;
}

@Injectable()
export class ReportService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async create(
    reporterUserId: string,
    bookingId: string,
    input: CreateReportInput,
  ): Promise<UserReportResponse> {
    const booking = await this.database.client.rideBooking.findUnique({
      where: { id: bookingId },
      select: {
        passengerUserId: true,
        rideOffer: {
          select: { driverApplication: { select: { userId: true } } },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }
    const driverUserId = booking.rideOffer.driverApplication.userId;
    if (
      booking.passengerUserId !== reporterUserId &&
      driverUserId !== reporterUserId
    ) {
      throw new NotFoundException("Booking not found");
    }
    const subjectUserId =
      booking.passengerUserId === reporterUserId
        ? driverUserId
        : booking.passengerUserId;
    if (subjectUserId === reporterUserId) {
      throw new ConflictException("You cannot report yourself");
    }

    try {
      const report = await this.database.client.userReport.create({
        data: {
          bookingId,
          reporterUserId,
          subjectUserId,
          category: input.category,
          details: input.details,
        },
        select: reportSelect,
      });
      return this.toUserResponse(report);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("You already reported this booking");
      }
      throw error;
    }
  }

  async listMine(
    reporterUserId: string,
    input: ListMyReportsInput,
  ): Promise<UserReportPageResponse> {
    const page = await this.list({ reporterUserId }, input);
    return {
      items: page.items.map((report) => this.toUserResponse(report)),
      nextCursor: page.nextCursor,
    };
  }

  async listAdmin(
    input: ListAdminReportsInput,
  ): Promise<AdminUserReportPageResponse> {
    const page = await this.list({}, input);
    return {
      items: page.items.map((report) => this.toAdminResponse(report)),
      nextCursor: page.nextCursor,
    };
  }

  async getAdmin(reportId: string): Promise<AdminUserReportResponse> {
    const report = await this.database.client.userReport.findUnique({
      where: { id: reportId },
      select: reportSelect,
    });
    if (!report) {
      throw new NotFoundException("Report not found");
    }
    return this.toAdminResponse(report);
  }

  async review(
    reviewerUserId: string,
    reportId: string,
    input: ReviewReportInput,
  ): Promise<AdminUserReportResponse> {
    const current = await this.database.client.userReport.findUnique({
      where: { id: reportId },
      select: { id: true, reporterUserId: true, status: true },
    });
    if (!current) {
      throw new NotFoundException("Report not found");
    }
    const allowedStatuses: UserReportStatus[] =
      input.status === UserReportStatus.UNDER_REVIEW
        ? [UserReportStatus.OPEN]
        : [UserReportStatus.OPEN, UserReportStatus.UNDER_REVIEW];
    if (!allowedStatuses.includes(current.status)) {
      throw new ConflictException("Report has already been finalized");
    }
    const now = new Date();
    await this.database.client.$transaction(async (transaction) => {
      const updated = await transaction.userReport.updateMany({
        where: { id: reportId, status: { in: allowedStatuses } },
        data: {
          status: input.status,
          reviewedByUserId: reviewerUserId,
          reviewedAt: now,
          resolutionNote:
            input.status === UserReportStatus.UNDER_REVIEW
              ? null
              : (input.note ?? null),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException("Report status changed; reload and retry");
      }
      if (input.status !== UserReportStatus.UNDER_REVIEW) {
        await transaction.userNotification.create({
          data: {
            userId: current.reporterUserId,
            kind: "user_report_updated",
            title: "Report reviewed",
            body:
              input.status === UserReportStatus.RESOLVED
                ? "Your report has been resolved"
                : "Your report has been reviewed",
            data: { reportId, status: input.status },
            idempotencyKey: `user-report:${reportId}:status:${input.status}`,
          },
        });
      }
    });
    return this.getAdmin(reportId);
  }

  private async list(
    scope: { reporterUserId?: string },
    input: ReportListInput,
  ): Promise<{ items: ReportRecord[]; nextCursor: string | null }> {
    const baseWhere = {
      ...scope,
      ...(input.status ? { status: input.status } : {}),
      ...(input.category ? { category: input.category } : {}),
    } satisfies Prisma.UserReportWhereInput;
    const cursor = input.cursor
      ? await this.database.client.userReport.findFirst({
          where: { ...baseWhere, id: input.cursor },
          select: { id: true, createdAt: true },
        })
      : null;
    if (input.cursor && !cursor) {
      throw new BadRequestException("Report cursor is invalid");
    }
    const reports = await this.database.client.userReport.findMany({
      where: {
        ...baseWhere,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      select: reportSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
    });
    const hasMore = reports.length > input.limit;
    const page = hasMore ? reports.slice(0, input.limit) : reports;
    return {
      items: page,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private toUserResponse(report: ReportRecord): UserReportResponse {
    return {
      id: report.id,
      bookingId: report.bookingId,
      ride: {
        id: report.booking.rideOffer.id,
        departureAt: report.booking.rideOffer.departureAt.toISOString(),
      },
      reporter: {
        userId: report.reporter.id,
        displayName: report.reporter.profile?.displayName ?? null,
      },
      subject: {
        userId: report.subject.id,
        displayName: report.subject.profile?.displayName ?? null,
      },
      category: report.category,
      details: report.details,
      status: report.status,
      resolutionNote: report.resolutionNote,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  private toAdminResponse(report: ReportRecord): AdminUserReportResponse {
    return {
      ...this.toUserResponse(report),
      reviewedBy: report.reviewedBy
        ? {
            userId: report.reviewedBy.id,
            displayName: report.reviewedBy.profile?.displayName ?? null,
          }
        : null,
    };
  }
}
