import { prisma } from "@/lib/db";
import { validateDelegationAccess } from "../domain/delegation-rules";
import { getCommunicationsGdprExportData } from "@/modules/communications/services/communications-gdpr.service";

export interface GdprExportPackage {
  metadata: {
    exportDate: string;
    club: string;
    policyVersion: string;
    requesterProfileId: string;
    subjectProfileId: string;
    isDelegated: boolean;
  };
  personalData: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    dateOfBirth: string | null;
    createdAt: string;
  };
  clubRoles: {
    role: string;
    assignedAt: string;
  }[];
  cricketProfile: {
    battingPosition: string | null;
    bowlingStyle: string | null;
    secondaryRoles: string[];
  };
  apparelKitSizes: {
    shirtSize: string | null;
    trouserSize: string | null;
    capSize: string | null;
  };
  emergencyContacts: {
    name: string;
    relationship: string;
    phone: string;
    isPrimary: boolean;
  }[];
  familyLinks: {
    parents: { id: string; name: string; relationship: string | null }[];
    children: { id: string; name: string; relationship: string | null }[];
  };
  directoryPrivacySettings: {
    showEmailInDirectory: boolean;
    showPhoneInDirectory: boolean;
    showAddressInDirectory: boolean;
  } | null;
  consentRecords: {
    id: string;
    policyVersion: string;
    consentedAt: string;
    consentedBy: string;
    type: "GIVEN_BY_ME" | "RECEIVED_FOR_ME";
  }[];
  auditHistory: {
    id: string;
    action: string;
    timestamp: string;
    role: "ACTOR" | "TARGET";
  }[];
  equipmentLoansHistory: {
    id: string;
    itemName: string;
    assetTag: string | null;
    category: string;
    quantity: number;
    status: string;
    checkedOutAt: string;
    expectedReturnAt: string;
    returnedAt: string | null;
    checkoutCondition: string;
    returnCondition: string | null;
    extensions: {
      proposedReturnAt: string;
      reason: string;
      status: string;
      reviewedAt: string | null;
    }[];
    damageReports: {
      severity: string;
      description: string;
      status: string;
      createdAt: string;
    }[];
  }[];
  squadMemberships: {
    squadId: string;
    squadName: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
  }[];
  eventRsvps: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    status: string;
    transportNote: string | null;
    submittedAt: string;
  }[];
  matchSelections: {
    eventId: string;
    eventTitle: string;
    matchDate: string;
    selectionRole: string;
    tacticalRole: string;
    battingOrderPosition: number | null;
  }[];
  attendanceHistory: {
    eventId: string;
    eventTitle: string;
    sessionDate: string;
    status: string;
    arrivalTime: string | null;
    notes: string | null;
  }[];
  subscriptions: {
    id: string;
    planName: string;
    planCategory: string;
    seasonYear: number;
    seasonCycle: string;
    status: string;
    hasSiblingDiscount: boolean;
    siblingDiscountOere: number;
    manualDiscountOere: number | null;
    finalFeeOere: number;
    createdAt: string;
  }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    paymentReference: string;
    category: string;
    status: string;
    subtotalOere: number;
    discountOere: number;
    totalOere: number;
    paidOere: number;
    issueDate: string;
    dueDate: string;
    paidAt: string | null;
    lineItems: {
      description: string;
      quantity: number;
      unitPriceOere: number;
      totalOere: number;
    }[];
  }[];
  paymentHistory: {
    id: string;
    invoiceNumber: string;
    amountOere: number;
    paymentMethod: string;
    status: string;
    transactionReference: string | null;
    reportedAt: string;
    verifiedAt: string | null;
    settlementDate: string;
  }[];
  communicationsAndVolunteers: {
    authoredAnnouncements: {
      id: string;
      title: string;
      slug: string;
      category: string;
      priority: string;
      publishedAt: string;
    }[];
    readReceipts: {
      announcementId: string;
      announcementTitle: string;
      readAt: string;
    }[];
    volunteerDutyHistory: {
      slotId: string;
      eventId: string;
      eventTitle: string;
      eventDate: string;
      dutyType: string;
      status: string;
      claimedAt: string | null;
      carpoolSeats: number | null;
    }[];
    signedDocuments: {
      documentId: string;
      documentTitle: string;
      category: string;
      versionSigned: string;
      signedAt: string;
    }[];
  };
}

/**
 * Generates an immutable, machine-readable JSON data export package
 * for a member (or parent for linked youth) under GDPR Article 15 & 20 (FR-073).
 */
export async function generateGdprExport(params: {
  targetProfileId: string;
  requesterProfileId: string;
}): Promise<GdprExportPackage> {
  const { targetProfileId, requesterProfileId } = params;

  // 1. Authorization check
  const requester = await prisma.memberProfile.findUnique({
    where: { id: requesterProfileId },
    select: {
      id: true,
      roleAssignments: { select: { role: true } },
      parentLinksAsParent: { select: { playerId: true } },
    },
  });

  if (!requester) {
    throw new Error("Requester profile not found.");
  }

  const requesterRoles = requester.roleAssignments.map((ra) => ra.role);
  const linkedChildIds = requester.parentLinksAsParent.map((l) => l.playerId);

  const delegation = validateDelegationAccess(
    {
      profileId: requester.id,
      roles: requesterRoles,
      linkedChildIds,
    },
    targetProfileId
  );

  if (!delegation.authorized) {
    throw new Error("You are not authorized to export data for this profile (GDPR Article 15).");
  }

  // 2. Query all member records
  const target = await prisma.memberProfile.findUnique({
    where: { id: targetProfileId },
    include: {
      roleAssignments: true,
      emergencyContacts: true,
      privacySettings: true,
      consentsReceived: {
        include: { consentedBy: { select: { firstName: true, lastName: true } } },
      },
      consentsGiven: {
        include: { subjectProfile: { select: { firstName: true, lastName: true } } },
      },
      parentLinksAsPlayer: {
        include: { parent: { select: { id: true, firstName: true, lastName: true } } },
      },
      parentLinksAsParent: {
        include: { player: { select: { id: true, firstName: true, lastName: true } } },
      },
      actionsPerformed: {
        take: 50,
        orderBy: { createdAt: "desc" },
      },
      actionsTargeted: {
        take: 50,
        orderBy: { createdAt: "desc" },
      },
      borrowedEquipment: {
        include: {
          equipmentItem: {
            select: { name: true, assetTag: true, category: true },
          },
          extensions: true,
          damageReports: true,
        },
        orderBy: { checkedOutAt: "desc" },
      },
      rosterMemberships: {
        include: { teamSquad: { select: { id: true, name: true } } },
      },
      rsvps: {
        include: {
          scheduledEvent: { select: { id: true, title: true, date: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      matchSelections: {
        include: {
          matchSelection: {
            include: {
              scheduledEvent: { select: { id: true, title: true, date: true } },
            },
          },
        },
      },
      attendances: {
        include: {
          scheduledEvent: { select: { id: true, title: true, date: true } },
        },
        orderBy: { recordedAt: "desc" },
      },
    },
  });

  if (!target) {
    throw new Error("Member profile not found.");
  }

  // 2b. Query Module 4 financial records
  const subscriptions = await prisma.memberSubscription.findMany({
    where: { memberProfileId: targetProfileId },
    include: { plan: { select: { name: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { memberProfileId: targetProfileId },
        { billedToProfileId: targetProfileId },
      ],
    },
    include: {
      lineItems: true,
    },
    orderBy: { issueDate: "desc" },
  });

  const payments = await prisma.paymentTransaction.findMany({
    where: { reportedById: targetProfileId },
    include: {
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { reportedAt: "desc" },
  });

  const communicationsAndVolunteers = await getCommunicationsGdprExportData(targetProfileId);

  // 3. Assemble package
  const exportPackage: GdprExportPackage = {
    metadata: {
      exportDate: new Date().toISOString(),
      club: "Roskilde Cricket Club (RCC)",
      policyVersion: "2026.1",
      requesterProfileId,
      subjectProfileId: targetProfileId,
      isDelegated: delegation.isDelegated,
    },
    personalData: {
      id: target.id,
      firstName: target.firstName,
      lastName: target.lastName,
      email: target.email,
      phone: target.phone,
      address: target.address,
      city: target.city,
      postalCode: target.postalCode,
      dateOfBirth: target.dateOfBirth?.toISOString() || null,
      createdAt: target.createdAt.toISOString(),
    },
    clubRoles: target.roleAssignments.map((ra) => ({
      role: ra.role,
      assignedAt: ra.assignedAt.toISOString(),
    })),
    cricketProfile: {
      battingPosition: target.battingPosition,
      bowlingStyle: target.bowlingStyle,
      secondaryRoles: target.secondaryRoles,
    },
    apparelKitSizes: {
      shirtSize: target.shirtSize,
      trouserSize: target.trouserSize,
      capSize: target.capSize,
    },
    emergencyContacts: target.emergencyContacts.map((ec) => ({
      name: ec.name,
      relationship: ec.relationship,
      phone: ec.phone,
      isPrimary: ec.isPrimary,
    })),
    familyLinks: {
      parents: target.parentLinksAsPlayer.map((pl) => ({
        id: pl.parent.id,
        name: `${pl.parent.firstName} ${pl.parent.lastName}`.trim(),
        relationship: pl.relationship,
      })),
      children: target.parentLinksAsParent.map((pl) => ({
        id: pl.player.id,
        name: `${pl.player.firstName} ${pl.player.lastName}`.trim(),
        relationship: pl.relationship,
      })),
    },
    directoryPrivacySettings: target.privacySettings
      ? {
          showEmailInDirectory: target.privacySettings.showEmailInDirectory,
          showPhoneInDirectory: target.privacySettings.showPhoneInDirectory,
          showAddressInDirectory: target.privacySettings.showAddressInDirectory,
        }
      : null,
    consentRecords: [
      ...target.consentsReceived.map((cr) => ({
        id: cr.id,
        policyVersion: cr.policyVersion,
        consentedAt: cr.consentedAt.toISOString(),
        consentedBy: `${cr.consentedBy.firstName} ${cr.consentedBy.lastName}`.trim(),
        type: "RECEIVED_FOR_ME" as const,
      })),
      ...target.consentsGiven.map((cg) => ({
        id: cg.id,
        policyVersion: cg.policyVersion,
        consentedAt: cg.consentedAt.toISOString(),
        consentedBy: `${target.firstName} ${target.lastName}`.trim(),
        type: "GIVEN_BY_ME" as const,
      })),
    ],
    auditHistory: [
      ...target.actionsPerformed.map((ap) => ({
        id: ap.id,
        action: ap.action,
        timestamp: ap.createdAt.toISOString(),
        role: "ACTOR" as const,
      })),
      ...target.actionsTargeted.map((at) => ({
        id: at.id,
        action: at.action,
        timestamp: at.createdAt.toISOString(),
        role: "TARGET" as const,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    equipmentLoansHistory: target.borrowedEquipment.map((loan) => ({
      id: loan.id,
      itemName: loan.equipmentItem.name,
      assetTag: loan.equipmentItem.assetTag,
      category: loan.equipmentItem.category,
      quantity: loan.quantity,
      status: loan.status,
      checkedOutAt: loan.checkedOutAt.toISOString(),
      expectedReturnAt: loan.expectedReturnAt.toISOString(),
      returnedAt: loan.returnedAt?.toISOString() || null,
      checkoutCondition: loan.checkoutCondition,
      returnCondition: loan.returnCondition || null,
      extensions: loan.extensions.map((ext) => ({
        proposedReturnAt: ext.proposedReturnAt.toISOString(),
        reason: ext.reason,
        status: ext.status,
        reviewedAt: ext.reviewedAt?.toISOString() || null,
      })),
      damageReports: loan.damageReports.map((dr) => ({
        severity: dr.severity,
        description: dr.description,
        status: dr.status,
        createdAt: dr.createdAt.toISOString(),
      })),
    })),
    squadMemberships: target.rosterMemberships.map((rm) => ({
      squadId: rm.teamSquad.id,
      squadName: rm.teamSquad.name,
      role: rm.rosterRole,
      isActive: rm.isActive,
      joinedAt: rm.joinedAt.toISOString(),
    })),
    eventRsvps: target.rsvps.map((r) => ({
      eventId: r.scheduledEvent.id,
      eventTitle: r.scheduledEvent.title,
      eventDate: r.scheduledEvent.date.toISOString(),
      status: r.status,
      transportNote: r.transportNote,
      submittedAt: r.submittedAt.toISOString(),
    })),
    matchSelections: target.matchSelections.map((ms) => ({
      eventId: ms.matchSelection.scheduledEvent.id,
      eventTitle: ms.matchSelection.scheduledEvent.title,
      matchDate: ms.matchSelection.scheduledEvent.date.toISOString(),
      selectionRole: ms.selectionRole,
      tacticalRole: ms.tacticalRole,
      battingOrderPosition: ms.battingOrderPosition,
    })),
    attendanceHistory: target.attendances.map((att) => ({
      eventId: att.scheduledEvent.id,
      eventTitle: att.scheduledEvent.title,
      sessionDate: att.scheduledEvent.date.toISOString(),
      status: att.status,
      arrivalTime: att.arrivalTime?.toISOString() || null,
      notes: att.notes,
    })),
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      planName: s.plan.name,
      planCategory: s.plan.category,
      seasonYear: s.seasonYear,
      seasonCycle: s.seasonCycle,
      status: s.status,
      hasSiblingDiscount: s.hasSiblingDiscount,
      siblingDiscountOere: s.siblingDiscountOere,
      manualDiscountOere: s.manualDiscountOere,
      finalFeeOere: s.finalFeeOere,
      createdAt: s.createdAt.toISOString(),
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      paymentReference: inv.paymentReference,
      category: inv.category,
      status: inv.status,
      subtotalOere: inv.subtotalOere,
      discountOere: inv.discountOere,
      totalOere: inv.totalOere,
      paidOere: inv.paidOere,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() || null,
      lineItems: inv.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPriceOere: li.unitPriceOere,
        totalOere: li.totalOere,
      })),
    })),
    paymentHistory: payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice.invoiceNumber,
      amountOere: p.amountOere,
      paymentMethod: p.paymentMethod,
      status: p.status,
      transactionReference: p.transactionReference,
      reportedAt: p.reportedAt.toISOString(),
      verifiedAt: p.verifiedAt?.toISOString() || null,
      settlementDate: p.settlementDate.toISOString(),
    })),
    communicationsAndVolunteers,
  };

  // 4. Log export event
  await prisma.auditLog.create({
    data: {
      actorProfileId: requesterProfileId,
      targetProfileId,
      action: "GDPR_DATA_EXPORTED",
      metadata: {
        isDelegated: delegation.isDelegated,
      },
    },
  });

  return exportPackage;
}
