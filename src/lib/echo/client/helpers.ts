import { createClientHelpers } from "@echo/client/helpers";
import * as schema from "~/db/schema";

const { useOperation } = createClientHelpers(schema);

export { useOperation };
