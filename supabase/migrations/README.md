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

As of the current MVP snapshot, the migration sequence continues through **052**:

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
36. `036_extend_subscription_plan_management.sql` — **订阅套餐运营化管理**（扩展套餐展示字段、可购买/推荐/排序/归档能力，并初始化免费版、个人版、专业版三档数据）
37. `037_add_alipay_scan_payment.sql` — **支付宝扫码支付**（扩展支付配置、订单渠道、支付宝交易字段和回调事件索引；扩展支付完成 RPC 以支持微信/支付宝共用订阅开通）
38. `038_extend_payment_order_management.sql` — **订单管理扩展**（新增用户取消、用户端软删除和财务查询索引）
39. `039_finance_hardening.sql` — **财务与支付完成硬化**（放宽归档套餐支付完成开通条件，新增财务统计和用户订单汇总 RPC）
40. `040_fix_security_definer_search_path.sql` — **RPC search_path 安全修复**（将支付/财务 `SECURITY DEFINER` RPC 固定为 `search_path = ''`，消除 Supabase Security Advisor 警示）
41. `041_optimize_payment_rls_auth_uid.sql` — **支付 RLS 初始值优化**（将 `auth.uid()` 读取包装成标量子查询，减少 per-row 重复求值）
42. `042_add_learning_concept_qa_agent.sql` — **学习对话概念问答场景**（为 `agent_scenario_type` 增加 `concept_qa`，支持学习过程中随时提问知识盲点）
43. `043_create_learning_message_attachments.sql` — **学习对话多媒体附件持久化**（创建私有 `learning-chat-attachments` bucket、附件类型/处理状态枚举、`learning_message_attachments` 表与用户级 RLS）
44. `044_add_learning_media_agent_scenarios.sql` — **学习对话多媒体预处理场景**（为 `agent_scenario_type` 增加 `media_vision_extract` 与 `media_audio_transcribe`）
45. `045_create_media_transcription_settings.sql` — **多媒体转译设置**（新增学习对话图片转译、语音转文本与文本转语音的后台模型选择配置表）
46. `046_harden_material_plan_generation.sql` — **材料计划生成硬化**（新增生成 run claim / heartbeat 字段与事务化草稿确认 RPC）
47. `047_fix_material_plan_rpc_search_path.sql` — **材料计划 RPC search_path 安全修复**（将 `claim_material_plan_generation_run`、`confirm_learning_plan_draft` 固定为 `search_path = ''`，消除 Supabase Security Advisor 警示）
48. `048_set_free_subscription_duration_to_7_days.sql` — **免费版有效期校准**（将 `subscription_plans.free.duration_days` 修正为 7 天，供 `/api/subscription/me` 与用户侧有效期展示复用）
49. `049_create_admin_notifications.sql` — **管理后台消息中心**（创建 `admin_notifications` 表及状态、类别、严重级别与来源索引）
50. `050_add_user_login_ip_tracking.sql` — **用户登录 IP 追踪**（为用户资料补充最近登录 IP / 城市，并新增用户登录日志表）
51. `051_update_user_profile_export_view_with_ip.sql` — **用户导出视图补登录地域字段**（导出视图纳入最近登录 IP 与城市）
52. `052_create_site_information.sql` — **站点信息与通用文章管理**（创建 `site_information`、`site_articles` 与 `site-assets` public bucket，初始化网站信息、关于我们、用户协议和隐私政策）

**最新状态**：迁移已达 **052**。`site_information` + `site_articles` + `site-assets` bucket 支持站点 Logo、站点名称、副标题、Slogan、SEO、备案、版权、版本号以及关于我们/用户协议/隐私政策 Markdown 内容后台管理；`site_contact_settings` + `qr-codes` bucket 实现了企业联系信息与真实二维码图片管理；`payment_settings`、`subscription_plans`、`payment_orders`、`user_subscriptions`、`payment_webhook_events` 支持微信 Native 与支付宝扫码支付闭环；`admin_notifications` 支持管理后台消息中心；`subscription_plans` 已支持后台自定义展示、上下架、可购买、推荐与软归档，免费版有效期已校准为 7 天；`complete_paid_payment_order` RPC 负责支付完成的原子化与幂等权益开通；支付/财务与材料计划 `SECURITY DEFINER` RPC 已固定空 `search_path`，支付相关 RLS policy 已按 `auth.uid()` 标量子查询做性能优化；学习对话已补充概念问答场景、多媒体附件持久化骨架、多媒体预处理 agent 场景与多媒体转译设置。**下一次新增迁移请从 `053_*.sql` 开始。**

**仍需人工确认**：如果目标 Supabase 项目尚未创建 `qr-codes` bucket，请在 Supabase Dashboard → Storage 创建名为 `qr-codes` 的 **PUBLIC** bucket（允许匿名读取），否则企业联系方式二维码上传会失败。
