# WeChat Native Payment Acceptance

## 范围

本验收覆盖 Web 端微信 Native 扫码支付首版闭环：后台配置、下单、二维码支付、微信回调、主动查单、订单状态和订阅权益开通。

不验收退款、自动续费、JSAPI、H5 支付、发票和优惠券。

## 前置条件

- Supabase 已执行到 `030_create_payment_subscription_tables.sql`。
- 服务端已配置现有数据库密文主密钥 `AI_PROVIDER_SECRET_ENCRYPTION_KEY`。
- 微信支付商户号已开通 Native 支付。
- 商户平台 Native 回调地址为 `https://www.codetutor.cn/api/payment/wechat/notify`。
- 管理后台 `/admin/settings` 的「支付配置」已录入并启用：`AppID`、`mchid`、回调地址、商户证书序列号、商户私钥、APIv3 密钥、微信支付公钥 ID、微信支付公钥。

## 自动化验证

运行：

```bash
pnpm test:payment-wechat
pnpm test:admin-settings
pnpm test:openapi-document
pnpm lint
```

预期：

- 支付测试覆盖签名、验签、APIv3 解密、配置校验、订阅顺延/升级规则和路由错误映射。
- 系统设置测试覆盖管理端配置相关基础路由。
- OpenAPI 文档包含 `payment` 与微信支付配置接口。
- lint 无错误。

## 人工验收步骤

1. 管理员登录 `/admin/settings`，打开「支付配置」。
2. 填入微信支付生产配置，勾选「启用微信支付」，保存。
3. 使用普通用户登录工作台，打开套餐订阅弹窗。
4. 点击「个人版」或「专业版」升级/续费。
5. 页面展示微信支付二维码、订单号、金额和等待支付状态。
6. 使用微信扫码支付。
7. 确认微信回调返回 `{"code":"SUCCESS","message":"成功"}`。
8. 等待前端自动同步，或点击「刷新支付状态」。
9. 确认订单状态变为 `paid`。
10. 调用 `GET /api/subscription/me`，确认 `current.planCode` 为购买套餐，`status` 为 `active`，`expiresAt` 已更新。
11. 重复投递同一微信回调，确认不会重复延长订阅有效期。

## 常见失败排查

- `PAYMENT_CONFIG_INCOMPLETE`：后台配置未启用或缺少必填项，尤其是 AppID、商户私钥、APIv3 密钥、微信支付公钥 ID。
- 回调验签失败：确认微信支付公钥 ID 与回调 `Wechatpay-Serial` 一致，公钥 PEM 没有复制缺行。
- 回调金额不匹配：确认 `subscription_plans.price_cents` 与微信支付实付金额一致。
- 用户看不到二维码：确认 `POST /api/payment/wechat/native-orders` 返回了 `codeUrl`，浏览器可以加载 `qrcode` 渲染依赖。
