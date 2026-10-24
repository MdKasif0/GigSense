import { redirect } from "next/navigation";

/** /gig-proof/new → redirect to the main GigProof page which contains the form. */
export default function NewIncidentPage() {
  redirect("/gig-proof");
}
