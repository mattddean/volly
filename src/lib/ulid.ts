import { ulid as ulidBase } from "ulid";

export function ulid() {
  return ulidBase().toLowerCase();
}
