import { Suspense } from "react";
import { CheckinForm } from "./_/form";

export default async function Checkin() {
  return (
    <Suspense>
      <CheckinForm />
    </Suspense>
  );
}
