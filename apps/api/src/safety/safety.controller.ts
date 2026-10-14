import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type EmergencyContactResponse,
  EmergencyContactService,
} from "./emergency-contact.service.js";
import {
  type CreatedShareLinkResponse,
  type LocationPingResponse,
  RideSafetyService,
  type SafetyAlertResponse,
  type ShareLinkResponse,
} from "./ride-safety.service.js";
import {
  type CreateEmergencyContactInput,
  type CreateShareLinkInput,
  type CreateSosAlertInput,
  createEmergencyContactSchema,
  createShareLinkSchema,
  createSosAlertSchema,
  emergencyContactIdSchema,
  type LocationPingInput,
  locationPingSchema,
  type ResolveSosAlertInput,
  resolveSosAlertSchema,
  safetyAlertIdSchema,
  safetyRideIdSchema,
  shareLinkIdSchema,
} from "./safety.schemas.js";

@Controller("safety")
@UseGuards(AccessTokenGuard)
export class SafetyController {
  constructor(
    @Inject(EmergencyContactService)
    private readonly contacts: EmergencyContactService,
    @Inject(RideSafetyService)
    private readonly safety: RideSafetyService,
  ) {}

  @Get("contacts")
  listContacts(
    @Req() request: AuthenticatedRequest,
  ): Promise<EmergencyContactResponse[]> {
    return this.contacts.list(request.auth.userId);
  }

  @Post("contacts")
  createContact(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createEmergencyContactSchema))
    input: CreateEmergencyContactInput,
  ): Promise<EmergencyContactResponse> {
    return this.contacts.create(request.auth.userId, input);
  }

  @Delete("contacts/:contactId")
  @HttpCode(204)
  removeContact(
    @Req() request: AuthenticatedRequest,
    @Param("contactId", new ZodValidationPipe(emergencyContactIdSchema))
    contactId: string,
  ): Promise<void> {
    return this.contacts.remove(request.auth.userId, contactId);
  }

  @Get("rides/:rideId/share-links")
  listShareLinks(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(safetyRideIdSchema))
    rideId: string,
  ): Promise<ShareLinkResponse[]> {
    return this.safety.listShareLinks(request.auth.userId, rideId);
  }

  @Post("rides/:rideId/share-links")
  createShareLink(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(safetyRideIdSchema))
    rideId: string,
    @Body(new ZodValidationPipe(createShareLinkSchema))
    input: CreateShareLinkInput,
  ): Promise<CreatedShareLinkResponse> {
    return this.safety.createShareLink(request.auth.userId, rideId, input);
  }

  @Delete("share-links/:linkId")
  @HttpCode(204)
  revokeShareLink(
    @Req() request: AuthenticatedRequest,
    @Param("linkId", new ZodValidationPipe(shareLinkIdSchema)) linkId: string,
  ): Promise<void> {
    return this.safety.revokeShareLink(request.auth.userId, linkId);
  }

  @Post("rides/:rideId/location")
  recordLocation(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(safetyRideIdSchema))
    rideId: string,
    @Body(new ZodValidationPipe(locationPingSchema)) input: LocationPingInput,
  ): Promise<LocationPingResponse> {
    return this.safety.recordLocation(request.auth.userId, rideId, input);
  }

  @Post("rides/:rideId/sos")
  createSosAlert(
    @Req() request: AuthenticatedRequest,
    @Param("rideId", new ZodValidationPipe(safetyRideIdSchema))
    rideId: string,
    @Body(new ZodValidationPipe(createSosAlertSchema))
    input: CreateSosAlertInput,
  ): Promise<SafetyAlertResponse> {
    return this.safety.createSosAlert(request.auth.userId, rideId, input);
  }

  @Get("alerts")
  listAlerts(
    @Req() request: AuthenticatedRequest,
  ): Promise<SafetyAlertResponse[]> {
    return this.safety.listAlerts(request.auth.userId);
  }

  @Post("alerts/:alertId/resolve")
  @HttpCode(200)
  resolveAlert(
    @Req() request: AuthenticatedRequest,
    @Param("alertId", new ZodValidationPipe(safetyAlertIdSchema))
    alertId: string,
    @Body(new ZodValidationPipe(resolveSosAlertSchema))
    input: ResolveSosAlertInput,
  ): Promise<SafetyAlertResponse> {
    return this.safety.resolveAlert(request.auth.userId, alertId, input);
  }
}
