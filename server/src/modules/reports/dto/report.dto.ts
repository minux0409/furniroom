import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export enum ReportTargetType {
  furniture = 'furniture',
  house = 'house',
}

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
