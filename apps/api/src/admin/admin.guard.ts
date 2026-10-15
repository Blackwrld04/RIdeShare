import { UserRole, UserStatus } from "@commuteshare/database";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/access-token.guard.js";
import { DatabaseService } from "../infrastructure/database.service.js";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const operator = await this.database.client.user.findUnique({
      where: { id: request.auth.userId },
      select: { role: true, status: true },
    });
    const allowed =
      operator?.status === UserStatus.ACTIVE &&
      (operator.role === UserRole.REVIEWER || operator.role === UserRole.ADMIN);

    if (!allowed) {
      throw new ForbiddenException("Reviewer access required");
    }
    return true;
  }
}
