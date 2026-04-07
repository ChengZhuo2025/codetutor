-- Migration: 022_add_admin_test_session_flag
-- Desc: 为 conversation_sessions 添加 is_admin_test 布尔字段，标记管理员 AI 测试产生的会话，
--        使其在真实用户会话查询中被排除。
-- Related: server/modules/admin-ai/service.ts createAdminTestSession

BEGIN;

ALTER TABLE public.conversation_sessions
  ADD COLUMN IF NOT EXISTS is_admin_test BOOLEAN NOT NULL DEFAULT FALSE;

-- 索引：管理员查询测试会话时按 user_id + is_admin_test 过滤
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_admin_test
  ON public.conversation_sessions(user_id, is_admin_test)
  WHERE is_admin_test = TRUE;

-- 原有按 user_id + status 的组合索引覆盖真实会话查询，无需修改

COMMENT ON COLUMN public.conversation_sessions.is_admin_test IS
  '标记管理员 AI 测试产生的会话。真实用户会话查询应显式排除此字段为 TRUE 的记录。';

COMMIT;
