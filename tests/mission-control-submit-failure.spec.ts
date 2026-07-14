import { describe, expect, it } from "vitest";
import { OkxApiError } from "../packages/okx-demo-adapter/src/index.js";
import { classifyMissionControlSubmitFailure } from "../apps/dashboard/src/mission-control-server.js";

describe("classifyMissionControlSubmitFailure", () => {
  it("treats HTTP 500 submit failures as transient", () => {
    const error = new OkxApiError("OKX_HTTP_ERROR", "OKX HTTP request failed with status 500.", {
      status: 500,
      method: "POST",
      requestPath: "/api/v5/trade/order"
    });

    expect(classifyMissionControlSubmitFailure(error)).toEqual({
      transient: true,
      message:
        "error=OKX HTTP request failed with status 500. okxCode=OKX_HTTP_ERROR httpStatus=500 method=POST requestPath=/api/v5/trade/order"
    });
  });

  it("treats non-permanent HTTP 401 trade submit failures as transient", () => {
    const error = new OkxApiError("OKX_HTTP_ERROR", "OKX HTTP request failed with status 401.", {
      status: 401,
      method: "POST",
      requestPath: "/api/v5/trade/order"
    });

    expect(classifyMissionControlSubmitFailure(error)).toEqual({
      transient: true,
      message:
        "error=OKX HTTP request failed with status 401. okxCode=OKX_HTTP_ERROR httpStatus=401 method=POST requestPath=/api/v5/trade/order"
    });
  });

  it("treats IP-whitelist HTTP 401 failures as non-transient", () => {
    const error = new OkxApiError("OKX_HTTP_ERROR", "OKX HTTP request failed with status 401.", {
      status: 401,
      method: "POST",
      requestPath: "/api/v5/trade/order",
      code: "50110",
      msg: "Your IP is not included in your API key whitelist."
    });

    expect(classifyMissionControlSubmitFailure(error)).toEqual({
      transient: false,
      message:
        "error=OKX HTTP request failed with status 401. okxCode=OKX_HTTP_ERROR httpStatus=401 method=POST requestPath=/api/v5/trade/order apiCode=50110 apiMsg=Your IP is not included in your API key whitelist."
    });
  });

  it("treats config failures as non-transient", () => {
    const error = new OkxApiError("OKX_CONFIG_ERROR", "Missing API key.");

    expect(classifyMissionControlSubmitFailure(error)).toEqual({
      transient: false,
      message: "error=Missing API key. okxCode=OKX_CONFIG_ERROR"
    });
  });

  it("treats duplicate client order id rejects as non-fatal submit failures", () => {
    const error = new OkxApiError("OKX_ORDER_REJECTED", "Client order ID already exists.", {
      sCode: "51016",
      sMsg: "Client order ID already exists."
    });

    expect(classifyMissionControlSubmitFailure(error)).toEqual({
      transient: true,
      message:
        "error=Client order ID already exists. okxCode=OKX_ORDER_REJECTED sCode=51016 sMsg=Client order ID already exists."
    });
  });

  it("treats price-band rejects as non-fatal submit failures", () => {
    const error = new OkxApiError("OKX_ORDER_REJECTED", "The highest price limit for the buy leg is 71,589.3.", {
      sCode: "51137",
      sMsg: "The highest price limit for the buy leg is 71,589.3."
    });

    expect(classifyMissionControlSubmitFailure(error)).toEqual({
      transient: true,
      message:
        "error=The highest price limit for the buy leg is 71,589.3. okxCode=OKX_ORDER_REJECTED sCode=51137 sMsg=The highest price limit for the buy leg is 71,589.3."
    });
  });

  it("treats embedded price-band API errors as non-fatal submit failures", () => {
    const error = new OkxApiError("OKX_API_ERROR", "All operations failed", {
      code: "1",
      msg: "All operations failed",
      data: [
        {
          sCode: "51137",
          sMsg: "The highest price limit for the buy leg is 71,589.3."
        }
      ]
    });

    expect(classifyMissionControlSubmitFailure(error)).toEqual({
      transient: true,
      message:
        "error=All operations failed okxCode=OKX_API_ERROR apiCode=1 apiMsg=All operations failed sCode=51137 sMsg=The highest price limit for the buy leg is 71,589.3."
    });
  });
});
