import { Prisma } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { normalizeNigerianPhone } from "../auth/phone-number.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import type { CreateEmergencyContactInput } from "./safety.schemas.js";

export interface EmergencyContactResponse {
  id: string;
  name: string;
  phoneE164: string;
  relationship: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class EmergencyContactService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async list(userId: string): Promise<EmergencyContactResponse[]> {
    const contacts = await this.database.client.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return contacts.map((contact) => this.toResponse(contact));
  }

  async create(
    userId: string,
    input: CreateEmergencyContactInput,
  ): Promise<EmergencyContactResponse> {
    let phoneE164: string;
    try {
      phoneE164 = normalizeNigerianPhone(input.phone);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid phone number";
      throw new BadRequestException(message);
    }

    try {
      const contact = await this.database.client.$transaction(
        async (transaction) => {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`,
          );
          const count = await transaction.emergencyContact.count({
            where: { userId },
          });
          if (count >= 5) {
            throw new BadRequestException(
              "A maximum of five emergency contacts is allowed",
            );
          }
          const isPrimary = input.isPrimary || count === 0;
          if (isPrimary) {
            await transaction.emergencyContact.updateMany({
              where: { userId, isPrimary: true },
              data: { isPrimary: false },
            });
          }
          return transaction.emergencyContact.create({
            data: {
              userId,
              name: input.name,
              phoneE164,
              ...(input.relationship
                ? { relationship: input.relationship }
                : {}),
              isPrimary,
            },
          });
        },
      );
      return this.toResponse(contact);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Emergency contact already exists");
      }
      throw error;
    }
  }

  async remove(userId: string, contactId: string): Promise<void> {
    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`,
      );
      const contact = await transaction.emergencyContact.findFirst({
        where: { id: contactId, userId },
      });
      if (!contact) {
        throw new NotFoundException("Emergency contact not found");
      }
      await transaction.emergencyContact.delete({ where: { id: contact.id } });
      if (contact.isPrimary) {
        const replacement = await transaction.emergencyContact.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (replacement) {
          await transaction.emergencyContact.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
        }
      }
    });
  }

  private toResponse(contact: {
    id: string;
    name: string;
    phoneE164: string;
    relationship: string | null;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): EmergencyContactResponse {
    return {
      id: contact.id,
      name: contact.name,
      phoneE164: contact.phoneE164,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }
}
