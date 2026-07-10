import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const RESPONSE_MESSAGE_KEY = 'response_message';
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);

// Bypass the { success, message, data } envelope — return the handler value as-is.
export const RAW_RESPONSE_KEY = 'raw_response';
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);

// req.user — the decoded JWT payload { id, role, email, shop_id }
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
  },
);

// req.shopId — set by TenantGuard (null for super_admin)
export const ShopId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().shopId,
);
