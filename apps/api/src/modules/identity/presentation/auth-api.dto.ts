import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProblemDetailsDto {
  @ApiProperty({ example: 'https://closeflow.local/problems/http-401' })
  public type!: string;

  @ApiProperty({ example: 'Autenticação necessária' })
  public title!: string;

  @ApiProperty({ example: 401 })
  public status!: number;

  @ApiProperty({ example: 'INVALID_CREDENTIALS' })
  public code!: string;

  @ApiProperty({ example: 'E-mail ou senha inválidos.' })
  public detail!: string;

  @ApiProperty({ example: '/api/v1/auth/login' })
  public instance!: string;

  @ApiProperty({ maxLength: 128, example: 'req-7f5c2d' })
  public correlationId!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  public errors?: Record<string, string[]>;
}

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
