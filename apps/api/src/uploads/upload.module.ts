import type { AppConfig } from "@commuteshare/config";
import { Module, type Provider } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { APP_CONFIG } from "../config.provider.js";
import { ObjectStorage, S3ObjectStorage } from "./object-storage.js";
import { UploadController } from "./upload.controller.js";
import { UploadService } from "./upload.service.js";

const objectStorageProvider: Provider<ObjectStorage> = {
  provide: ObjectStorage,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) => new S3ObjectStorage(config),
};

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [objectStorageProvider, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
