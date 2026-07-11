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
}
