// Module 5: Club Communications & Announcements
export * from "./contracts/announcement.contract";
export * from "./contracts/document.contract";
export * from "./domain/announcement-dispatcher";
export * from "./domain/policy-compliance";
export * from "./services/announcement.service";
export * from "./services/document.service";
export * from "./actions/announcement.actions";
export {
  createClubDocumentAction,
  updateClubDocumentAction,
  signOffDocumentAction,
  sendPolicyReminderAction,
} from "./actions/document.actions";

// Type re-exports for convenience
export type {
  Announcement,
  AnnouncementReadReceipt,
  ClubDocument,
  DocumentSignOff,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  DocumentCategory,
} from "@prisma/client";

export type ClubAnnouncement = import("@prisma/client").Announcement;
