import { Suspense } from "react";
import { CheckinForm } from "./_/form";
import { FullPageLoading } from "~/components/full-page-loading";

export default async function Checkin() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <CheckinForm />
    </Suspense>
  );
}
