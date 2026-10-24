import { redirect } from "next/navigation";

/** Root URL redirects to the dashboard. */
export default function RootPage() {
  redirect("/dashboard");
}
