import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { BankModule } from "./bank/bank.module.js";
import { BookingModule } from "./bookings/booking.module.js";
import { DriverModule } from "./driver/driver.module.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "./identity/identity.module.js";
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js";
import { PaymentModule } from "./payments/payment.module.js";
import { ProfileModule } from "./profiles/profile.module.js";
import { RideModule } from "./rides/ride.module.js";
import { TripModule } from "./trips/trip.module.js";
import { UploadModule } from "./uploads/upload.module.js";

@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    IdentityModule,
    BankModule,
    PaymentModule,
    BookingModule,
    ProfileModule,
    DriverModule,
    UploadModule,
    RideModule,
    TripModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
