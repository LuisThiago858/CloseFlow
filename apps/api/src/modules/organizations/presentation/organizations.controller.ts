import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';

import { BrowserMutationGuard } from '../../../common/http/browser-mutation.guard';
import { JsonBodyGuard } from '../../../common/http/json-body.guard';
import { ProblemDetailsDto } from '../../../common/http/problem-details.dto';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import {
  type AuthenticatedPrincipal,
  CurrentPrincipal,
} from '../../identity/identity.public';
import {
  CreateOrganizationUseCase,
  GetOrganizationUseCase,
  LeaveOrganizationUseCase,
  ListMembersUseCase,
  ListOrganizationsUseCase,
  RemoveMemberUseCase,
  UpdateOrganizationUseCase,
  type OrganizationListResponse,
  type OrganizationWithMembershipResponse,
  type MemberListResponse,
} from '../application/organization-use-cases';
import type {
  PublicOrganization,
  TenantContext,
} from '../domain/organization.types';
import {
  CreateOrganizationRequestDto,
  MembersResponseDto,
  OrganizationResponseDto,
  OrganizationsResponseDto,
  OrganizationWithMembershipResponseDto,
  UpdateOrganizationRequestDto,
} from './organization-api.dto';
import {
  createOrganizationSchema,
  membershipIdSchema,
  membersQuerySchema,
  organizationIdSchema,
  type CreateOrganizationRequest,
  type MembersQuery,
  type UpdateOrganizationRequest,
  updateOrganizationSchema,
} from './organization.schemas';
import { CurrentTenant } from './tenant-context';
import { TenantContextGuard } from './tenant-context.guard';
import { OrganizationsSessionGuard } from './organizations-session.guard';

const problemDetailsContent = {
  'application/problem+json': {
    schema: { $ref: getSchemaPath(ProblemDetailsDto) },
  },
};

@ApiTags('organizations')
@ApiCookieAuth('sessionCookie')
@ApiExtraModels(ProblemDetailsDto)
@UseGuards(OrganizationsSessionGuard)
@Controller('organizations')
export class OrganizationsController {
  public constructor(
    @Inject(CreateOrganizationUseCase)
    private readonly createOrganization: CreateOrganizationUseCase,
    @Inject(ListOrganizationsUseCase)
    private readonly listOrganizations: ListOrganizationsUseCase,
    @Inject(GetOrganizationUseCase)
    private readonly getOrganization: GetOrganizationUseCase,
    @Inject(UpdateOrganizationUseCase)
    private readonly updateOrganization: UpdateOrganizationUseCase,
    @Inject(ListMembersUseCase)
    private readonly listMembers: ListMembersUseCase,
    @Inject(RemoveMemberUseCase)
    private readonly removeMember: RemoveMemberUseCase,
    @Inject(LeaveOrganizationUseCase)
    private readonly leaveOrganization: LeaveOrganizationUseCase,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrganizationsController.name);
  }

  @Post()
  @UseGuards(BrowserMutationGuard, JsonBodyGuard)
  @ApiOperation({
    summary: 'Cria uma organização com o usuário atual como owner',
  })
  @ApiBody({ type: CreateOrganizationRequestDto })
  @ApiCreatedResponse({ type: OrganizationWithMembershipResponseDto })
  @ApiConflictResponse({ content: problemDetailsContent })
  @ApiForbiddenResponse({ content: problemDetailsContent })
  @ApiUnprocessableEntityResponse({ content: problemDetailsContent })
  @ApiUnauthorizedResponse({ content: problemDetailsContent })
  public async create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body(new ZodValidationPipe(createOrganizationSchema))
    input: CreateOrganizationRequest,
  ): Promise<OrganizationWithMembershipResponse> {
    const result = await this.createOrganization.execute({
      userId: principal.userId,
      name: input.name,
      ...(input.slug === undefined ? {} : { slug: input.slug }),
    });
    this.logSuccess('organization.create', result.organization.id);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Lista organizações ativas do usuário atual' })
  @ApiOkResponse({ type: OrganizationsResponseDto })
  @ApiUnauthorizedResponse({ content: problemDetailsContent })
  public async list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<OrganizationListResponse> {
    return this.listOrganizations.execute(principal.userId);
  }

  @Get(':organizationId')
  @UseGuards(TenantContextGuard)
  @ApiHeader({ name: 'X-Organization-Id', required: true })
  @ApiOperation({ summary: 'Obtém a organização do contexto validado' })
  @ApiOkResponse({ type: OrganizationWithMembershipResponseDto })
  @ApiBadRequestResponse({ content: problemDetailsContent })
  @ApiUnauthorizedResponse({ content: problemDetailsContent })
  @ApiNotFoundResponse({ content: problemDetailsContent })
  @ApiUnprocessableEntityResponse({ content: problemDetailsContent })
  public async get(
    @Param(
      'organizationId',
      new ZodValidationPipe(organizationIdSchema, 'organizationId'),
    )
    _organizationId: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<OrganizationWithMembershipResponse> {
    return this.getOrganization.execute(tenant);
  }

  @Patch(':organizationId')
  @UseGuards(TenantContextGuard, BrowserMutationGuard, JsonBodyGuard)
  @ApiHeader({ name: 'X-Organization-Id', required: true })
  @ApiOperation({ summary: 'Altera o nome da organização como owner' })
  @ApiBody({ type: UpdateOrganizationRequestDto })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiBadRequestResponse({ content: problemDetailsContent })
  @ApiUnauthorizedResponse({ content: problemDetailsContent })
  @ApiForbiddenResponse({ content: problemDetailsContent })
  @ApiConflictResponse({ content: problemDetailsContent })
  @ApiNotFoundResponse({ content: problemDetailsContent })
  @ApiUnprocessableEntityResponse({ content: problemDetailsContent })
  public async update(
    @Param(
      'organizationId',
      new ZodValidationPipe(organizationIdSchema, 'organizationId'),
    )
    _organizationId: string,
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(updateOrganizationSchema))
    input: UpdateOrganizationRequest,
  ): Promise<{ organization: PublicOrganization }> {
    const organization = await this.updateOrganization.execute(tenant, input);
    this.logSuccess('organization.update', tenant.organizationId);
    return { organization };
  }

  @Get(':organizationId/members')
  @UseGuards(TenantContextGuard)
  @ApiHeader({ name: 'X-Organization-Id', required: true })
  @ApiOperation({ summary: 'Lista membros ativos da organização' })
  @ApiOkResponse({ type: MembersResponseDto })
  @ApiBadRequestResponse({ content: problemDetailsContent })
  @ApiUnauthorizedResponse({ content: problemDetailsContent })
  @ApiConflictResponse({ content: problemDetailsContent })
  @ApiNotFoundResponse({ content: problemDetailsContent })
  @ApiUnprocessableEntityResponse({ content: problemDetailsContent })
  public async members(
    @Param(
      'organizationId',
      new ZodValidationPipe(organizationIdSchema, 'organizationId'),
    )
    _organizationId: string,
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(membersQuerySchema, 'query'))
    query: MembersQuery,
  ): Promise<MemberListResponse> {
    return this.listMembers.execute(tenant, query.cursor ?? null, query.limit);
  }

  @Delete(':organizationId/members/:membershipId')
  @HttpCode(204)
  @UseGuards(TenantContextGuard, BrowserMutationGuard)
  @ApiHeader({ name: 'X-Organization-Id', required: true })
  @ApiOperation({ summary: 'Desativa um membership de MEMBER' })
  @ApiNoContentResponse({ description: 'Membership removido ou já inativo.' })
  @ApiBadRequestResponse({ content: problemDetailsContent })
  @ApiUnauthorizedResponse({ content: problemDetailsContent })
  @ApiConflictResponse({ content: problemDetailsContent })
  @ApiForbiddenResponse({ content: problemDetailsContent })
  @ApiNotFoundResponse({ content: problemDetailsContent })
  @ApiUnprocessableEntityResponse({ content: problemDetailsContent })
  public async remove(
    @Param(
      'organizationId',
      new ZodValidationPipe(organizationIdSchema, 'organizationId'),
    )
    _organizationId: string,
    @Param(
      'membershipId',
      new ZodValidationPipe(membershipIdSchema, 'membershipId'),
    )
    membershipId: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    await this.removeMember.execute(tenant, membershipId);
    this.logSuccess('organization.member.remove', tenant.organizationId);
  }

  @Post(':organizationId/leave')
  @HttpCode(204)
  @UseGuards(TenantContextGuard, BrowserMutationGuard)
  @ApiHeader({ name: 'X-Organization-Id', required: true })
  @ApiOperation({ summary: 'Desativa o próprio membership de MEMBER' })
  @ApiNoContentResponse({ description: 'O usuário deixou a organização.' })
  @ApiBadRequestResponse({ content: problemDetailsContent })
  @ApiUnauthorizedResponse({ content: problemDetailsContent })
  @ApiConflictResponse({ content: problemDetailsContent })
  @ApiForbiddenResponse({ content: problemDetailsContent })
  @ApiNotFoundResponse({ content: problemDetailsContent })
  @ApiUnprocessableEntityResponse({ content: problemDetailsContent })
  public async leave(
    @Param(
      'organizationId',
      new ZodValidationPipe(organizationIdSchema, 'organizationId'),
    )
    _organizationId: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<void> {
    await this.leaveOrganization.execute(tenant);
    this.logSuccess('organization.leave', tenant.organizationId);
  }

  private logSuccess(action: string, organizationId: string): void {
    this.logger.info(
      { action, organizationId, result: 'success' },
      'Operação de organização concluída.',
    );
  }
}
