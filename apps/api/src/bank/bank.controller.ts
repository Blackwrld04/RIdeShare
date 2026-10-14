import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type ResolveBankAccountInput,
  resolveBankAccountSchema,
} from "./bank.schemas.js";
import {
  type BankAccountResponse,
  type BankResponse,
  BankService,
} from "./bank.service.js";

@Controller("bank")
@UseGuards(AccessTokenGuard)
export class BankController {
  constructor(@Inject(BankService) private readonly banks: BankService) {}

  @Get()
  listBanks(): Promise<BankResponse[]> {
    return this.banks.listBanks();
  }

  @Get("account")
  getMine(
    @Req() request: AuthenticatedRequest,
  ): Promise<BankAccountResponse | null> {
    return this.banks.getMine(request.auth.userId);
  }

  @Post("resolve")
  resolve(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(resolveBankAccountSchema))
    input: ResolveBankAccountInput,
  ): Promise<BankAccountResponse> {
    return this.banks.resolve(request.auth.userId, input);
  }
}
