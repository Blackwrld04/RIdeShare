import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { RideController } from "./ride.controller.js";
import { RideService } from "./ride.service.js";

@Module({
  imports: [AuthModule],
  controllers: [RideController],
  providers: [RideService],
})
export class RideModule {}
