import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Shop } from '../../models';
import { S3Service } from '../../shared/s3.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class AdminShopService {
  constructor(
    @InjectModel(Shop) private readonly shop: typeof Shop,
    private readonly s3: S3Service,
  ) {}

  async getProfile(shopId: string) {
    const shop: any = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);
    const plain = shop.toJSON();
    if (plain.logo_url) plain.logo_url = await this.s3.getViewUrl(plain.logo_url);
    if (plain.cover_image_url) plain.cover_image_url = await this.s3.getViewUrl(plain.cover_image_url);
    return plain;
  }

  async updateProfile(shopId: string, body: any) {
    const shop: any = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);
    const { name, phone, email, address, logoUrl } = body;
    await shop.update({
      name: name || shop.name,
      phone: phone !== undefined ? phone : shop.phone,
      email: email !== undefined ? email : shop.email,
      address: address !== undefined ? address : shop.address,
      logo_url: logoUrl !== undefined ? logoUrl : shop.logo_url,
    });
    return new ApiPayload(shop, 'Shop updated');
  }

  // Step 1: presign a spot in S3 for the shop's logo.
  async presignLogo(shopId: string, body: any) {
    const { contentType } = body;
    if (!contentType) throw new AppError('contentType required', 400);
    const key = this.s3.buildShopLogoKey(shopId, contentType);
    const uploadUrl = await this.s3.getUploadUrl(key, contentType);
    return new ApiPayload({ uploadUrl, key }, 'Upload URL generated');
  }

  // Step 2: after the client PUTs the file to S3, confirm the key so it's persisted.
  async updateLogo(shopId: string, body: any) {
    const { key } = body;
    if (!key) throw new AppError('key required', 400);
    const expectedPrefix = `${shopId}/owner/profiles/logo_`;
    if (!key.startsWith(expectedPrefix)) throw new AppError('Invalid object key', 400);

    const shop: any = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);

    const oldKey = shop.logo_url;
    await shop.update({ logo_url: key });
    if (oldKey && oldKey !== key) {
      this.s3.deleteObject(oldKey).catch(() => {});
    }

    const logoUrl = await this.s3.getViewUrl(key);
    return new ApiPayload({ logoUrl }, 'Shop logo updated');
  }

  async removeLogo(shopId: string) {
    const shop: any = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);

    const oldKey = shop.logo_url;
    if (!oldKey) return new ApiPayload(null, 'No logo to remove');

    await shop.update({ logo_url: null });
    this.s3.deleteObject(oldKey).catch(() => {});

    return new ApiPayload(null, 'Shop logo removed');
  }

  // Step 1: presign a spot in S3 for the shop's cover image (shown as a
  // banner on public gym-directory cards).
  async presignCover(shopId: string, body: any) {
    const { contentType } = body;
    if (!contentType) throw new AppError('contentType required', 400);
    const key = this.s3.buildShopCoverImageKey(shopId, contentType);
    const uploadUrl = await this.s3.getUploadUrl(key, contentType);
    return new ApiPayload({ uploadUrl, key }, 'Upload URL generated');
  }

  // Step 2: after the client PUTs the file to S3, confirm the key so it's persisted.
  async updateCover(shopId: string, body: any) {
    const { key } = body;
    if (!key) throw new AppError('key required', 400);
    const expectedPrefix = `${shopId}/owner/profiles/cover_`;
    if (!key.startsWith(expectedPrefix)) throw new AppError('Invalid object key', 400);

    const shop: any = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);

    const oldKey = shop.cover_image_url;
    await shop.update({ cover_image_url: key });
    if (oldKey && oldKey !== key) {
      this.s3.deleteObject(oldKey).catch(() => {});
    }

    const coverImageUrl = await this.s3.getViewUrl(key);
    return new ApiPayload({ coverImageUrl }, 'Cover image updated');
  }

  async removeCover(shopId: string) {
    const shop: any = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);

    const oldKey = shop.cover_image_url;
    if (!oldKey) return new ApiPayload(null, 'No cover image to remove');

    await shop.update({ cover_image_url: null });
    this.s3.deleteObject(oldKey).catch(() => {});

    return new ApiPayload(null, 'Cover image removed');
  }

  async setClosed(shopId: string, body: any) {
    const shop: any = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);
    const isClosed = !!body?.isClosed;
    await shop.update({ is_closed: isClosed });
    return new ApiPayload(
      { isClosed },
      isClosed ? 'Gym marked as closed — check-ins are now blocked' : 'Gym marked as open',
    );
  }
}
