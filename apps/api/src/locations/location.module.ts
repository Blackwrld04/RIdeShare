import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdminLandmarkController } from "./admin-landmark.controller.js";
import { GeocodingService } from "./geocoding.service.js";
import { LocationController } from "./location.controller.js";
import { LocationService } from "./location.service.js";

@Module({
  imports: [AdminModule, AuthModule],
  controllers: [LocationController, AdminLandmarkController],
  providers: [LocationService, GeocodingService],
  exports: [LocationService],
})
export class LocationModule {}
