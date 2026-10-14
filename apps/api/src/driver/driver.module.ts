import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DriverController } from "./driver.controller.js";
import { DriverService } from "./driver.service.js";

@Module({
  imports: [AuthModule],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
