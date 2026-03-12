import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
  IsArray,
} from 'class-validator';

export enum ShapeType {
  box = 'box',
  cylinder = 'cylinder',
  l_shape = 'l_shape',
  custom = 'custom',
}

export class CreateFurnitureDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(1)
  widthCm!: number;

  @IsNumber()
  @Min(1)
  depthCm!: number;

  @IsNumber()
  @Min(1)
  heightCm!: number;

  @IsEnum(ShapeType)
  @IsOptional()
  shapeType?: ShapeType = ShapeType.box;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  modelUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]; // 태그 이름 배열 ex) ["소파", "거실"]
}

export class UpdateFurnitureDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  widthCm?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  depthCm?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  heightCm?: number;

  @IsEnum(ShapeType)
  @IsOptional()
  shapeType?: ShapeType;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  modelUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
