/**
 * Domain module: Danish Folkeoplysning Municipal Attendance CSV Generator
 * Implements Clarification #4:
 * - Generates audit-ready CSV reports for Roskilde Kommune / Folkeoplysning municipal subsidies.
 * - Covers ALL attending club members regardless of age.
 * - Calculates participant age as of the session date and categorizes age brackets:
 *   - "UNDER_18" (Youth grant eligible)
 *   - "18_TO_24" (Young adult Folkeoplysning subsidy eligible)
 *   - "25_AND_OVER" (Adult club member)
 * - Formats output with valid CSV escaping and standard UTF-8 header.
 */

export interface FolkeoplysningAttendanceRow {
  sessionDate: Date | string;
  sessionType: string; // e.g. "MATCH_LEAGUE", "NET_PRACTICE"
  squadName: string;
  facilityName: string;
  memberId: string;
  memberName: string;
  dateOfBirth?: Date | string | null;
  attendanceStatus: "PRESENT" | "LATE" | "ABSENT_EXCUSED" | "NO_SHOW";
  arrivalTime?: Date | string | null;
  recordedByName: string;
}

export type AgeBracket = "UNDER_18" | "18_TO_24" | "25_AND_OVER" | "UNKNOWN";

/**
 * Calculates exact age at session date.
 */
export function calculateAgeAtDate(
  dobInput: Date | string | null | undefined,
  sessionDateInput: Date | string
): number | null {
  if (!dobInput) return null;
  const dob = typeof dobInput === "string" ? new Date(dobInput) : dobInput;
  const session = typeof sessionDateInput === "string" ? new Date(sessionDateInput) : sessionDateInput;

  if (isNaN(dob.getTime()) || isNaN(session.getTime())) {
    return null;
  }

  let age = session.getFullYear() - dob.getFullYear();
  const m = session.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && session.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Resolves Danish municipal subsidy age bracket.
 */
export function resolveAgeBracket(age: number | null): AgeBracket {
  if (age === null || age === undefined) return "UNKNOWN";
  if (age < 18) return "UNDER_18";
  if (age <= 24) return "18_TO_24";
  return "25_AND_OVER";
}

/**
 * Escapes fields containing commas, quotes, or newlines for CSV compliance.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Generates an audit-ready Folkeoplysning CSV document.
 */
export function generateFolkeoplysningCsv(rows: FolkeoplysningAttendanceRow[]): string {
  const headers = [
    "Session Date",
    "Session Type",
    "Squad Name",
    "Facility / Ground",
    "Member ID",
    "Member Name",
    "Date of Birth",
    "Age At Session",
    "Folkeoplysning Age Bracket",
    "Attendance Status",
    "Arrival Time",
    "Recorded By",
  ];

  const csvLines: string[] = [];
  csvLines.push(headers.join(","));

  for (const row of rows) {
    const sessionDateObj = new Date(row.sessionDate);
    const dateFormatted = !isNaN(sessionDateObj.getTime())
      ? sessionDateObj.toISOString().split("T")[0]
      : String(row.sessionDate);

    let dobFormatted = "";
    if (row.dateOfBirth) {
      const dobObj = new Date(row.dateOfBirth);
      if (!isNaN(dobObj.getTime())) {
        dobFormatted = dobObj.toISOString().split("T")[0];
      }
    }

    const age = calculateAgeAtDate(row.dateOfBirth, row.sessionDate);
    const ageBracket = resolveAgeBracket(age);

    let arrivalTimeFormatted = "";
    if (row.arrivalTime) {
      const arrObj = new Date(row.arrivalTime);
      if (!isNaN(arrObj.getTime())) {
        arrivalTimeFormatted = arrObj.toISOString().substring(11, 16); // "HH:MM"
      }
    }

    const line = [
      escapeCsvField(dateFormatted),
      escapeCsvField(row.sessionType),
      escapeCsvField(row.squadName),
      escapeCsvField(row.facilityName),
      escapeCsvField(row.memberId),
      escapeCsvField(row.memberName),
      escapeCsvField(dobFormatted),
      escapeCsvField(age !== null ? age : ""),
      escapeCsvField(ageBracket),
      escapeCsvField(row.attendanceStatus),
      escapeCsvField(arrivalTimeFormatted),
      escapeCsvField(row.recordedByName),
    ].join(",");

    csvLines.push(line);
  }

  return csvLines.join("\r\n");
}
