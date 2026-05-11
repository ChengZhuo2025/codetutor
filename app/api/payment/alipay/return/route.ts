import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const orderNo = searchParams.get("out_trade_no")

  const redirectUrl = new URL("/", request.url)
  if (orderNo) {
    redirectUrl.searchParams.set("paymentReturn", "1")
    redirectUrl.searchParams.set("orderNo", orderNo)
    redirectUrl.searchParams.set("paymentChannel", "alipay")
  }

  return NextResponse.redirect(redirectUrl)
}
