import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { APP_CONFIG } from '../../config/app.config';
import { UploadType } from './dto/upload.dto';
import { randomUUID } from 'crypto';
import * as path from 'path';

// 허용 MIME 타입
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MODEL_TYPES = ['model/gltf-binary', 'application/octet-stream'];

@Injectable()
export class UploadService {
  private readonly s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: APP_CONFIG.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    uploadType: UploadType,
    userId: string,
  ): Promise<{ url: string; key: string }> {
    // 타입 및 크기 검증
    if (uploadType === UploadType.image) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          'jpg, png, webp 이미지만 업로드할 수 있습니다.',
        );
      }
      const maxBytes = APP_CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new PayloadTooLargeException(
          `이미지는 최대 ${APP_CONFIG.MAX_IMAGE_SIZE_MB}MB까지 업로드할 수 있습니다.`,
        );
      }
    } else {
      if (!ALLOWED_MODEL_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          'glb 형식의 3D 모델만 업로드할 수 있습니다.',
        );
      }
      const maxBytes = APP_CONFIG.MAX_MODEL_SIZE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new PayloadTooLargeException(
          `3D 모델은 최대 ${APP_CONFIG.MAX_MODEL_SIZE_MB}MB까지 업로드할 수 있습니다.`,
        );
      }
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const folder = uploadType === UploadType.image ? 'images' : 'models';
    const key = `${folder}/${userId}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: APP_CONFIG.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const baseUrl = APP_CONFIG.CLOUDFRONT_URL
      ? APP_CONFIG.CLOUDFRONT_URL
      : `https://${APP_CONFIG.S3_BUCKET_NAME}.s3.${APP_CONFIG.AWS_REGION}.amazonaws.com`;

    return { url: `${baseUrl}/${key}`, key };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: APP_CONFIG.S3_BUCKET_NAME,
        Key: key,
      }),
    );
  }
}
