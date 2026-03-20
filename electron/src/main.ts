import "dotenv/config";

import app from "./app";
import log from "./log";

log.init();
void app.init();
