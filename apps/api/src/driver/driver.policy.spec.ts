import { describe, expect, it } from "vitest";
import {
  type DriverSubmissionSnapshot,
  getDriverSubmissionIssues,
  REQUIRED_DRIVER_DOCUMENT_KINDS,
} from "./driver.policy.js";

function completeSnapshot(): DriverSubmissionSnapshot {
  return {
    profileDisplayName: "Ada Okafor",
    legalFirstName: "Ada",
    legalLastName: "Okafor",
    dateOfBirth: new Date("1995-02-10T00:00:00.000Z"),
    residentialAddress: "12 Marina Road",
    city: "Lagos",
    state: "Lagos",
    vehicle: { id: "vehicle-id" },
    bankAccountStatus: "VERIFIED",
    documents: REQUIRED_DRIVER_DOCUMENT_KINDS.map((kind) => ({
      kind,
      status: "PENDING",
      expiresOn: [
        "driver_license",
        "vehicle_insurance",
        "roadworthiness_certificate",
      ].includes(kind)
        ? new Date("2027-10-14T00:00:00.000Z")
        : null,
    })),
  };
}

describe("driver submission policy", () => {
  it("accepts a complete application", () => {
    expect(
      getDriverSubmissionIssues(
        completeSnapshot(),
        new Date("2026-10-14T12:00:00.000Z"),
      ),
    ).toEqual([]);
  });

  it("reports missing, rejected, and expired requirements", () => {
    const snapshot = completeSnapshot();
    snapshot.profileDisplayName = null;
    snapshot.bankAccountStatus = null;
    snapshot.documents = snapshot.documents.filter(
      (document) => document.kind !== "government_id",
    );
    const license = snapshot.documents.find(
      (document) => document.kind === "driver_license",
    );

    if (!license) {
      throw new Error("Missing driver license fixture");
    }

    license.status = "REJECTED";
    license.expiresOn = new Date("2026-10-13T00:00:00.000Z");

    expect(
      getDriverSubmissionIssues(snapshot, new Date("2026-10-14T12:00:00.000Z")),
    ).toEqual(
      expect.arrayContaining([
        "profile.display_name",
        "bank_account",
        "documents.government_id",
        "documents.driver_license.rejected",
        "documents.driver_license.expired",
      ]),
    );
  });

  it("enforces the minimum driver age", () => {
    const snapshot = completeSnapshot();
    snapshot.dateOfBirth = new Date("2008-10-15T00:00:00.000Z");

    expect(
      getDriverSubmissionIssues(snapshot, new Date("2026-10-14T12:00:00.000Z")),
    ).toContain("application.minimum_age");
  });
});
