import { describe, expect, it } from "vitest";
import { OkxApiError } from "../packages/okx-demo-adapter/src/index.js";
import { formatMissionControlOkxErrorDetail } from "../apps/dashboard/src/mission-control-server.js";

describe("formatMissionControlOkxErrorDetail", () => {
  it("includes request diagnostics and auth probe details for HTTP 401 errors", () => {
    const error = new OkxApiError("OKX_HTTP_ERROR", "OKX HTTP request failed with status 401.", {
      status: 401,
      method: "POST",
      requestPath: "/api/v5/trade/order",
      requestBodyHash: "abc123def456",
      authProbe: {
        ok: true,
        status: 200
      }
    });

    expect(formatMissionControlOkxErrorDetail(error)).toBe(
      "error=OKX HTTP request failed with status 401. okxCode=OKX_HTTP_ERROR httpStatus=401 method=POST requestPath=/api/v5/trade/order requestBodyHash=abc123def456 authProbeOk=yes authProbeStatus=200"
    );
  });
});
