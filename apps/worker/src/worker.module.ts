import { Module } from "@nestjs/common";
import { appConfigProvider } from "./config.provider.js";
import { WorkerRuntimeService } from "./worker-runtime.service.js";

@Module({
  providers: [appConfigProvider, WorkerRuntimeService],
})
export class WorkerModule {}
