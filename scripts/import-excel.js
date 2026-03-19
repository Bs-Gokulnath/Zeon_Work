/**
 * Import script: Reads ALL Excel files from Sample_Excel_From_Monday/ and seeds the database.
 * Usage: node scripts/import-excel.js [board-name]
 *
 * If board-name is provided, only that file/board is imported.
 * If not provided, all Excel files are imported (creating boards as needed).
 */

const fs   = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();
const EXCEL_DIR = path.join(__dirname, '../Sample_Excel_From_Monday');

// ── Excel parsing ──────────────────────────────────────────────────────────────
function parseExcel(filePath) {
  const wb  = xlsx.readFile(filePath);
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Row 4 is the column header row
  const headers = raw[4];
  const groups  = {};
  let currentGroup = 'To-Do';

  for (let i = 5; i < raw.length; i++) {
    const row = raw[i];
    if (row.every(c => c === '')) continue;

    // Row with only col 0 = group header
    if (row[0] && row.slice(1).every(c => c === '')) {
      currentGroup = String(row[0]).trim();
      continue;
    }
    if (!row[0]) continue;

    const obj = { _group: currentGroup };
    headers.forEach((h, idx) => { obj[h] = row[idx] !== '' ? row[idx] : null; });
    if (!groups[currentGroup]) groups[currentGroup] = [];
    groups[currentGroup].push(obj);
  }

  return groups;
}

// ── Parse updates sheet (second sheet) ────────────────────────────────────────
// Returns array of { itemName, author, content, createdAt }
function parseUpdates(filePath) {
  const wb = xlsx.readFile(filePath);
  if (wb.SheetNames.length < 2) return [];

  const ws  = wb.Sheets[wb.SheetNames[1]];
  const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Find header row (contains 'Item Name')
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    if (raw[i].includes('Item Name')) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return [];

  const headers = raw[headerIdx];
  const idxItemName    = headers.indexOf('Item Name');
  const idxUser        = headers.indexOf('User');
  const idxCreatedAt   = headers.indexOf('Created At');
  const idxContent     = headers.indexOf('Update Content');
  const idxContentType = headers.indexOf('Content Type');

  const updates = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row[idxItemName] || !row[idxContent]) continue;
    // Skip replies (Parent Post ID present) — only top-level updates
    const contentType = String(row[idxContentType] || '').trim();
    if (contentType.toLowerCase() === 'reply') continue;

    const dateStr = String(row[idxCreatedAt] || '').trim();
    let createdAt;
    try {
      // Format: "08/September/2025  06:24:25 AM"
      createdAt = new Date(dateStr.replace(/\//g, ' ')) || new Date();
      if (isNaN(createdAt.getTime())) createdAt = new Date();
    } catch { createdAt = new Date(); }

    updates.push({
      itemName:  String(row[idxItemName]).trim(),
      author:    String(row[idxUser] || 'User').trim(),
      content:   String(row[idxContent]).trim(),
      createdAt,
    });
  }
  return updates;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function cleanStr(v) {
  if (v == null) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

function parseOwner(row, boardName) {
  // Owner column: "Haridas", "Shanmuga priyan S", etc.
  const direct = cleanStr(row['Owner']);
  if (direct) {
    const words = direct.split(/\s+/);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : words[0].substring(0, 2).toUpperCase();
  }
  // Fall back to Creation log column
  const cl = cleanStr(row['Creation log']);
  if (cl) {
    const words = cl.split(/\s+/);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : words[0].substring(0, 2).toUpperCase();
  }
  // Fall back to board name initials
  return boardName.substring(0, 2).toUpperCase();
}

function mapItem(row, groupId, position, boardName) {
  return {
    name:             cleanStr(row['Name']),
    priority:         cleanStr(row['Priority']),
    state:            cleanStr(row['State']),
    city:             cleanStr(row['City']),
    location:         cleanStr(row['Location']),
    propertyType:     cleanStr(row['Property Type']),
    googleRating:     row['Google Rating'] != null && row['Google Rating'] !== '' ? parseFloat(row['Google Rating']) : null,
    noOfRatings:      row['No of Ratings'] != null && row['No of Ratings'] !== '' ? parseInt(row['No of Ratings']) : null,
    landOwnerContact: cleanStr(row['Land Owner Contact']),
    phone:            row['Phone'] != null && row['Phone'] !== '' ? String(row['Phone']).trim() : '',
    email:            cleanStr(row['Email']),
    powerAvailability: cleanStr(row['Power Availability']),
    owner:            parseOwner(row, boardName),
    status:           cleanStr(row['Status']),
    investment:       cleanStr(row['Investment']),
    availableParking: cleanStr(row['Available Parking Bays']),
    notes:            cleanStr(row['Notes']),
    reminderDate:     cleanStr(row['Reminder Date']),
    dueDate:          cleanStr(row['Due date']),
    position,
    groupId,
  };
}

const GROUP_COLORS = {
  'To-Do':       '#0073EA',
  'Completed':   '#00C875',
  'In Progress': '#FDAB3D',
  'Stuck':       '#E2445C',
};
function groupColor(name, idx) {
  return GROUP_COLORS[name] || ['#0085FF','#A25DDC','#037F4C','#FF7575','#0086C0'][idx % 5];
}

// ── Extract board name from filename ──────────────────────────────────────────
// e.g. "Shanmuga_Priyan_To_Do_1773912662.xlsx" → "Shanmuga Priyan"
function boardNameFromFile(filename) {
  const base = path.basename(filename, '.xlsx');
  const parts = base.split('_To_Do_')[0];
  return parts.replace(/_/g, ' ');
}

// ── Import one Excel file into one board ──────────────────────────────────────
async function importFile(filePath, userId) {
  const boardName = boardNameFromFile(filePath);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📂  Processing: ${path.basename(filePath)}`);
  console.log(`📋  Board name: "${boardName}"`);

  // Upsert board
  let board = await prisma.board.findFirst({
    where: { userId, name: { equals: boardName, mode: 'insensitive' } },
  });
  if (!board) {
    board = await prisma.board.create({
      data: { name: boardName, type: 'NORMAL', userId },
    });
    console.log(`✅  Created new board (id: ${board.id})`);
  } else {
    console.log(`✅  Using existing board (id: ${board.id})`);
  }

  // Parse Excel
  const groups = parseExcel(filePath);
  const groupNames = Object.keys(groups);
  const totalItems = groupNames.reduce((s, g) => s + groups[g].length, 0);
  console.log(`📊  Groups: ${groupNames.join(', ') || '(none — all in To-Do)'}`);
  console.log(`📊  Items:  ${totalItems}`);

  // Clear existing data
  const deleted = await prisma.boardGroup.deleteMany({ where: { boardId: board.id } });
  if (deleted.count > 0) console.log(`🗑   Cleared ${deleted.count} existing group(s)`);

  // Insert groups + items, build name→id map for updates
  const itemNameToId = {};
  let groupIdx = 0;
  for (const gName of groupNames) {
    const rows = groups[gName];
    const grp  = await prisma.boardGroup.create({
      data: { name: gName, color: groupColor(gName, groupIdx), position: groupIdx, boardId: board.id },
    });

    const itemData = rows
      .filter(r => cleanStr(r['Name']))
      .map((r, i) => mapItem(r, grp.id, i, boardName));

    for (const item of itemData) {
      const created = await prisma.boardItem.create({ data: item });
      itemNameToId[item.name.toLowerCase()] = created.id;
    }
    console.log(`   📁 "${gName}" → ${itemData.length} items`);
    groupIdx++;
  }

  // Add "Completed" group if not already present
  if (!groups['Completed']) {
    await prisma.boardGroup.create({
      data: { name: 'Completed', color: '#00C875', position: groupIdx, boardId: board.id },
    });
    console.log(`   📁 "Completed" → 0 items (empty group added)`);
  }

  // Import updates from second sheet
  const updates = parseUpdates(filePath);
  let updatesImported = 0;
  for (const u of updates) {
    const itemId = itemNameToId[u.itemName.toLowerCase()];
    if (!itemId) continue;
    await prisma.itemUpdate.create({
      data: { content: u.content, author: u.author, itemId, createdAt: u.createdAt },
    });
    updatesImported++;
  }
  if (updates.length > 0) {
    console.log(`   💬 Updates: ${updatesImported} imported (${updates.length - updatesImported} unmatched)`);
  }

  console.log(`✔   Done: "${boardName}"`);
  return { boardName, totalItems };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const filterArg = process.argv[2]; // optional: filter by board name

  // Get the first user (single-tenant for now)
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('\n❌  No users found. Please sign up in the web UI first.\n');
    process.exit(1);
  }
  console.log(`\n👤  User: ${user.email}`);

  // Find all Excel files
  const allFiles = fs.readdirSync(EXCEL_DIR)
    .filter(f => f.endsWith('.xlsx'))
    .map(f => path.join(EXCEL_DIR, f));

  // Filter if argument given
  const files = filterArg
    ? allFiles.filter(f => boardNameFromFile(f).toLowerCase().includes(filterArg.toLowerCase()))
    : allFiles;

  if (files.length === 0) {
    console.error(`\n❌  No Excel files found matching "${filterArg}"\n`);
    process.exit(1);
  }

  console.log(`\n📁  Found ${files.length} file(s) to import:`);
  files.forEach(f => console.log(`    • ${path.basename(f)}`));

  const results = [];
  for (const filePath of files) {
    const result = await importFile(filePath, user.id);
    results.push(result);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('🎉  All imports complete!\n');
  console.log('Board'.padEnd(25), 'Items');
  console.log('─'.repeat(35));
  for (const r of results) {
    console.log(r.boardName.padEnd(25), r.totalItems);
  }
  console.log(`\nRefresh your browser to see the data.\n`);
}

main().catch(err => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());
