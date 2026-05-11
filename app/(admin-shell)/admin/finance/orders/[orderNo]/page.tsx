import { AdminFinanceOrderDetailPage } from "@/features/admin-finance/components/admin-finance-order-detail-page"

export default async function Page({
  params,
}: {
  params: Promise<{ orderNo: string }>
}) {
  const { orderNo } = await params
  return <AdminFinanceOrderDetailPage orderNo={orderNo} />
}
