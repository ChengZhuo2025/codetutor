/**
 * 创建测试管理员账号脚本
 *
 * 使用方法：
 *   node scripts/create-test-admin.mjs
 *
 * 环境变量：
 *   SUPABASE_URL - Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createTestAdmin() {
  try {
    console.log("🔐 开始创建测试管理员账号...\n")

    // 1. 创建 Supabase Auth 用户
    const testEmail = "admin@test.local"
    const testPassword = "Admin@123456"

    console.log(`📧 创建 Auth 用户: ${testEmail}`)

    // 检查用户是否已存在
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      throw new Error(`查询用户失败: ${listError.message}`)
    }

    const existingUser = existingUsers.users.find((u) => u.email === testEmail)

    let userId

    if (existingUser) {
      userId = existingUser.id
      console.log(`✅ 用户已存在，ID: ${userId}`)
    } else {
      // 创建新用户
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          display_name: "测试管理员",
        },
      })

      if (createError) {
        throw new Error(`创建用户失败: ${createError.message}`)
      }

      userId = newUser.user.id
      console.log(`✅ Auth 用户创建成功，ID: ${userId}`)
    }

    // 2. 检查管理员账号是否已存在
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from("admin_accounts")
      .select("id, display_name, status")
      .eq("user_id", userId)
      .maybeSingle()

    if (adminCheckError) {
      throw new Error(`查询管理员账号失败: ${adminCheckError.message}`)
    }

    if (existingAdmin) {
      console.log(`✅ 管理员账号已存在: ${existingAdmin.display_name} (${existingAdmin.status})`)
    } else {
      // 3. 创建管理员账号记录
      const { data: newAdmin, error: adminCreateError } = await supabase
        .from("admin_accounts")
        .insert({
          user_id: userId,
          display_name: "测试管理员",
          status: "active",
        })
        .select("id")
        .single()

      if (adminCreateError) {
        throw new Error(`创建管理员账号失败: ${adminCreateError.message}`)
      }

      console.log(`✅ 管理员账号创建成功，ID: ${newAdmin.id}`)

      // 4. 分配 super_admin 角色
      const { data: superAdminRole } = await supabase
        .from("admin_roles")
        .select("id")
        .eq("code", "super_admin")
        .single()

      if (superAdminRole) {
        const { error: roleError } = await supabase.from("admin_account_roles").insert({
          admin_account_id: newAdmin.id,
          admin_role_id: superAdminRole.id,
        })

        if (roleError) {
          console.error(`⚠️  分配角色失败: ${roleError.message}`)
        } else {
          console.log(`✅ 已分配 super_admin 角色`)
        }
      }
    }

    console.log("\n" + "=".repeat(50))
    console.log("🎉 测试管理员账号创建成功！")
    console.log("=".repeat(50))
    console.log(`📧 邮箱: ${testEmail}`)
    console.log(`🔑 密码: ${testPassword}`)
    console.log(`🌐 登录地址: http://localhost:3000/admin/login`)
    console.log("=".repeat(50))
  } catch (error) {
    console.error("\n❌ 创建测试管理员失败:", error.message)
    process.exit(1)
  }
}

createTestAdmin()
