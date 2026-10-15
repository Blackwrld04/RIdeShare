import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { buildApiErrorResponse } from "./api-exception.filter.js";

const context = {
  path: "/api/v1/example",
  requestId: "request-id",
  timestamp: "2026-10-14T20:00:00.000Z",
};

describe("API exception responses", () => {
  it("preserves structured client-safe validation details", () => {
    expect(
      buildApiErrorResponse(
        new BadRequestException({
          code: "VALIDATION_ERROR",
          issues: [{ path: "name", message: "Required" }],
        }),
        context,
      ),
    ).toEqual({
      ...context,
      statusCode: 400,
      code: "VALIDATION_ERROR",
      error: "Bad Request",
      message: "Bad Request",
      details: { issues: [{ path: "name", message: "Required" }] },
    });
  });

  it("preserves explicit retry metadata", () => {
    expect(
      buildApiErrorResponse(
        new HttpException(
          {
            code: "RATE_LIMITED",
            message: "Try again later",
            retryAfterSeconds: 30,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
        context,
      ),
    ).toMatchObject({
      statusCode: 429,
      code: "RATE_LIMITED",
      message: "Try again later",
      details: { retryAfterSeconds: 30 },
    });
  });

  it("preserves structured errors thrown by Fastify plugins", () => {
    expect(
      buildApiErrorResponse(
        {
          statusCode: 429,
          code: "RATE_LIMITED",
          error: "Too Many Requests",
          message: "Request rate limit exceeded",
          details: { retryAfterSeconds: 30 },
        },
        context,
      ),
    ).toEqual({
      ...context,
      statusCode: 429,
      code: "RATE_LIMITED",
      error: "Too Many Requests",
      message: "Request rate limit exceeded",
      details: { retryAfterSeconds: 30 },
    });
  });

  it("uses normalized status names for framework errors", () => {
    expect(
      buildApiErrorResponse(new HttpException("Missing", 404), context),
    ).toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("does not expose unknown error messages", () => {
    expect(
      buildApiErrorResponse(new Error("database secret"), context),
    ).toEqual({
      ...context,
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  });
});
