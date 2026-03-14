import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;
}
