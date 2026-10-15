import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdminReportController } from "./admin-report.controller.js";
import { ReportController } from "./report.controller.js";
import { ReportService } from "./report.service.js";

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [ReportController, AdminReportController],
  providers: [ReportService],
})
export class ReportModule {}
