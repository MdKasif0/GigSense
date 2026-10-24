import { redirect } from "next/navigation";

/** /route-reality/new → redirect to the main RouteReality page which contains the form. */
export default function NewDeliveryPage() {
  redirect("/route-reality");
}
