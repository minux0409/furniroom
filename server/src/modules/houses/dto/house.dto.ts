import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateHouseDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;
}

export class UpdateHouseDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsOptional()
  blueprintData?: object; // Konva.js 2D 설계도 JSON

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
