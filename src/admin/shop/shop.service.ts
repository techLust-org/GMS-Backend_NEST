import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Shop } from '../../models';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class AdminShopService {
  constructor(@InjectModel(Shop) private readonly shop: typeof Shop) {}

  async getProfile(shopId: number) {
    const shop = await this.shop.findByPk(shopId);
    if (!shop) throw new AppError('Shop not found', 404);
    return shop;
  }

  async updateProfile(shopId: number, body: any) {
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
}
