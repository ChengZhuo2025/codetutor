import type { SVGProps } from "react"

import type { AuthOAuthProvider } from "@/features/auth/types"

type ProviderIconProps = SVGProps<SVGSVGElement>

function WechatIcon(props: ProviderIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9.2 4.5C5.22 4.5 2 7.03 2 10.16c0 1.76 1.04 3.33 2.68 4.36l-.7 2.4 2.69-1.35c.83.18 1.67.28 2.53.28 3.97 0 7.2-2.54 7.2-5.67S13.17 4.5 9.2 4.5Z"
        fill="currentColor"
        fillOpacity=".92"
      />
      <path
        d="M16.34 9.48c-3.12 0-5.66 1.99-5.66 4.44 0 2.45 2.54 4.44 5.66 4.44.65 0 1.28-.08 1.89-.24l2.16 1.08-.57-1.93c1.29-.82 2.08-2.01 2.08-3.35 0-2.45-2.53-4.44-5.66-4.44Z"
        fill="currentColor"
        fillOpacity=".72"
      />
      <circle cx="6.94" cy="9.82" r="1.03" fill="#051B16" />
      <circle cx="11.08" cy="9.82" r="1.03" fill="#051B16" />
      <circle cx="14.55" cy="13.9" r=".93" fill="#051B16" />
      <circle cx="17.95" cy="13.9" r=".93" fill="#051B16" />
    </svg>
  )
}

function DouyinIcon(props: ProviderIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M14.3 3.8c.58 1.67 1.68 2.92 3.56 3.63v2.58c-1.4-.08-2.67-.51-3.8-1.33v5.74a4.92 4.92 0 1 1-4.92-4.92c.34 0 .67.04.98.1v2.72a2.33 2.33 0 1 0 1.35 2.1V3.8h2.83Z"
        fill="#111318"
      />
      <path
        d="M13.25 4.58c.58 1.67 1.68 2.92 3.56 3.63v1.67c-1.4-.08-2.67-.51-3.8-1.33v5.74a4.92 4.92 0 1 1-4.92-4.92c.34 0 .67.04.98.1v1.8a2.33 2.33 0 1 0 1.35 2.1V4.58h2.83Z"
        fill="#25F4EE"
        fillOpacity=".9"
      />
      <path
        d="M15.04 4.12c.58 1.67 1.69 2.93 3.57 3.64v1.67c-1.4-.08-2.67-.51-3.8-1.33v5.74a4.92 4.92 0 1 1-4.92-4.92c.34 0 .67.04.98.1v1.8a2.33 2.33 0 1 0 1.35 2.1V4.12h2.82Z"
        fill="#FE2C55"
        fillOpacity=".9"
      />
    </svg>
  )
}

type OAuthProviderMeta = {
  id: AuthOAuthProvider
  label: string
  description: string
  accent: string
  icon: (props: ProviderIconProps) => React.JSX.Element
}

export const OAUTH_PROVIDERS: OAuthProviderMeta[] = [
  {
    id: "wechat",
    label: "微信扫码登录",
    description: "适合桌面端快速确认授权，回到当前学习进度。",
    accent: "from-[#20c35a]/24 via-[#15b74e]/12 to-transparent",
    icon: WechatIcon,
  },
  {
    id: "douyin",
    label: "抖音扫码登录",
    description: "适合内容创作者快速登录，后续将接入同一学习账号体系。",
    accent: "from-[#25F4EE]/22 via-[#FE2C55]/16 to-transparent",
    icon: DouyinIcon,
  },
]

export function getOAuthProviderMeta(provider: AuthOAuthProvider) {
  return OAUTH_PROVIDERS.find((item) => item.id === provider) ?? OAUTH_PROVIDERS[0]
}

export function isOAuthProvider(value: string | null | undefined): value is AuthOAuthProvider {
  return value === "wechat" || value === "douyin"
}
