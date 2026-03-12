import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePlacementDto {
  @IsString()
  furnitureId!: string;

  @IsNumber()
  @IsOptional()
  posX?: number = 0;

  @IsNumber()
  @IsOptional()
  posY?: number = 0;

  @IsNumber()
  @IsOptional()
  posZ?: number = 0;

  @IsNumber()
  @IsOptional()
  rotY?: number = 0; // Y축 회전 (라디안)
}

export class UpdatePlacementDto {
  @IsNumber()
  @IsOptional()
  posX?: number;

  @IsNumber()
  @IsOptional()
  posY?: number;

  @IsNumber()
  @IsOptional()
  posZ?: number;

  @IsNumber()
  @IsOptional()
  rotY?: number;
}

// 여러 가구 위치를 한 번에 저장 (3D 에디터 저장 시 사용)
export class BulkUpdatePlacementsDto {
  placements!: {
    id: string; // placement id
    posX: number;
    posY: number;
    posZ: number;
    rotY: number;
  }[];
}
