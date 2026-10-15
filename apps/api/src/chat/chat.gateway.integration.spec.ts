import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  DriverApplicationStatus,
  RideStatus,
} from "@commuteshare/database";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { io, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthModule } from "../auth/auth.module.js";
import { TokenService } from "../auth/token.service.js";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import { InfrastructureModule } from "../infrastructure/infrastructure.module.js";
import { RedisIoAdapter } from "../infrastructure/redis-io.adapter.js";
import { ChatModule } from "./chat.module.js";

@Module({ imports: [InfrastructureModule, AuthModule, ChatModule] })
class RealtimeChatTestModule {}

const describeIntegration =
  process.env.REALTIME_CHAT_TEST_DATABASE_URL &&
  process.env.REALTIME_CHAT_TEST_REDIS_URL
    ? describe
    : describe.skip;

describeIntegration("realtime chat gateway integration", () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let baseUrl: string;
  let driverUserId: string;
  let passengerUserId: string;
  let rideId: string;
  let bookingId: string;
  let driverSocket: Socket;
  let passengerSocket: Socket;

  beforeAll(async () => {
    const databaseUrl = process.env.REALTIME_CHAT_TEST_DATABASE_URL;
    const redisUrl = process.env.REALTIME_CHAT_TEST_REDIS_URL;
    if (!databaseUrl || !redisUrl) {
      throw new Error("Realtime chat test services are required");
    }
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: redisUrl,
      AUTH_ACCESS_TOKEN_SECRET: "test-access-secret-at-least-32-characters",
      AUTH_REFRESH_TOKEN_SECRET: "test-refresh-secret-at-least-32-characters",
      OTP_HMAC_SECRET: "test-otp-secret-at-least-32-characters-long",
      OTP_DEV_CODE: "123456",
      NINJA_PUBLIC_KEY: "test-public-key",
      NINJA_SECRET_KEY: "test-secret-key",
      IDENTITY_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      IDENTITY_HMAC_SECRET: "test-identity-secret-at-least-32-characters",
      PAYSTACK_SECRET_KEY: "sk_test_commuteshare_realtime",
      STORAGE_BUCKET: "commuteshare-test",
      STORAGE_ACCESS_KEY_ID: "test-access-key",
      STORAGE_SECRET_ACCESS_KEY: "test-storage-secret",
    });
    app = await NestFactory.create<NestFastifyApplication>(
      RealtimeChatTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    const config = app.get(APP_CONFIG);
    const adapter = new RedisIoAdapter(app, config);
    await adapter.connect();
    app.useWebSocketAdapter(adapter);
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
    database = app.get(DatabaseService);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
    const [driver, passenger] = await Promise.all([
      database.client.user.create({
        data: {
          phoneE164: `+234841${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Realtime Driver" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234842${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Realtime Passenger" } },
        },
      }),
    ]);
    driverUserId = driver.id;
    passengerUserId = passenger.id;
    const application = await database.client.driverApplication.create({
      data: {
        userId: driver.id,
        status: DriverApplicationStatus.APPROVED,
      },
    });
    const ride = await database.client.rideOffer.create({
      data: {
        driverApplicationId: application.id,
        status: RideStatus.PUBLISHED,
        departureAt: new Date(Date.now() + 60 * 60 * 1_000),
        passengerSeats: 3,
        contributionKobo: 200_000n,
      },
    });
    rideId = ride.id;
    const booking = await database.client.rideBooking.create({
      data: {
        rideOfferId: ride.id,
        passengerUserId: passenger.id,
        seats: 1,
        status: BookingStatus.CONFIRMED,
        unitContributionKobo: 200_000n,
        totalContributionKobo: 200_000n,
        currency: "NGN",
      },
    });
    bookingId = booking.id;
    const tokens = app.get(TokenService);
    const [driverToken, passengerToken] = await Promise.all([
      createSessionToken(database, tokens, driver.id),
      createSessionToken(database, tokens, passenger.id),
    ]);
    driverSocket = await connectSocket(baseUrl, driverToken);
    passengerSocket = await connectSocket(baseUrl, passengerToken);
    await Promise.all([
      emitWithAck(driverSocket, "chat:join", { bookingId }),
      emitWithAck(passengerSocket, "chat:join", { bookingId }),
    ]);
  });

  afterAll(async () => {
    driverSocket?.disconnect();
    passengerSocket?.disconnect();
    if (database) {
      await database.client.authSession.deleteMany({
        where: { userId: { in: [driverUserId, passengerUserId] } },
      });
      await database.client.userNotification.deleteMany({
        where: { userId: { in: [driverUserId, passengerUserId] } },
      });
      await database.client.rideOffer.deleteMany({ where: { id: rideId } });
      await database.client.user.deleteMany({
        where: { id: { in: [driverUserId, passengerUserId] } },
      });
    }
    await app?.close();
  });

  it("broadcasts persisted and sanitized messages to the ride room", async () => {
    const received = onceEvent(driverSocket, "chat:message");
    const acknowledgement = await emitWithAck(passengerSocket, "chat:send", {
      bookingId,
      clientMessageId: randomUUID(),
      body: "Send it to my account instead",
    });
    const message = await received;
    expect(acknowledgement).toMatchObject({ bookingId });
    expect(message).toMatchObject({
      bookingId,
      sender: { userId: passengerUserId },
      body: "[payment request removed] instead",
    });
    if (typeof message.id !== "string") {
      throw new Error("Realtime message did not include an identifier");
    }
    await expect(
      database.client.chatMessage.findUniqueOrThrow({
        where: { id: message.id },
      }),
    ).resolves.toMatchObject({ body: "[payment request removed] instead" });
  });
});

async function createSessionToken(
  database: DatabaseService,
  tokens: TokenService,
  userId: string,
): Promise<string> {
  const sessionId = randomUUID();
  await database.client.authSession.create({
    data: {
      id: sessionId,
      userId,
      refreshTokenDigest: randomUUID().replaceAll("-", "").padEnd(64, "0"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    },
  });
  return tokens.createAccessToken({ userId, sessionId });
}

async function connectSocket(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/chat`, {
      auth: { token },
      forceNew: true,
      transports: ["websocket"],
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

async function emitWithAck(
  socket: Socket,
  event: string,
  data: unknown,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(5_000)
      .emit(
        event,
        data,
        (error: Error | null, response: Record<string, unknown>) => {
          if (error) {
            reject(new Error(`${event}: ${error.message}`));
          } else {
            resolve(response);
          }
        },
      );
  });
}

async function onceEvent(
  socket: Socket,
  event: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`${event} timed out`)),
      5_000,
    );
    socket.once(event, (data: Record<string, unknown>) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}
