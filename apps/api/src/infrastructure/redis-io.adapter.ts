import type { AppConfig } from "@commuteshare/config";
import type { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, type RedisClientType } from "redis";
import type { Server, ServerOptions } from "socket.io";

export class RedisIoAdapter extends IoAdapter {
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly config: AppConfig,
  ) {
    super(app);
  }

  async connect(): Promise<void> {
    this.publisher = createClient({ url: this.config.REDIS_URL });
    this.subscriber = this.publisher.duplicate();
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    if (!this.publisher || !this.subscriber) {
      throw new Error("Realtime Redis adapter is not connected");
    }
    const ioOptions = {
      ...options,
      cors: {
        origin: this.config.CORS_ORIGINS,
        credentials: false,
        methods: ["GET", "POST"],
      },
    } as ServerOptions;
    const server = super.createIOServer(port, ioOptions);
    server.adapter(createAdapter(this.publisher, this.subscriber));
    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    const clients = [this.publisher, this.subscriber];
    this.publisher = null;
    this.subscriber = null;
    await Promise.all(
      clients.map(async (client) => {
        if (client?.isOpen) {
          await client.quit();
        }
      }),
    );
  }
}
