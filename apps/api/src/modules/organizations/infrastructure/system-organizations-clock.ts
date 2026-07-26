import { Injectable } from '@nestjs/common';

import type { OrganizationsClock } from '../application/ports/organizations-clock';

@Injectable()
export class SystemOrganizationsClock implements OrganizationsClock {
  public now(): Date {
    return new Date();
  }
}
