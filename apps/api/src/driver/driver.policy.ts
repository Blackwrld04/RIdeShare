export const REQUIRED_DRIVER_DOCUMENT_KINDS = [
  "driver_license",
  "government_id",
  "profile_photo",
  "vehicle_registration",
  "vehicle_insurance",
  "roadworthiness_certificate",
  "vehicle_photo",
] as const;

const EXPIRING_DRIVER_DOCUMENT_KINDS = new Set<string>([
  "driver_license",
  "vehicle_insurance",
  "roadworthiness_certificate",
]);

export interface DriverSubmissionSnapshot {
  profileDisplayName: string | null;
  legalFirstName: string | null;
  legalLastName: string | null;
  dateOfBirth: Date | null;
  residentialAddress: string | null;
  city: string | null;
  state: string | null;
  vehicle: { id: string } | null;
  documents: Array<{
    kind: string;
    status: string;
    expiresOn: Date | null;
  }>;
}

export function getDriverSubmissionIssues(
  snapshot: DriverSubmissionSnapshot,
  now = new Date(),
): string[] {
  const issues: string[] = [];
  const fields = [
    ["profile.display_name", snapshot.profileDisplayName],
    ["application.legal_first_name", snapshot.legalFirstName],
    ["application.legal_last_name", snapshot.legalLastName],
    ["application.date_of_birth", snapshot.dateOfBirth],
    ["application.residential_address", snapshot.residentialAddress],
    ["application.city", snapshot.city],
    ["application.state", snapshot.state],
  ] as const;

  for (const [key, value] of fields) {
    if (!value) {
      issues.push(key);
    }
  }

  if (snapshot.dateOfBirth && !isAtLeastEighteen(snapshot.dateOfBirth, now)) {
    issues.push("application.minimum_age");
  }

  if (!snapshot.vehicle) {
    issues.push("vehicle");
  }

  const documents = new Map(
    snapshot.documents.map((document) => [document.kind, document]),
  );
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  for (const kind of REQUIRED_DRIVER_DOCUMENT_KINDS) {
    const document = documents.get(kind);

    if (!document) {
      issues.push(`documents.${kind}`);
      continue;
    }

    if (document.status === "REJECTED") {
      issues.push(`documents.${kind}.rejected`);
    }

    if (EXPIRING_DRIVER_DOCUMENT_KINDS.has(kind) && !document.expiresOn) {
      issues.push(`documents.${kind}.expiry`);
    } else if (document.expiresOn && document.expiresOn < today) {
      issues.push(`documents.${kind}.expired`);
    }
  }

  return issues;
}

function isAtLeastEighteen(dateOfBirth: Date, now: Date): boolean {
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()),
  );
  return dateOfBirth <= cutoff;
}
