import { createHelpers } from "@echo/core";
import * as schema from "~/db/schema";

const { defineOperation } = createHelpers(schema);

export { defineOperation };
