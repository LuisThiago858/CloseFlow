import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import type {
  AuthenticatedPrincipal,
  PublicSession,
  PublicUser,
} from '../domain/identity.types';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { ListSessionsUseCase } from '../application/use-cases/list-sessions.use-case';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { LogoutCurrentSessionUseCase } from '../application/use-cases/logout-current-session.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { RevokeSessionUseCase } from '../application/use-cases/revoke-session.use-case';
import {
  LoginRequestDto,
  ProblemDetailsDto,
  RegisterRequestDto,
  SessionsResponseDto,
  UserResponseDto,
} from './auth-api.dto';
import {
  loginRequestSchema,
  type LoginRequest,
  registerRequestSchema,
  type RegisterRequest,
  sessionIdSchema,
} from './auth.schemas';
import { CurrentPrincipal } from './authenticated-principal';
import { BrowserMutationGuard } from './browser-mutation.guard';
import { JsonBodyGuard } from './json-body.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionCookieService } from './session-cookie.service';
import { ZodValidationPipe } from './zod-validation.pipe';

interface UserResponse {
  user: PublicUser;
}

interface SessionsResponse {
  sessions: PublicSession[];
}

const problemDetailsContent = {
  'application/problem+json': {
    schema: { $ref: getSchemaPath(ProblemDetailsDto) },
  },
};

@ApiTags('auth')
@ApiExtraModels(ProblemDetailsDto)
@Controller('auth')
export class AuthController {
  public constructor(
    @Inject(RegisterUserUseCase)
    private readonly registerUser: RegisterUserUseCase,
    @Inject(LoginUserUseCase) private readonly loginUser: LoginUserUseCase,
    @Inject(LogoutCurrentSessionUseCase)
    private readonly logoutCurrentSession: LogoutCurrentSessionUseCase,
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUser: GetCurrentUserUseCase,
    @Inject(ListSessionsUseCase)
    private readonly listSessions: ListSessionsUseCase,
    @Inject(RevokeSessionUseCase)
    private readonly revokeSession: RevokeSessionUseCase,
    @Inject(SessionCookieService)
    private readonly sessionCookie: SessionCookieService,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthController.name);
  }

  @Post('register')
  @UseGuards(BrowserMutationGuard, JsonBodyGuard, ThrottlerGuard)
  @ApiOperation({ summary: 'Cria uma conta local e inicia uma sessão' })
  @ApiBody({ type: RegisterRequestDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description: 'E-mail já cadastrado ou conflito de persistência.',
    content: problemDetailsContent,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Dados inválidos.',
    content: problemDetailsContent,
  })
  @ApiForbiddenResponse({
    description: 'Origem não permitida.',
    content: problemDetailsContent,
  })
  @ApiTooManyRequestsResponse({
    description: 'Limite de tentativas excedido.',
    content: problemDetailsContent,
  })
  public async register(
    @Body(new ZodValidationPipe(registerRequestSchema)) input: RegisterRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const result = await this.registerUser.execute(input);
    this.sessionCookie.set(response, result.rawToken, result.expiresAt);
    this.logSuccess('auth.register');
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(BrowserMutationGuard, JsonBodyGuard, ThrottlerGuard)
  @ApiOperation({ summary: 'Autentica por e-mail e senha' })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Credenciais inválidas.',
    content: problemDetailsContent,
  })
  @ApiConflictResponse({
    description: 'Conflito de persistência.',
    content: problemDetailsContent,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Dados inválidos.',
    content: problemDetailsContent,
  })
  @ApiForbiddenResponse({
    description: 'Origem não permitida.',
    content: problemDetailsContent,
  })
  @ApiTooManyRequestsResponse({
    description: 'Limite de tentativas excedido.',
    content: problemDetailsContent,
  })
  public async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) input: LoginRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const result = await this.loginUser.execute(input);
    this.sessionCookie.set(response, result.rawToken, result.expiresAt);
    this.logSuccess('auth.login');
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(BrowserMutationGuard)
  @ApiOperation({ summary: 'Encerra a sessão atual de forma idempotente' })
  @ApiNoContentResponse({ description: 'Sessão encerrada ou já ausente.' })
  @ApiForbiddenResponse({
    description: 'Origem não permitida.',
    content: problemDetailsContent,
  })
  public async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logoutCurrentSession.execute(this.sessionCookie.read(request));
    this.sessionCookie.clear(response);
    this.logSuccess('auth.logout');
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth('sessionCookie')
  @ApiOperation({ summary: 'Retorna o usuário da sessão atual' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Sessão ausente ou inválida.',
    content: problemDetailsContent,
  })
  public async me(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<UserResponse> {
    return { user: await this.getCurrentUser.execute(principal.userId) };
  }

  @Get('sessions')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth('sessionCookie')
  @ApiOperation({ summary: 'Lista as sessões ativas do usuário atual' })
  @ApiOkResponse({ type: SessionsResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Sessão ausente ou inválida.',
    content: problemDetailsContent,
  })
  public async sessions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<SessionsResponse> {
    return {
      sessions: await this.listSessions.execute(
        principal.userId,
        principal.sessionId,
      ),
    };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(204)
  @UseGuards(BrowserMutationGuard, SessionAuthGuard)
  @ApiCookieAuth('sessionCookie')
  @ApiOperation({ summary: 'Revoga uma sessão pertencente ao usuário atual' })
  @ApiNoContentResponse({ description: 'Sessão revogada.' })
  @ApiUnauthorizedResponse({
    description: 'Sessão atual ausente ou inválida.',
    content: problemDetailsContent,
  })
  @ApiNotFoundResponse({
    description: 'Sessão não encontrada.',
    content: problemDetailsContent,
  })
  @ApiForbiddenResponse({
    description: 'Origem não permitida.',
    content: problemDetailsContent,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Identificador de sessão inválido.',
    content: problemDetailsContent,
  })
  public async revoke(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('sessionId', new ZodValidationPipe(sessionIdSchema, 'sessionId'))
    sessionId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const result = await this.revokeSession.execute(
      principal.userId,
      principal.sessionId,
      sessionId,
    );
    if (result.revokedCurrentSession) {
      this.sessionCookie.clear(response);
    }
    this.logSuccess('auth.session.revoke');
  }

  private logSuccess(action: string): void {
    this.logger.info(
      { action, result: 'success' },
      'Operação de autenticação concluída.',
    );
  }
}
