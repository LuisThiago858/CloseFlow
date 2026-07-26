import { Module } from '@nestjs/common';

import { BrowserMutationGuard } from '../../common/http/browser-mutation.guard';
import { JsonBodyGuard } from '../../common/http/json-body.guard';
import { DatabaseModule } from '../../shared/database/database.module';
import { IdentityModule } from '../identity/identity.module';
import {
  CreateOrganizationUseCase,
  GetOrganizationUseCase,
  LeaveOrganizationUseCase,
  ListMembersUseCase,
  ListOrganizationsUseCase,
  RemoveMemberUseCase,
  UpdateOrganizationUseCase,
} from './application/organization-use-cases';
import {
  ORGANIZATIONS_CLOCK,
  ORGANIZATIONS_REPOSITORY,
} from './application/organizations.tokens';
import { PrismaOrganizationsRepository } from './infrastructure/prisma-organizations.repository';
import { SystemOrganizationsClock } from './infrastructure/system-organizations-clock';
import { OrganizationsController } from './presentation/organizations.controller';
import { OrganizationsSessionGuard } from './presentation/organizations-session.guard';
import { TenantContextGuard } from './presentation/tenant-context.guard';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [OrganizationsController],
  providers: [
    {
      provide: ORGANIZATIONS_REPOSITORY,
      useClass: PrismaOrganizationsRepository,
    },
    { provide: ORGANIZATIONS_CLOCK, useClass: SystemOrganizationsClock },
    CreateOrganizationUseCase,
    ListOrganizationsUseCase,
    GetOrganizationUseCase,
    UpdateOrganizationUseCase,
    ListMembersUseCase,
    RemoveMemberUseCase,
    LeaveOrganizationUseCase,
    TenantContextGuard,
    OrganizationsSessionGuard,
    BrowserMutationGuard,
    JsonBodyGuard,
  ],
})
export class OrganizationsModule {}
