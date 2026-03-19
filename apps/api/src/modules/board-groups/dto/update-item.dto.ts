import { IsString, MaxLength, IsOptional, IsNumber } from 'class-validator';

export class UpdateItemDto {
  @IsOptional() @IsString() @MaxLength(500) name?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() owner?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() propertyType?: string;
  @IsOptional() @IsNumber() googleRating?: number;
  @IsOptional() @IsNumber() noOfRatings?: number;
  @IsOptional() @IsString() landOwnerContact?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() powerAvailability?: string;
  @IsOptional() @IsString() investment?: string;
  @IsOptional() @IsString() availableParking?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() reminderDate?: string;
  @IsOptional() @IsString() dueDate?: string;
}
