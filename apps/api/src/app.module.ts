import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { BankModule } from "./bank/bank.module.js";
import { BookingModule } from "./bookings/booking.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { DriverModule } from "./driver/driver.module.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "./identity/identity.module.js";
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js";
import { NotificationModule } from "./notifications/notification.module.js";
import { PaymentModule } from "./payments/payment.module.js";
import { ProfileModule } from "./profiles/profile.module.js";
import { ReportModule } from "./reports/report.module.js";
import { ReviewModule } from "./reviews/review.module.js";
import { RideModule } from "./rides/ride.module.js";
import { SafetyModule } from "./safety/safety.module.js";
import { TripModule } from "./trips/trip.module.js";
import { UploadModule } from "./uploads/upload.module.js";

@Module({
  imports: [
    InfrastructureModule,
    AdminModule,
    AuthModule,
    IdentityModule,
    NotificationModule,
    BankModule,
    PaymentModule,
    BookingModule,
    ChatModule,
    ReviewModule,
    ReportModule,
    ProfileModule,
    DriverModule,
    UploadModule,
    RideModule,
    SafetyModule,
    TripModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
