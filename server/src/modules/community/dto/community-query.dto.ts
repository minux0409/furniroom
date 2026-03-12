import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CommunityQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // 이름 검색

  @IsOptional()
  @IsString()
  tag?: string; // 태그 필터 (가구 커뮤니티)

  @IsOptional()
  @IsIn(['latest', 'oldest'])
  sort?: 'latest' | 'oldest' = 'latest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
