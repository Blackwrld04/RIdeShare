import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

interface ApiErrorContext {
  path: string;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorResponse extends ApiErrorContext {
  statusCode: number;
  code: string;
  error: string;
  message: string | string[];
  details?: Record<string, unknown>;
}

function statusLabel(statusCode: number): string {
  const name = HttpStatus[statusCode];
  return typeof name === "string"
    ? name
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Error";
}

function statusCodeName(statusCode: number): string {
  const name = HttpStatus[statusCode];
  return typeof name === "string" ? name : "HTTP_ERROR";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStructuredHttpError(
  value: unknown,
): value is Record<string, unknown> & { statusCode: number } {
  return (
    isRecord(value) &&
    Number.isInteger(value.statusCode) &&
    Number(value.statusCode) >= 400 &&
    Number(value.statusCode) <= 599
  );
}

export function buildApiErrorResponse(
  exception: unknown,
  context: ApiErrorContext,
): ApiErrorResponse {
  if (!(exception instanceof HttpException)) {
    if (isStructuredHttpError(exception)) {
      const statusCode = exception.statusCode;
      const label = statusLabel(statusCode);
      const details = isRecord(exception.details)
        ? exception.details
        : undefined;
      return {
        ...context,
        statusCode,
        code:
          typeof exception.code === "string"
            ? exception.code
            : statusCodeName(statusCode),
        error: typeof exception.error === "string" ? exception.error : label,
        message:
          typeof exception.message === "string" ||
          (Array.isArray(exception.message) &&
            exception.message.every((entry) => typeof entry === "string"))
            ? (exception.message as string | string[])
            : label,
        ...(details ? { details } : {}),
      };
    }

    return {
      ...context,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_SERVER_ERROR",
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
  }

  const statusCode = exception.getStatus();
  const response = exception.getResponse();
  const label = statusLabel(statusCode);
  if (typeof response === "string") {
    return {
      ...context,
      statusCode,
      code: statusCodeName(statusCode),
      error: label,
      message: response,
    };
  }

  const source = response as Record<string, unknown>;
  const message =
    typeof source.message === "string" || Array.isArray(source.message)
      ? (source.message as string | string[])
      : label;
  const code =
    typeof source.code === "string" ? source.code : statusCodeName(statusCode);
  const details = Object.fromEntries(
    Object.entries(source).filter(
      ([key]) => !["statusCode", "code", "error", "message"].includes(key),
    ),
  );

  return {
    ...context,
    statusCode,
    code,
    error: typeof source.error === "string" ? source.error : label,
    message,
    ...(Object.keys(details).length > 0 ? { details } : {}),
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const response = buildApiErrorResponse(exception, {
      path: request.url,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });

    if (
      !(exception instanceof HttpException) &&
      !isStructuredHttpError(exception)
    ) {
      const trace = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`Unhandled request error ${request.id}`, trace);
    }
    reply.status(response.statusCode).send(response);
  }
}
