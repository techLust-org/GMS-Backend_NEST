// Optional wrapper a controller can return when it needs to override the
// response message dynamically or attach pagination `meta`. When a handler
// returns a plain value instead, the TransformInterceptor treats it as `data`.
export class ApiPayload<T = any> {
  constructor(
    public readonly data: T,
    public readonly message?: string,
    public readonly meta?: any,
  ) {}
}
