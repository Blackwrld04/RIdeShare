import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { UploadModule } from "../uploads/upload.module.js";
import { AdminController } from "./admin.controller.js";
import { AdminGuard } from "./admin.guard.js";
import { AdminService } from "./admin.service.js";

@Module({
  imports: [AuthModule, UploadModule],
  controllers: [AdminController],
  providers: [AdminGuard, AdminService],
})
export class AdminModule {}
