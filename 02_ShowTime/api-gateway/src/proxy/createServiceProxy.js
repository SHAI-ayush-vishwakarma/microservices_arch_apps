import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config.js";

export function createServiceProxy({ name, target, pathFilter }) {
  return createProxyMiddleware({
    target,
    pathFilter,
    changeOrigin: true,
    proxyTimeout: config.PROXY_TIMEOUT_MS,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader("x-request-id", req.requestId);
        if (req.user) {
          proxyReq.setHeader("x-user-id", req.user.id);
          proxyReq.setHeader("x-user-email", req.user.email);
          proxyReq.setHeader("x-user-role", req.user.role);
        }
      },
      error: (error, req, res) => {
        console.error(`[api-gateway] [${req.requestId}] ${name} unavailable: ${error.message}`);
        if (!res.headersSent) {
          res.status(503).json({ success: false, data: null, error: `${name} is unavailable, please try again later` });
        }
      },
    },
  });
}
