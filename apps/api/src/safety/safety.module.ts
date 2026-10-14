import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { EmergencyContactService } from "./emergency-contact.service.js";
import { PublicSafetyController } from "./public-safety.controller.js";
import { RideSafetyService } from "./ride-safety.service.js";
import { SafetyController } from "./safety.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [SafetyController, PublicSafetyController],
  providers: [EmergencyContactService, RideSafetyService],
})
export class SafetyModule {}
