import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

export enum BoardType {
  NORMAL = 'NORMAL',
  MULTI_LEVEL = 'MULTI_LEVEL',
}

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(BoardType)
  type?: BoardType;
}
