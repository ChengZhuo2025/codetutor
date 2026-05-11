import type { FaqItem } from "@/features/history/types"

export const orderFaqItems: FaqItem[] = [
  {
    id: "continue-pay",
    question: "待支付订单可以继续支付吗？",
    answer: "可以。只要订单还没有过期，点击继续支付会重新展示原支付二维码或支付宝跳转表单。",
  },
  {
    id: "cancel-order",
    question: "取消订单会影响订阅吗？",
    answer: "不会。只有已支付订单才会开通或续期订阅权益，取消待支付订单不会改变当前套餐。",
  },
  {
    id: "delete-order",
    question: "删除订单后还能恢复吗？",
    answer: "用户端删除只是隐藏已关闭、已过期或失败订单，后台财务仍保留记录用于对账和审计。",
  },
]
