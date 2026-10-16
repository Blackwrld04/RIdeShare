import { UserStatus } from "@commuteshare/database";
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Optional,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { DatabaseService } from "../infrastructure/database.service.js";
import { type AccessIdentity, TokenService } from "./token.service.js";

export const IS_OPTIONAL_AUTH = "isOptionalAuth";
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH, true);

export interface AuthenticatedRequest extends FastifyRequest {
  auth: AccessIdentity;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Optional() @Inject(Reflector) private readonly reflector?: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isOptional = this.reflector?.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      if (isOptional) {
        request.auth = { userId: "", sessionId: "" } as any;
        return true;
      }
      throw new UnauthorizedException("Access token required");
    }

    try {
      const identity = await this.tokens.verifyAccessToken(token);
      const session = await this.database.client.authSession.findFirst({
        where: {
          id: identity.sessionId,
          userId: identity.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { status: UserStatus.ACTIVE },
        },
        select: { id: true },
      });

      if (!session) {
        if (isOptional) {
          request.auth = { userId: "", sessionId: "" } as any;
          return true;
        }
        throw new UnauthorizedException("Session is no longer active");
      }

      request.auth = identity;
      return true;
    } catch (err) {
      if (isOptional) {
        request.auth = { userId: "", sessionId: "" } as any;
        return true;
      }
      throw err;
    }
  }
}
