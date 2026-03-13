import { IsEnum, IsInt, Min } from 'class-validator';

export enum SlotType {
  house = 'house',
  furniture = 'furniture',
}

export class BuySlotDto {
  @IsEnum(SlotType)
  slotType!: SlotType;

  // 구매 단위 수 (1단위 = PAID_SLOT_UNIT개)
  @IsInt()
  @Min(1)
  units!: number;
}
