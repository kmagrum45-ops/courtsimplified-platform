"use client";

import FormsWorkspace from "../../../forms/FormsWorkspace";
import { useCaseHome } from "../../_components/CaseHomeContext";

/** Forms: the official forms for this case's court, and which apply to it. */
export default function CaseFormsSection() {
  const { caseRecord } = useCaseHome();
  return <FormsWorkspace caseId={caseRecord.id} courtPath={caseRecord.court_path} embedded />;
}
