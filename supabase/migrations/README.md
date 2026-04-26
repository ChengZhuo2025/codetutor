# Supabase Migrations

## Purpose

This folder captures the SQL needed to bring the MVP Postgres schema live inside the Aliyun Supabase project.

## How to apply

1. Prefer the repo helper command with a path relative to the repository root: `pnpm db:run:file -- supabase/migrations/<sql-file>`.
2. Execute each migration file in sequence, starting with `supabase/migrations/001_init.sql`.
3. For an existing project that has already run `001_init.sql`, execute only the next unapplied file, such as `pnpm db:run:file -- supabase/migrations/002_fix_update_updated_at_search_path.sql`.
4. If you need manual execution, you can also open the Supabase dashboard and run the same SQL in **SQL Editor**.
5. Confirm no errors appear and then refresh `Table Editor` or rerun Security Advisor to verify the change.

Repeat the same steps for later migrations, keeping a new sequential file under this directory and updating this README if the workflow changes.

## Current sequence

As of the current MVP snapshot (after hardening WeChat Native payment and subscription entitlement activation), the migration sequence continues through **035**:

1. `001_init.sql` — 基础 schema 初始化
2. `002_fix_update_updated_at_search_path.sql` — 修复 updated_at 触发器
3. `003_promote_profile_contact_fields.sql` — 提升用户资料联系字段
4. `004_add_profile_auth_tracking_fields.sql` — 添加认证跟踪字段
5. `005_create_user_profile_export_view.sql` — 创建用户导出视图
6. `006_expand_user_profile_export_view_metrics.sql` — 扩展导出视图指标
7. `007_create_profile_avatar_bucket.sql` — 创建头像存储桶
8. `008_add_feedback_tickets.sql` — 添加反馈工单表
9. `009_add_interrupted_learning_path_status.sql` — 添加中断的学习计划状态
10. `010_create_growth_write_models.sql` — 创建增长写模型
11. `011_create_daily_checkins.sql` — 创建每日签到表
12. `012_create_ai_conversation_core.sql` — AI 对话核心表
13. `013_create_ai_provider_registry.sql` — AI provider 注册表
14. `014_create_ai_agent_registry.sql` — AI agent 注册表
15. `015_create_ai_skill_registry.sql` — AI skill 注册表
16. `016_create_llm_invocations.sql` — LLM 调用记录表
17. `017_create_admin_accounts.sql` — 管理后台账号、角色、审计表
18. `018_create_learning_material_plan_tables.sql` — 学习材料与计划表
19. `019_admin_user_soft_delete.sql` — 管理员用户软删除
20. `020_create_analytics_and_notifications.sql` — 分析事件与通知设置表
21. `021_add_ai_provider_encrypted_secrets.sql` — AI provider 加密密钥
22. `022_add_admin_test_session_flag.sql` — 管理员测试会话标记
23. `023_add_optimistic_lock_version.sql` — 乐观锁 version 字段
24. `024_async_material_plan_runs.sql` — 异步材料计划运行
25. `025_material_plan_editable_drafts.sql` — 材料计划可编辑草稿
26. `026_learning_material_chunks_evidence_metadata.sql` — 材料分块证据元数据
27. `027_material_plan_mastery_and_cautions.sql` — 掌握点与注意事项字段
28. `028_add_ai_model_profile_fields.sql` — AI 模型结构化 profile 字段
29. `029_create_site_contact_settings.sql` — **企业联系方式配置表**（单行 JSONB channels，支持管理后台 `/admin/settings/contact` 编辑，供营销 `ContactDialog` 动态加载；包含初始数据、RLS、审计支持）
30. `030_create_qr_codes_bucket.sql` — **QR Codes Storage Bucket 说明**（需在 Supabase Dashboard → Storage 创建名为 `qr-codes` 的 **PUBLIC** bucket，以便真实二维码图片上传和公开 URL 访问）
31. `031_fix_site_contact_rls_policy.sql` — 修复企业联系方式 RLS policy，确保后台服务与管理端更新路径稳定
32. `032_optimize_site_contact_rls_subquery.sql` — 优化企业联系方式 RLS 子查询，降低策略重复计算
33. `033_restrict_site_contact_update_policy_to_active_admins.sql` — 限制企业联系方式更新仅允许 active 管理员
34. `034_create_payment_subscription_tables.sql` — **微信 Native 支付与订阅表**（支付配置、订阅套餐、支付订单、用户订阅、支付回调事件；商户私钥/APIv3 密钥/微信支付公钥加密落库）
35. `035_harden_payment_order_completion.sql` — **支付完成幂等硬化**（新增带行锁的 `complete_paid_payment_order` RPC，确保回调与主动查单并发时同一订单只开通一次订阅权益）

**最新状态**：迁移已达 **035**。`site_contact_settings` + `qr-codes` bucket 实现了企业联系信息与真实二维码图片管理；`payment_settings`、`subscription_plans`、`payment_orders`、`user_subscriptions`、`payment_webhook_events` 支持微信 Native 扫码支付首版闭环；`complete_paid_payment_order` RPC 负责支付完成的原子化与幂等权益开通。**下一次新增迁移请从 `036_*.sql` 开始。**

**仍需人工确认**：如果目标 Supabase 项目尚未创建 `qr-codes` bucket，请在 Supabase Dashboard → Storage 创建名为 `qr-codes` 的 **PUBLIC** bucket（允许匿名读取），否则企业联系方式二维码上传会失败。
