import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { UploadType } from './dto/upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
    @CurrentUser() user: { userId: string },
  ) {
    if (!file) throw new BadRequestException('파일이 없습니다.');
    if (type !== UploadType.image && type !== UploadType.model) {
      throw new BadRequestException('type은 image 또는 model이어야 합니다.');
    }
    return this.uploadService.uploadFile(file, type as UploadType, user.userId);
  }
}
