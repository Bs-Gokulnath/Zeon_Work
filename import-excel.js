const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5433/monday1_dev' } },
});

const USER_ID = '266afbb7-8f5c-41d9-b492-793ca0910414';
const EXCEL_DIR = path.join(__dirname, 'Sample_Excel_From_Monday');

const COL = {
  NAME: 0, SUBITEMS: 1, PRIORITY: 2, STATE: 3, CITY: 4, LOCATION: 5,
  PROPERTY_TYPE: 6, GOOGLE_RATING: 7, NO_OF_RATINGS: 8, LAND_OWNER_CONTACT: 9,
  PHONE: 10, EMAIL: 11, POWER_AVAILABILITY: 12, OWNER: 13, STATUS: 14,
  INVESTMENT: 15, AVAILABLE_PARKING: 16, FILES: 17, NOTES: 18,
  REMINDER_DATE: 19, DUE_DATE: 20, ITEM_ID: 25,
};

const UPD = { ITEM_ID: 0, ITEM_NAME: 1, USER: 4, CREATED_AT: 5, CONTENT: 6 };

function str(val) {
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim() || null;
}

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function importFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const mainSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[mainSheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Board name = first cell
  const boardName = str(rows[0]?.[0]) || path.basename(filePath, '.xlsx');

  // Find header row (row with "Name" as first cell)
  const headerRowIdx = rows.findIndex((r) => r?.[0] === 'Name');
  if (headerRowIdx === -1) {
    console.log(`  Skipping ${boardName} - no header row found`);
    return;
  }

  // Find group name (row just before header that has a single string value)
  let groupName = 'To-Do';
  for (let i = headerRowIdx - 1; i >= 0; i--) {
    const r = rows[i];
    if (r && r.length === 1 && typeof r[0] === 'string' && r[0].trim()) {
      groupName = r[0].trim();
      break;
    }
  }

  // Data rows start after header
  const dataRows = rows.slice(headerRowIdx + 1).filter((r) => r && str(r[COL.NAME]));

  console.log(`\n📋 ${boardName} | group: ${groupName} | items: ${dataRows.length}`);

  // Build updates map from updates sheet (keyed by item external ID)
  const updatesMap = {};
  if (wb.SheetNames.includes('updates')) {
    const uws = wb.Sheets['updates'];
    const urows = XLSX.utils.sheet_to_json(uws, { header: 1 });
    // Find header row in updates sheet
    const uHeaderIdx = urows.findIndex((r) => r?.[0] === 'Item ID');
    if (uHeaderIdx !== -1) {
      urows.slice(uHeaderIdx + 1).forEach((r) => {
        if (!r || !r[UPD.ITEM_ID] || !r[UPD.CONTENT]) return;
        const extId = String(r[UPD.ITEM_ID]);
        if (!updatesMap[extId]) updatesMap[extId] = [];
        updatesMap[extId].push({
          content: str(r[UPD.CONTENT]) || '',
          author: str(r[UPD.USER]) || boardName,
          createdAt: str(r[UPD.CREATED_AT]),
        });
      });
    }
  }

  // Delete existing board with same name for this user (re-import)
  await prisma.board.deleteMany({ where: { userId: USER_ID, name: boardName } });

  // Create board
  const board = await prisma.board.create({
    data: { name: boardName, userId: USER_ID, type: 'NORMAL' },
  });

  // Create group
  const group = await prisma.boardGroup.create({
    data: { name: groupName, boardId: board.id, position: 0 },
  });

  // Create items
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const extId = str(r[COL.ITEM_ID]);

    const item = await prisma.boardItem.create({
      data: {
        name: str(r[COL.NAME]) || 'Unnamed',
        priority: str(r[COL.PRIORITY]),
        status: str(r[COL.STATUS]),
        state: str(r[COL.STATE]),
        city: str(r[COL.CITY]),
        location: str(r[COL.LOCATION]),
        propertyType: str(r[COL.PROPERTY_TYPE]),
        googleRating: num(r[COL.GOOGLE_RATING]),
        noOfRatings: num(r[COL.NO_OF_RATINGS]) ? parseInt(num(r[COL.NO_OF_RATINGS])) : null,
        landOwnerContact: str(r[COL.LAND_OWNER_CONTACT]),
        phone: str(r[COL.PHONE]),
        email: str(r[COL.EMAIL]),
        powerAvailability: str(r[COL.POWER_AVAILABILITY]),
        owner: str(r[COL.OWNER]),
        investment: str(r[COL.INVESTMENT]),
        availableParking: str(r[COL.AVAILABLE_PARKING]),
        notes: str(r[COL.NOTES]),
        reminderDate: str(r[COL.REMINDER_DATE]),
        dueDate: str(r[COL.DUE_DATE]),
        position: i,
        groupId: group.id,
      },
    });

    // Attach updates
    if (extId && updatesMap[extId]) {
      for (const upd of updatesMap[extId]) {
        await prisma.itemUpdate.create({
          data: { content: upd.content, author: upd.author, itemId: item.id },
        });
      }
    }
  }

  console.log(`  ✓ Created board "${boardName}" with ${dataRows.length} items`);
}

async function main() {
  const fs = require('fs');
  const files = fs.readdirSync(EXCEL_DIR).filter((f) => f.endsWith('.xlsx'));

  console.log(`Importing ${files.length} Excel files...`);

  for (const file of files) {
    await importFile(path.join(EXCEL_DIR, file));
  }

  console.log('\n✅ All done!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
