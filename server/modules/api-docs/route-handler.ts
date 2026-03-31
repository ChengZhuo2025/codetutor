import { buildOpenApiDocument } from "./openapi.ts"
import { jsonAuthRequired } from "../../lib/route-response.ts"

type RequestLike = Request

export type OpenApiJsonRouteDependencies = {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
}

export function createOpenApiJsonRouteHandler(
  dependencies: OpenApiJsonRouteDependencies,
) {
  return async function GET(request: RequestLike) {
    const auth = await dependencies.getRequestAuth(request)

    if (!auth) {
      return jsonAuthRequired(dependencies.getRequestAuthHelpText())
    }

    return Response.json(buildOpenApiDocument(), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    })
  }
}
