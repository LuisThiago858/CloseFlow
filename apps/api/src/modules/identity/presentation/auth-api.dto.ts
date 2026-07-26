import { ApiProperty } from '@nestjs/swagger';

export class RegisterRequestDto {
  @ApiProperty({ maxLength: 254 })
  public email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  public password!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  public passwordConfirmation!: string;
}

export class LoginRequestDto {
  @ApiProperty({ maxLength: 254 })
  public email!: string;

  @ApiProperty({ maxLength: 128, writeOnly: true })
  public password!: string;
}

export class PublicUserDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty({ maxLength: 254 })
  public email!: string;

  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] })
  public status!: 'ACTIVE' | 'DISABLED';

  @ApiProperty({ format: 'date-time' })
  public createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  public updatedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  public lastLoginAt!: string | null;
}

export class UserResponseDto {
  @ApiProperty({ type: PublicUserDto })
  public user!: PublicUserDto;
}

export class PublicSessionDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty({ format: 'date-time' })
  public createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  public lastUsedAt!: string;

  @ApiProperty({ format: 'date-time' })
  public expiresAt!: string;

  @ApiProperty()
  public current!: boolean;
}

export class SessionsResponseDto {
  @ApiProperty({ type: [PublicSessionDto] })
  public sessions!: PublicSessionDto[];
}
