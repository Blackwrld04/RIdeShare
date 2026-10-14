import { UserStatus } from "@commuteshare/database";
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { DatabaseService } from "../infrastructure/database.service.js";
import { type AccessIdentity, TokenService } from "./token.service.js";

export interface AuthenticatedRequest extends FastifyRequest {
  auth: AccessIdentity;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Access token required");
    }

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
      throw new UnauthorizedException("Session is no longer active");
    }

    request.auth = identity;
    return true;
  }
}
