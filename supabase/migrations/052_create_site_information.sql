BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

CREATE TABLE IF NOT EXISTS public.site_information (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  logo_url TEXT,
  site_name VARCHAR(120) NOT NULL DEFAULT 'CodeTutor',
  site_subtitle VARCHAR(160) NOT NULL DEFAULT 'AI 编程学习教练',
  site_slogan VARCHAR(240) NOT NULL DEFAULT '把教程变成可执行练习',
  site_description TEXT NOT NULL DEFAULT '你负责找到想学的内容，我负责陪你真正学会。AI 编程学习陪练，把教程转成可执行步骤，在你卡住时持续陪练。',
  seo_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  icp_number VARCHAR(120),
  copyright VARCHAR(240) NOT NULL DEFAULT '© 2026 CodeTutor. All rights reserved.',
  version VARCHAR(60) NOT NULL DEFAULT '0.1.110',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id)
);

CREATE TABLE IF NOT EXISTS public.site_articles (
  slug VARCHAR(60) PRIMARY KEY CHECK (slug IN ('about_us', 'user_agreement', 'privacy_policy')),
  title VARCHAR(120) NOT NULL,
  content_markdown TEXT NOT NULL,
  effective_date DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id)
);

INSERT INTO public.site_information (
  id,
  logo_url,
  site_name,
  site_subtitle,
  site_slogan,
  site_description,
  seo_keywords,
  icp_number,
  copyright,
  version,
  updated_by_admin_id
) VALUES (
  1,
  NULL,
  'CodeTutor',
  'AI 编程学习教练',
  '把教程变成可执行练习',
  '你负责找到想学的内容，我负责陪你真正学会。AI 编程学习陪练，把教程转成可执行步骤，在你卡住时持续陪练。',
  '["AI 编程", "学习陪练", "CodeTutor"]'::jsonb,
  '沪ICP备2026015857号-2',
  '© 2026 CodeTutor. All rights reserved.',
  '0.1.110',
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_articles (
  slug,
  title,
  content_markdown,
  effective_date,
  display_order,
  updated_by_admin_id
) VALUES
(
  'about_us',
  '关于我们',
  $md$
## 关于 CodeTutor

我们想把“教程很多、实践很少”的学习断层，变成一个持续推进的 AI 陪练系统。

### 为什么做这个平台

教程很多，真正缺的是把内容收敛成当下能完成的第一步。

### 我们想实现的价值

让用户不是围观 demo，而是在 AI 陪练里持续完成自己的任务。

### 我们强调的技术优势

按工具、经验和任务场景动态调整路径，不用一套模板覆盖所有人。

### 我们的开放合作态度

欢迎课程作者、工具方和开发者社区一起共建样例、路径与反馈机制。
$md$,
  '2026-04-17',
  10,
  NULL
),
(
  'user_agreement',
  '用户协议',
  $md$
生效日期：2026-04-17

欢迎使用 CodeTutor（以下简称“本平台”）。本《用户协议》是你与本平台运营方之间就账号注册、登录和使用本平台服务所订立的协议。请在使用前认真阅读并充分理解全部内容；当你完成注册、登录或继续使用本平台服务时，即视为你已阅读、理解并同意本协议。

## 一、服务内容与适用范围

1. 本平台定位为 AI 编程学习辅导产品，当前主要提供：手机号验证码登录、第三方授权登录（如微信/抖音，按实际开通情况）、学习路径与任务管理、学习地图、学习历史、学习成就、学习提醒、意见反馈等功能。
2. 本平台部分功能依赖外部服务提供商（如短信服务、第三方登录服务、云数据库与云存储、AI 模型服务）。如因第三方服务可用性、网络环境或政策要求导致功能受限、延迟或中断，本平台将在合理范围内协助处理，但不承担超出法律规定的责任。
3. 本协议适用于本平台网页端及未来可能上线的其他终端形态；若某项增值功能另有专项规则，以该专项规则为准。

## 二、账号注册、登录与安全

1. 你可通过中国大陆手机号验证码方式注册/登录，或使用本平台已开通的第三方账号授权登录。
2. 你应保证注册信息真实、合法、有效，不得冒用他人身份或利用技术手段绕过账号安全机制。
3. 你应妥善保管账号凭证、验证码及登录设备，因你主动泄露、管理不善或被钓鱼/木马攻击造成的风险与损失，由你自行承担；你发现账号异常时应及时联系平台处理。
4. 本平台有权在合理范围内采取安全措施，包括但不限于登录风控、异常行为识别、频率限制、会话失效处理等，以保障账号与系统安全。

## 三、使用规范

1. 你在使用本平台服务时，不得实施任何违反法律法规、公序良俗或侵害他人合法权益的行为，不得利用本平台从事违法有害信息传播、侵权、接口滥用、批量注册、刷量、流量攻击等干扰系统正常运行的行为。
2. 你应自行判断并承担基于平台内容（含 AI 输出）作出决策的后果。AI 输出仅供学习参考，不构成任何专业建议或保证。
3. 若你违反本协议，本平台有权根据违规程度采取警示、限流、功能限制、账号冻结或终止服务等措施，并保留依法追责的权利。

## 四、内容与知识产权

1. 本平台界面、代码、文档、商标、标识及相关内容的知识产权归本平台或依法享有权利的主体所有。
2. 你在使用本平台过程中提交或生成的学习相关内容（如学习目标、任务记录、反馈信息等），你仍保留相应合法权益；你授予本平台在提供服务、保障安全、改进产品所必需范围内进行处理与使用的权利。
3. 未经权利人书面许可，任何人不得对本平台内容进行复制、传播、出售、出租、反向利用或用于商业性再分发。

## 五、服务变更、中断与终止

1. 本平台可根据业务需要对功能、规则、交互进行更新、调整或优化，并尽量以适当方式通知。
2. 在系统维护、故障处置、合规整改或不可抗力情况下，平台可能出现暂时中断或部分不可用，本平台将尽合理努力恢复服务。
3. 如你主动注销账号、长期未使用、违反本协议或法律法规，本平台有权在符合法律规定前提下暂停或终止向你提供全部或部分服务。

## 六、责任限制

1. 本平台按“现状”提供服务，在法律允许范围内，不对服务连续性、无错误、完全适配特定需求作绝对保证。
2. 对于因网络故障、第三方服务异常、黑客攻击、不可抗力等非本平台可控原因导致的损失，本平台在法律允许范围内承担相应责任。
3. 因你违反本协议或法律法规给本平台、其他用户或第三方造成损失的，你应依法承担赔偿责任。

## 七、未成年人保护

若你为未成年人，应在监护人陪同下阅读并在取得监护人同意后使用本平台。监护人应对未成年人使用行为进行合理监督和引导。

## 八、协议更新与法律适用

本平台有权根据法律法规、监管要求及业务发展对本协议进行更新。更新后的协议在公布后生效；如你继续使用服务，视为接受更新内容。本协议适用中华人民共和国法律。

## 九、联系我们

如你对本协议有任何疑问，或需要行使相关权利，可通过平台“联系我们/反馈入口”提交申请，我们将在合理期限内处理。
$md$,
  '2026-04-17',
  20,
  NULL
),
(
  'privacy_policy',
  '隐私政策',
  $md$
生效日期：2026-04-17

欢迎使用 CodeTutor。本《隐私政策》说明我们如何收集、使用、存储、共享和保护你的个人信息，以及你可行使的相关权利。请在使用服务前认真阅读。

## 一、我们收集的信息

1. 账号与身份验证信息：手机号、验证码登录结果、第三方授权登录标识（如已开通微信/抖音登录），以及你主动填写或第三方授权范围内的账号基础资料。
2. 学习与使用信息：学习路径、任务状态、学习历史、成就信息、打卡与提醒设置；你主动输入或上传的学习相关内容；为保障产品运行所需的日志信息。
3. 必要技术信息：会话与鉴权相关信息；本地存储信息（如主题模式、界面折叠状态等产品体验配置）。

## 二、我们如何使用信息

1. 提供核心功能：完成注册登录、身份识别、学习流程管理、历史记录展示、提醒与反馈处理。
2. 服务安全保障：风险识别、异常检测、限流防刷、故障排查、日志审计与安全加固。
3. 产品优化与运营分析：基于去标识化/聚合化统计改进功能体验、稳定性与内容质量。
4. 合规义务履行：根据法律法规、监管要求或司法机关要求进行必要处理。

## 三、我们如何共享、转让与公开披露

我们不会出售你的个人信息。仅在实现功能所必需、法律法规要求、诉讼争议解决或行政/司法机关依法要求的情况下，共享或披露必要信息。如发生合并、收购、资产转让等情形导致信息转移，我们将通过合理方式告知你。

## 四、信息存储与保护

我们在实现目的所需期限内保存你的个人信息，并在超出保存期限后依法删除或匿名化处理。我们采取访问控制、传输安全、密钥管理、日志审计和最小权限原则等措施保护数据。

## 五、你的权利

在法律法规规定范围内，你有权查询、更正、补充、删除你的个人信息，撤回授权同意，注销账号，获取本政策副本并就个人信息处理提出说明请求。你可通过平台“联系我们/反馈入口”提交请求。

## 六、未成年人信息保护

我们重视未成年人个人信息保护。若你为未成年人，应在监护人同意和指导下使用本平台。如我们发现未经监护人同意收集了未成年人个人信息，将依法尽快删除或进行合规处理。

## 七、Cookie 与本地存储

为保障登录状态、基础功能和体验一致性，我们会使用 Cookie 或类似本地存储技术。你可通过浏览器设置管理相关存储，但这可能影响部分功能正常使用。

## 八、政策更新

我们可能根据法律法规、监管要求或业务变化更新本政策。更新后我们会通过页面提示等合理方式告知；若你继续使用服务，视为你已阅读并同意更新后的政策。

## 九、联系我们

如你对本政策有疑问、意见或投诉建议，或需要行使个人信息相关权利，可通过平台“联系我们/反馈入口”与我们联系。
$md$,
  '2026-04-17',
  30,
  NULL
)
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_site_articles_display_order
ON public.site_articles(display_order);

DROP TRIGGER IF EXISTS site_information_updated_at ON public.site_information;
CREATE TRIGGER site_information_updated_at
  BEFORE UPDATE ON public.site_information
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS site_articles_updated_at ON public.site_articles;
CREATE TRIGGER site_articles_updated_at
  BEFORE UPDATE ON public.site_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.site_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site information" ON public.site_information;
CREATE POLICY "Public can read site information" ON public.site_information
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Active admins can update site information" ON public.site_information;
CREATE POLICY "Active admins can update site information" ON public.site_information
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Public can read site articles" ON public.site_articles;
CREATE POLICY "Public can read site articles" ON public.site_articles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Active admins can update site articles" ON public.site_articles;
CREATE POLICY "Active admins can update site articles" ON public.site_articles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

COMMIT;
