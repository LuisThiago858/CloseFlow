import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationRequestDto {
  @ApiProperty({ maxLength: 120 })
  public name!: string;

  @ApiPropertyOptional({ minLength: 3, maxLength: 63 })
  public slug?: string;
}

export class UpdateOrganizationRequestDto {
  @ApiProperty({ maxLength: 120 })
  public name!: string;
}

export class PublicOrganizationDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty({ maxLength: 120 })
  public name!: string;

  @ApiProperty({ minLength: 3, maxLength: 63 })
  public slug!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  public status!: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ format: 'date-time' })
  public createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  public updatedAt!: string;
}

export class PublicMembershipDto {
  @ApiProperty({ format: 'uuid' })
  public membershipId!: string;

  @ApiProperty({ format: 'uuid' })
  public userId!: string;

  @ApiProperty({ enum: ['OWNER', 'MEMBER'] })
  public role!: 'OWNER' | 'MEMBER';

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  public membershipStatus!: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ format: 'date-time' })
  public joinedAt!: string;
}

export class OrganizationWithMembershipResponseDto {
  @ApiProperty({ type: PublicOrganizationDto })
  public organization!: PublicOrganizationDto;

  @ApiProperty({ type: PublicMembershipDto })
  public membership!: PublicMembershipDto;
}

export class OrganizationsResponseDto {
  @ApiProperty({ type: [OrganizationWithMembershipResponseDto] })
  public organizations!: OrganizationWithMembershipResponseDto[];
}

export class OrganizationResponseDto {
  @ApiProperty({ type: PublicOrganizationDto })
  public organization!: PublicOrganizationDto;
}

export class PublicMemberDto extends PublicMembershipDto {
  @ApiProperty({ maxLength: 254 })
  public email!: string;
}

export class MembersResponseDto {
  @ApiProperty({ type: [PublicMemberDto] })
  public members!: PublicMemberDto[];

  @ApiProperty({ format: 'uuid', nullable: true })
  public nextCursor!: string | null;
}
