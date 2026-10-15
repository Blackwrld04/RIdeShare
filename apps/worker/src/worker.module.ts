import { Module } from "@nestjs/common";
import { appConfigProvider } from "./config.provider.js";
import { SchedulingRuntimeService } from "./scheduling-runtime.service.js";
import { WebPushRuntimeService } from "./web-push-runtime.service.js";
import { WorkerRuntimeService } from "./worker-runtime.service.js";

@Module({
  providers: [
    appConfigProvider,
    WorkerRuntimeService,
    SchedulingRuntimeService,
    WebPushRuntimeService,
  ],
})
export class WorkerModule {}
