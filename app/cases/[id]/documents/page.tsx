"use client";

import { useState } from "react";

import EvidenceUploadCard from "../../../builder/_components/EvidenceUploadCard";
import CaseWorkspace from "../../_components/CaseWorkspace";
import { useCaseHome } from "../../_components/CaseHomeContext";

/**
 * Documents: add files, check what was read from them and confirm their dates,
 * keep a log of communications, and build the exhibit book.
 */
export default function CaseDocumentsSection() {
  const { caseRecord } = useCaseHome();
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      <EvidenceUploadCard
        caseId={caseRecord.id}
        showDocumentsLink={false}
        onUploaded={() => setRefreshKey((key) => key + 1)}
      />
      <CaseWorkspace
        caseId={caseRecord.id}
        sections={["documents", "communications", "exhibit-book"]}
        refreshKey={refreshKey}
      />
    </div>
  );
}
