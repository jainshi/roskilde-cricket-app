// Module 5: Club Communications & Announcements
export * from "./contracts/announcement.contract";
export * from "./domain/announcement-dispatcher";
export * from "./domain/policy-compliance";
export * from "./services/announcement.service";
export * from "./actions/announcement.actions";

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
