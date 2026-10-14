import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  createDatabase,
  type Database,
  DriverApplicationStatus,
  RideStatus,
} from "@commuteshare/database";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { ChatService } from "./chat.service.js";

const describeIntegration = process.env.CHAT_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("chat service integration", () => {
  let database: Database;
  let chat: ChatService;
  let driverUserId: string;
  let passengerUserId: string;
  let outsiderUserId: string;
  let rideId: string;
  let bookingId: string;
  let pendingBookingId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.CHAT_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("CHAT_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    chat = new ChatService(database as unknown as DatabaseService);
    const suffix = randomUUID().slice(0, 8);
    const [driver, passenger, outsider] = await Promise.all([
      database.client.user.create({
        data: {
          phoneE164: `+234801${suffix.slice(0, 6)}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Chat Driver" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234802${suffix.slice(0, 6)}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Chat Passenger" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234803${suffix.slice(0, 6)}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Chat Outsider" } },
        },
      }),
    ]);
    driverUserId = driver.id;
    passengerUserId = passenger.id;
    outsiderUserId = outsider.id;
    const driverApplication = await database.client.driverApplication.create({
      data: {
        userId: driver.id,
        status: DriverApplicationStatus.APPROVED,
      },
    });
    const ride = await database.client.rideOffer.create({
      data: {
        driverApplicationId: driverApplication.id,
        status: RideStatus.PUBLISHED,
        departureAt: new Date(Date.now() + 60 * 60 * 1_000),
        passengerSeats: 3,
        contributionKobo: 250_000n,
      },
    });
    rideId = ride.id;
    const [booking, pendingBooking] = await Promise.all([
      database.client.rideBooking.create({
        data: {
          rideOfferId: ride.id,
          passengerUserId: passenger.id,
          seats: 1,
          status: BookingStatus.CONFIRMED,
          unitContributionKobo: 250_000n,
          totalContributionKobo: 250_000n,
          currency: "NGN",
        },
      }),
      database.client.rideBooking.create({
        data: {
          rideOfferId: ride.id,
          passengerUserId: outsider.id,
          seats: 1,
          status: BookingStatus.PENDING,
          unitContributionKobo: 250_000n,
          totalContributionKobo: 250_000n,
          currency: "NGN",
        },
      }),
    ]);
    bookingId = booking.id;
    pendingBookingId = pendingBooking.id;
  });

  afterAll(async () => {
    await database.client.rideOffer.delete({ where: { id: rideId } });
    await database.client.user.deleteMany({
      where: {
        id: { in: [driverUserId, passengerUserId, outsiderUserId] },
      },
    });
    await database.close();
  });

  it("rejects non-participants and pending bookings", async () => {
    await expect(
      chat.listMessages(outsiderUserId, bookingId, { limit: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      chat.listMessages(outsiderUserId, pendingBookingId, { limit: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("persists an idempotent message and notifies its recipient", async () => {
    const clientMessageId = randomUUID();
    const first = await chat.sendMessage(passengerUserId, bookingId, {
      clientMessageId,
      body: "I am at the pickup point",
    });
    const repeated = await chat.sendMessage(passengerUserId, bookingId, {
      clientMessageId,
      body: "I am at the pickup point",
    });

    expect(repeated.id).toBe(first.id);
    expect(
      await database.client.chatMessage.count({ where: { bookingId } }),
    ).toBe(1);
    expect(
      await database.client.userNotification.count({
        where: { userId: driverUserId, kind: "chat_message" },
      }),
    ).toBe(1);
  });

  it("paginates messages and advances read receipts", async () => {
    const reply = await chat.sendMessage(driverUserId, bookingId, {
      clientMessageId: randomUUID(),
      body: "I can see you",
    });
    const firstPage = await chat.listMessages(passengerUserId, bookingId, {
      limit: 1,
    });

    expect(firstPage.items.map((message) => message.id)).toEqual([reply.id]);
    expect(firstPage.nextCursor).toBe(reply.id);
    expect(firstPage.unreadCount).toBe(1);

    const secondPage = await chat.listMessages(passengerUserId, bookingId, {
      cursor: reply.id,
      limit: 1,
    });
    expect(secondPage.items).toHaveLength(1);

    await chat.markRead(passengerUserId, bookingId, { messageId: reply.id });
    const readPage = await chat.listMessages(passengerUserId, bookingId, {
      limit: 10,
    });
    expect(readPage.unreadCount).toBe(0);
  });

  it("keeps cancelled conversations readable and blocks new sends", async () => {
    await database.client.rideBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    await expect(
      chat.sendMessage(passengerUserId, bookingId, {
        clientMessageId: randomUUID(),
        body: "This should not send",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      chat.listMessages(passengerUserId, bookingId, { limit: 10 }),
    ).resolves.toMatchObject({ unreadCount: 0 });
  });
});
