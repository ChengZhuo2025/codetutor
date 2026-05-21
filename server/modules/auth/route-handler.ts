import type { User } from "@supabase/supabase-js"
import { USER_SESSION_COOKIE } from "@/constants/auth-cookies"
import { buildSessionCookieHeader } from "@/server/lib/session-cookie"
import type {
  AuthLoginResponseData,
  AuthLoginType,
  AuthOAuthTempDiscardResponseData,
  AuthPhoneStatusResponseData,
  ProfileMeResponseData,
  UploadProfileAvatarResponseData,
  UpdateProfileMeRequest,
} from "../../../lib/api/contracts/auth.ts"
import { jsonUserProfileNotFound } from "../../lib/route-error-presets.ts"
import {
  jsonInternalErrorFromError,
} from "../../lib/route-error.ts"
import { isUserAccountDisabledError } from "../../lib/user-account-disabled.ts"
import {
  isOAuthPhoneBindingRequiredError,
  isOAuthTempUserNotDiscardableError,
  OAuthPhoneBindingRequiredError,
} from "../../lib/oauth-auth-flow-errors.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
import {
  parseAuthLoginBody,
  parseAuthOAuthTempDiscardBody,
  parseAuthPhoneStatusQuery,
  parseProfileAvatarFile,
  parseUpdateProfileMeBody,
} from "../../lib/request-validation.ts"

function appendUserSessionCookie(response: Response, userId: string) {
  response.headers.append("Set-Cookie", buildSessionCookieHeader(USER_SESSION_COOKIE, userId))
  return response
}

function appendUserLogoutCookie(response: Response) {
  response.headers.append("Set-Cookie", buildSessionCookieHeader(USER_SESSION_COOKIE, "", 0))
  return response
}

function getUserIdentityProviders(user: User) {
  return new Set(
    (user.identities ?? [])
      .map((identity) => identity.provider)
      .filter((provider): provider is string => typeof provider === "string" && provider.length > 0),
  )
}

function hasPhoneIdentity(user: User) {
  return Boolean(user.phone) || getUserIdentityProviders(user).has("phone")
}

function hasOAuthIdentityForLoginType(user: User, loginType: AuthLoginType) {
  if (loginType === "phone") {
    return false
  }

  return getUserIdentityProviders(user).has(loginType)
}

function assertLoginTypeMatchesUserIdentity(user: User, loginType: AuthLoginType) {
  if (loginType === "phone") {
    if (!hasPhoneIdentity(user) && getUserIdentityProviders(user).size > 0) {
      throw new OAuthPhoneBindingRequiredError()
    }
    return
  }

  if (!hasPhoneIdentity(user) && hasOAuthIdentityForLoginType(user, loginType)) {
    throw new OAuthPhoneBindingRequiredError()
  }
}

type RequestLike = {
  json: () => Promise<unknown>
}

type UrlRequestLike = {
  url: string
}

type FormRequestLike = {
  formData: () => Promise<FormData>
}

export function createAuthLoginPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ user: User } | null>
  getRequestAuthHelpText: () => string
  finalizeAuthLogin: (
    user: User,
    loginType: AuthLoginType,
  ) => Promise<AuthLoginResponseData>
  schedulePostLoginSideEffects?: (
    user: User,
    loginType: AuthLoginType,
    data: AuthLoginResponseData,
  ) => Promise<void> | void
}) {
  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth?.user) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseAuthLoginBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      assertLoginTypeMatchesUserIdentity(auth.user, input.data.loginType)

      const data = await dependencies.finalizeAuthLogin(auth.user, input.data.loginType)
      void dependencies.schedulePostLoginSideEffects?.(auth.user, input.data.loginType, data)

      return appendUserSessionCookie(jsonSuccess(data), data.userId)
    } catch (error) {
      if (isOAuthPhoneBindingRequiredError(error)) {
        return jsonError("OAUTH_PHONE_BINDING_REQUIRED", error.message, 409)
      }
      if (isUserAccountDisabledError(error)) {
        return jsonError(error.code, error.message, 403)
      }
      return jsonInternalErrorFromError(error, "登录流程处理失败")
    }
  }
}

export function createOAuthTempUserDiscardPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ user: User } | null>
  getRequestAuthHelpText: () => string
  discardOAuthTempUser: (
    user: User,
    provider: Exclude<AuthLoginType, "phone">,
  ) => Promise<AuthOAuthTempDiscardResponseData>
}) {
  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth?.user) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseAuthOAuthTempDiscardBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.discardOAuthTempUser(auth.user, input.data.provider)

      return jsonSuccess(data, "oauth temp user discarded")
    } catch (error) {
      if (isOAuthTempUserNotDiscardableError(error)) {
        return jsonError("OAUTH_TEMP_USER_NOT_DISCARDABLE", error.message, 409)
      }
      return jsonInternalErrorFromError(error, "清理临时扫码账号失败")
    }
  }
}

export function createAuthPhoneStatusGetHandler(dependencies: {
  getPhoneRegistrationStatus: (phone: string) => Promise<AuthPhoneStatusResponseData>
}) {
  return async function GET(request: UrlRequestLike) {
    try {
      const input = parseAuthPhoneStatusQuery(new URL(request.url).searchParams)

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.getPhoneRegistrationStatus(input.data.phone)

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "检查手机号注册状态失败")
    }
  }
}

export function createAuthLogoutPostHandler() {
  return async function POST() {
    return appendUserLogoutCookie(jsonSuccess({ success: true }, "退出登录成功"))
  }
}

export function createProfileMeGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getProfileMe: (userId: string) => Promise<ProfileMeResponseData | null>
}) {
  return async function GET(request: unknown) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const data = await dependencies.getProfileMe(auth.userId)

      if (!data) {
        return jsonUserProfileNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      if (isUserAccountDisabledError(error)) {
        return jsonError(error.code, error.message, 403)
      }
      return jsonInternalErrorFromError(error, "加载用户档案失败")
    }
  }
}

export function createProfileMePatchHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  updateProfileMe: (
    userId: string,
    input: UpdateProfileMeRequest,
  ) => Promise<ProfileMeResponseData | null>
}) {
  return async function PATCH(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseUpdateProfileMeBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.updateProfileMe(auth.userId, input.data)

      if (!data) {
        return jsonUserProfileNotFound()
      }

      return jsonSuccess(data, "profile updated")
    } catch (error) {
      if (isUserAccountDisabledError(error)) {
        return jsonError(error.code, error.message, 403)
      }
      return jsonInternalErrorFromError(error, "保存用户档案失败")
    }
  }
}

export function createProfileAvatarPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  uploadProfileAvatar: (
    userId: string,
    file: File,
  ) => Promise<UploadProfileAvatarResponseData>
}) {
  return async function POST(request: FormRequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const formData = await request.formData()
      const file = parseProfileAvatarFile(formData.get("file"))

      if (!file.ok) {
        return jsonError(file.code, file.message, 400)
      }

      const data = await dependencies.uploadProfileAvatar(auth.userId, file.data)

      return jsonSuccess(data, "avatar uploaded")
    } catch (error) {
      if (isUserAccountDisabledError(error)) {
        return jsonError(error.code, error.message, 403)
      }
      return jsonInternalErrorFromError(error, "头像上传失败")
    }
  }
}
