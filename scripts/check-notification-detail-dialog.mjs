import { readFileSync } from "fs"
import { resolve } from "path"

const filePath = resolve("components/layout/notification-detail-dialog.tsx")
try {
  const content = readFileSync(filePath, "utf-8")
  if (!content.includes("NotificationDetailDialog")) {
    throw new Error("组件未导出 NotificationDetailDialog")
  }
  if (!content.includes('"use client"')) {
    throw new Error("缺少 use client 指令")
  }
  console.log("✅ 通知详情弹框组件文件检查通过")
} catch (err) {
  console.error("❌", err.message)
  process.exit(1)
}
