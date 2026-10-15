import { Prisma } from "@commuteshare/database";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import type { UpdateProfileInput } from "./profile.schemas.js";

export interface ProfileResponse {
  id: string;
  phone: string;
  status: string;
  displayName: string | null;
  billingEmail: string | null;
  bio: string | null;
  gender: string | null;
  timezone: string;
  profileComplete: boolean;
}

@Injectable()
export class ProfileService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async get(userId: string): Promise<ProfileResponse> {
    const user = await this.database.client.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.profile) {
      throw new NotFoundException("Profile not found");
    }

    return {
      id: user.id,
      phone: user.phoneE164,
      status: user.status,
      displayName: user.profile.displayName,
      billingEmail: user.profile.billingEmail,
      bio: user.profile.bio,
      gender: user.profile.gender,
      timezone: user.profile.timezone,
      profileComplete: Boolean(user.profile.displayName),
    };
  }

  async update(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<ProfileResponse> {
    try {
      await this.database.client.userProfile.update({
        where: { userId },
        data: {
          ...(input.displayName !== undefined
            ? { displayName: input.displayName }
            : {}),
          ...(input.billingEmail !== undefined
            ? { billingEmail: input.billingEmail }
            : {}),
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Billing email is already in use");
      }
      throw error;
    }

    return this.get(userId);
  }
}
