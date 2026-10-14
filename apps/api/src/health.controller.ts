import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  type ReadinessReport,
  ReadinessService,
} from "./infrastructure/readiness.service.js";

@Controller()
export class HealthController {
  constructor(
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
  ) {}

  @Get("health")
  health(): { status: "ok"; service: "api"; timestamp: string } {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async ready(): Promise<ReadinessReport> {
    const report = await this.readiness.check();

    if (report.status === "error") {
      throw new ServiceUnavailableException(report);
    }

    return report;
  }
}
