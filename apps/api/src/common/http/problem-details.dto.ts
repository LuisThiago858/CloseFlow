import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProblemDetailsDto {
  @ApiProperty({ example: 'https://closeflow.local/problems/http-404' })
  public type!: string;

  @ApiProperty({ example: 'Recurso não encontrado' })
  public title!: string;

  @ApiProperty({ example: 404 })
  public status!: number;

  @ApiProperty({ example: 'ORGANIZATION_NOT_FOUND' })
  public code!: string;

  @ApiProperty({ example: 'A organização não foi encontrada.' })
  public detail!: string;

  @ApiProperty({
    example: '/api/v1/organizations/00000000-0000-4000-8000-000000000000',
  })
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
