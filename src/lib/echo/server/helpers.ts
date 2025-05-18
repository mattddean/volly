import * as schema from "~/db/schema";
import { createServerHelpers } from "~/echo/server/helpers";

const { defineOperation } = createServerHelpers(schema);

export { defineOperation };
