import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestConnectionDto {
  @ApiProperty({ description: 'Therapist profile ID' })
  @IsString()
  @IsNotEmpty()
  therapistId!: string;
}

export class RespondConnectionDto {
  @ApiProperty({ enum: ['accepted', 'rejected'] })
  @IsString()
  @IsNotEmpty()
  status!: 'accepted' | 'rejected';
}
