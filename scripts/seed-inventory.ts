import { PrismaClient, TrackingType, EquipmentCategory, AgeGroup, ItemCondition, ItemStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function seedInventory() {
  console.log("🏏 Starting Roskilde Cricket Club Inventory Seed...");

  const items = [
    // --- SERIALIZED ITEMS ---
    {
      assetTag: "BAT-2026-001",
      name: "Kookaburra Kahuna Senior Match Bat",
      description: "Grade 1 English Willow senior match bat. Match play only.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.BATTING,
      ageGroup: AgeGroup.SENIOR,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Locker 1",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 149900, // 1,499.00 DKK
      acquisitionDate: new Date("2025-04-10"),
    },
    {
      assetTag: "BAT-2026-002",
      name: "Gray-Nicolls GN500 Junior Match Bat",
      description: "Size 5 youth Kashmir willow bat for U13/U15 league play.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.BATTING,
      ageGroup: AgeGroup.JUNIOR,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Locker 1",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 79900, // 799.00 DKK
      acquisitionDate: new Date("2025-05-15"),
    },
    {
      assetTag: "HLM-2026-001",
      name: "Masuri Vision Test Helmet (Senior)",
      description: "Senior batting helmet with titanium grille. Certified safety standard BS 7928:2013.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.PROTECTIVE,
      ageGroup: AgeGroup.SENIOR,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Shelf A",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 119900, // 1,199.00 DKK
      acquisitionDate: new Date("2025-04-12"),
    },
    {
      assetTag: "HLM-2026-002",
      name: "Shrey Master Class Junior Helmet",
      description: "Junior youth batting helmet with steel grille. Certified safety gear.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.PROTECTIVE,
      ageGroup: AgeGroup.JUNIOR,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Shelf A",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 85000, // 850.00 DKK
      acquisitionDate: new Date("2025-06-01"),
    },
    {
      assetTag: "PAD-2026-001",
      name: "Kookaburra Pro Batting Pads (Youth)",
      description: "Youth right-hand batting leg guards.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.BATTING,
      ageGroup: AgeGroup.YOUTH,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Locker 2",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 55000, // 550.00 DKK
      acquisitionDate: new Date("2025-04-12"),
    },
    {
      assetTag: "MCH-2026-001",
      name: "BOLA Professional Bowling Machine",
      description: "Twin-wheel electric bowling machine with remote speed/spin dial and battery pack.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.TRAINING_GROUND,
      ageGroup: AgeGroup.UNIVERSAL,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Ground Container 1",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 2450000, // 24,500.00 DKK
      acquisitionDate: new Date("2024-03-20"),
    },
    {
      assetTag: "KEY-001",
      name: "Poppelgårdsvej Clubhouse & Shed Padlock Key",
      description: "Master padlock key for main equipment container and shed doors.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.FACILITY_KEYS,
      ageGroup: AgeGroup.UNIVERSAL,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Key Safe - Pavilion",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 35000, // 350.00 DKK
      acquisitionDate: new Date("2024-01-10"),
    },
    {
      assetTag: "KIT-2026-001",
      name: "Senior 1st XI Team Kit Bag",
      description: "Full squad match kit bag containing spare pads, gloves, stumps, and scorebook.",
      trackingType: TrackingType.SERIALIZED,
      category: EquipmentCategory.APPAREL_KIT,
      ageGroup: AgeGroup.SENIOR,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Locker 4",
      totalQuantity: 1,
      availableQuantity: 1,
      purchasePriceMinorUnits: 350000, // 3,500.00 DKK
      acquisitionDate: new Date("2025-04-01"),
    },

    // --- BULK CONSUMABLE ITEMS ---
    {
      assetTag: null,
      name: "County Match 4-Piece Red Leather Balls",
      description: "Box of DCF league approved 5.5oz red leather match balls.",
      trackingType: TrackingType.BULK,
      category: EquipmentCategory.BOWLING_BALLS,
      ageGroup: AgeGroup.SENIOR,
      condition: ItemCondition.NEW,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Shelf B",
      totalQuantity: 24,
      availableQuantity: 24,
      lowStockThreshold: 6,
      purchasePriceMinorUnits: 360000, // 3,600.00 DKK (150 DKK/ball)
      acquisitionDate: new Date("2026-03-15"),
    },
    {
      assetTag: null,
      name: "Kookaburra White Leather T20 Match Balls",
      description: "Box of DCF T20 tournament approved white leather balls.",
      trackingType: TrackingType.BULK,
      category: EquipmentCategory.BOWLING_BALLS,
      ageGroup: AgeGroup.SENIOR,
      condition: ItemCondition.NEW,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Shelf B",
      totalQuantity: 12,
      availableQuantity: 12,
      lowStockThreshold: 4,
      purchasePriceMinorUnits: 195000, // 1,950.00 DKK
      acquisitionDate: new Date("2026-03-15"),
    },
    {
      assetTag: null,
      name: "Fielding Agility Cones (Saucer Set)",
      description: "Multi-color saucer cones with carry strap for practice drills.",
      trackingType: TrackingType.BULK,
      category: EquipmentCategory.TRAINING_GROUND,
      ageGroup: AgeGroup.UNIVERSAL,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Bin 1",
      totalQuantity: 50,
      availableQuantity: 50,
      lowStockThreshold: 15,
      purchasePriceMinorUnits: 29900, // 299.00 DKK
      acquisitionDate: new Date("2025-04-10"),
    },
    {
      assetTag: null,
      name: "Training Squad Bibs (Fluo Yellow & Orange)",
      description: "Breathable mesh training bibs for intra-club practice matches.",
      trackingType: TrackingType.BULK,
      category: EquipmentCategory.APPAREL_KIT,
      ageGroup: AgeGroup.UNIVERSAL,
      condition: ItemCondition.GOOD,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Poppelgårdsvej Shed - Bin 2",
      totalQuantity: 20,
      availableQuantity: 20,
      lowStockThreshold: 5,
      purchasePriceMinorUnits: 49900, // 499.00 DKK
      acquisitionDate: new Date("2025-04-10"),
    },
    {
      assetTag: null,
      name: "Official DCF Cricket Scorebooks",
      description: "Hardcover 60-innings official league match scorebooks.",
      trackingType: TrackingType.BULK,
      category: EquipmentCategory.TRAINING_GROUND,
      ageGroup: AgeGroup.UNIVERSAL,
      condition: ItemCondition.NEW,
      status: ItemStatus.AVAILABLE,
      storageLocation: "Pavilion Office - Desk Drawer",
      totalQuantity: 8,
      availableQuantity: 8,
      lowStockThreshold: 2,
      purchasePriceMinorUnits: 120000, // 1,200.00 DKK
      acquisitionDate: new Date("2026-02-01"),
    },
  ];

  let createdCount = 0;
  for (const item of items) {
    if (item.assetTag) {
      const existing = await prisma.equipmentItem.findUnique({
        where: { assetTag: item.assetTag },
      });
      if (existing) {
        console.log(`  ↪ Skipping existing asset: ${item.assetTag} (${item.name})`);
        continue;
      }
    } else {
      const existing = await prisma.equipmentItem.findFirst({
        where: { name: item.name, trackingType: TrackingType.BULK },
      });
      if (existing) {
        console.log(`  ↪ Skipping existing bulk item: ${item.name}`);
        continue;
      }
    }

    await prisma.equipmentItem.create({ data: item });
    console.log(`  ✓ Created: ${item.assetTag ? `[${item.assetTag}] ` : ""}${item.name} (${item.category})`);
    createdCount++;
  }

  console.log(`\n🎉 Seed finished: ${createdCount} equipment items successfully seeded.`);
}

seedInventory()
  .catch((e) => {
    console.error("❌ Inventory seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
