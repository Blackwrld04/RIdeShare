import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { BookingModule } from "./bookings/booking.module.js";
import { DriverModule } from "./driver/driver.module.js";
import { HealthController } from "./health.controller.js";
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js";
import { ProfileModule } from "./profiles/profile.module.js";
import { RideModule } from "./rides/ride.module.js";
import { UploadModule } from "./uploads/upload.module.js";

@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    BookingModule,
    ProfileModule,
    DriverModule,
    UploadModule,
    RideModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
