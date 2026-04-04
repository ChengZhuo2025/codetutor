import type { User } from "@supabase/supabase-js"
import { USER_SESSION_COOKIE } from "@/constants/auth-cookies"
import { buildSessionCookieHeader } from "@/server/lib/session-cookie"
import type {
  AuthLoginResponseData,
  AuthLoginType,
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
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
import {
  parseAuthLoginBody,
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

type RequestLike = {
  json: () => Promise<unknown>
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

      const data = await dependencies.finalizeAuthLogin(auth.user, input.data.loginType)

      return appendUserSessionCookie(jsonSuccess(data), data.userId)
    } catch (error) {
      if (isUserAccountDisabledError(error)) {
        return jsonError(error.code, error.message, 403)
      }
      return jsonInternalErrorFromError(error, "登录流程处理失败")
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
