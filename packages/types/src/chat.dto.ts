import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ example: 'Hello, I need help.' })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
