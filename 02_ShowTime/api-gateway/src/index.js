import { config } from "./config.js";
import app from "./app.js";

app.listen(config.PORT, () => {
  console.log(`[api-gateway] running on port ${config.PORT}`);
});
