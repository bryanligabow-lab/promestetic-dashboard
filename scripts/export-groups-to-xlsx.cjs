/**
 * Genera Excel UNIFICADO con TODOS los contactos de WhatsApp.
 *
 * Hoja 1 "Todos los contactos" — UNIFICADA, una fila por persona.
 *   Nombre | Número | País | Tipo | # Grupos | Grupos
 *   Tipo: "En grupo(s)" si está en ≥1 grupo, "Chat privado" si no.
 *
 * Hoja 2 "Contactos por grupo" — detalle (una persona aparece en cada grupo).
 *   Nombre | Número | País | Grupo | Admin
 *
 * Hoja 3 "Resumen grupos"
 *   Grupo | # Participantes
 *
 * Reglas:
 *  - Sin nombre → celda vacía.
 *  - Número formateado "+593 968 429 494".
 *  - Filtros automáticos + fila congelada en cada hoja.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const groups = JSON.parse(fs.readFileSync('/tmp/groups_full.json'));
const contacts = JSON.parse(fs.readFileSync('/tmp/contacts.json'));

// ---------- helpers ----------
const COUNTRY_PREFIXES = [
  ['593', 'Ecuador'], ['57', 'Colombia'], ['58', 'Venezuela'], ['51', 'Perú'],
  ['56', 'Chile'], ['54', 'Argentina'], ['52', 'México'],
  ['507', 'Panamá'], ['506', 'Costa Rica'], ['502', 'Guatemala'],
  ['503', 'El Salvador'], ['504', 'Honduras'], ['505', 'Nicaragua'],
  ['591', 'Bolivia'], ['595', 'Paraguay'], ['598', 'Uruguay'],
  ['1', 'EE.UU./Canadá'], ['34', 'España'], ['55', 'Brasil'],
  ['44', 'Reino Unido'], ['33', 'Francia'], ['39', 'Italia'], ['49', 'Alemania'],
];

function detectCountry(phone) {
  for (const [pre, name] of COUNTRY_PREFIXES) {
    if (phone.startsWith(pre)) return { prefix: pre, name };
  }
  return { prefix: '', name: '' };
}

function formatPhone(phone) {
  const { prefix } = detectCountry(phone);
  if (!prefix) return '+' + phone;
  const rest = phone.slice(prefix.length);
  const grp = rest.match(/.{1,3}/g) || [rest];
  return `+${prefix} ${grp.join(' ')}`;
}

function cleanName(raw) {
  const n = (raw || '').trim();
  if (!n) return '';
  if (/^\+?\d[\d\s\-()]*$/.test(n)) return ''; // descartar nombres que son solo numero
  return n;
}

// ---------- 1. Mapa número -> nombre (desde tabla Contacts) ----------
const nameByPhone = {};
for (const c of contacts) {
  const rj = c.remoteJid || '';
  // Solo chats individuales (terminan en @s.whatsapp.net), no grupos ni broadcasts
  if (!rj.endsWith('@s.whatsapp.net')) continue;
  const name = cleanName(c.pushName || c.name);
  if (!name) continue;
  const num = rj.split('@')[0].replace(/\D/g, '');
  if (num && num.length >= 8 && !nameByPhone[num]) nameByPhone[num] = name;
}

// ---------- 2. Set base de TODOS los teléfonos conocidos (desde contacts) ----------
const allPhones = new Set();
for (const c of contacts) {
  const rj = c.remoteJid || '';
  if (!rj.endsWith('@s.whatsapp.net')) continue;
  const num = rj.split('@')[0].replace(/\D/g, '');
  if (num && num.length >= 8 && !num.startsWith('0')) allPhones.add(num);
}

// ---------- 3. Procesar grupos: número -> Set de grupos ----------
const groupsByPhone = {}; // phone -> Set<groupName>
const rowsByGroup = [];   // para hoja 2
const groupSummary = [];

function phoneFromParticipant(p) {
  // Preferir phoneNumber (es el número real). Si solo viene `id` y termina en
  // @s.whatsapp.net, también vale. Los `@lid` sin phoneNumber se descartan.
  const src = p.phoneNumber || (p.id && p.id.endsWith('@s.whatsapp.net') ? p.id : '');
  if (!src) return null;
  const num = src.split('@')[0].replace(/\D/g, '');
  if (num.length < 8) return null;
  return num;
}

for (const g of groups) {
  const groupName = (g.subject || g.name || '').trim() || '(sin nombre)';
  let validCount = 0;
  for (const p of g.participants || []) {
    const phone = phoneFromParticipant(p);
    if (!phone) continue;
    validCount++;
    allPhones.add(phone);
    if (!groupsByPhone[phone]) groupsByPhone[phone] = new Set();
    groupsByPhone[phone].add(groupName);

    rowsByGroup.push({
      'Nombre': nameByPhone[phone] || '',
      'Número': formatPhone(phone),
      'País': detectCountry(phone).name,
      'Grupo': groupName,
      'Admin': p.admin === 'admin' || p.admin === 'superadmin' ? 'Sí' : '',
    });
  }
  groupSummary.push({ 'Grupo': groupName, '# Participantes': validCount });
}

// ---------- 4. Hoja unificada: TODOS los contactos ----------
const rowsAll = Array.from(allPhones).map((phone) => {
  const groupsSet = groupsByPhone[phone];
  const groupCount = groupsSet ? groupsSet.size : 0;
  return {
    'Nombre': nameByPhone[phone] || '',
    'Número': formatPhone(phone),
    'País': detectCountry(phone).name,
    'Tipo': groupCount > 0 ? 'En grupo(s)' : 'Chat privado',
    '# Grupos': groupCount,
    'Grupos': groupsSet ? Array.from(groupsSet).sort((a, b) => a.localeCompare(b, 'es')).join(' | ') : '',
  };
});

// Ordenar: con nombre primero, luego más grupos, luego nombre alfabético
rowsAll.sort((a, b) => {
  const aHas = a['Nombre'] ? 1 : 0;
  const bHas = b['Nombre'] ? 1 : 0;
  if (aHas !== bHas) return bHas - aHas;
  if (b['# Grupos'] !== a['# Grupos']) return b['# Grupos'] - a['# Grupos'];
  if (a['Nombre'] && b['Nombre']) return a['Nombre'].localeCompare(b['Nombre'], 'es');
  return a['Número'].localeCompare(b['Número']);
});

// Hoja 2 orden
rowsByGroup.sort((a, b) => {
  if (a['Grupo'] !== b['Grupo']) return a['Grupo'].localeCompare(b['Grupo'], 'es');
  if (!a['Nombre'] && b['Nombre']) return 1;
  if (a['Nombre'] && !b['Nombre']) return -1;
  if (a['Nombre'] !== b['Nombre']) return a['Nombre'].localeCompare(b['Nombre'], 'es');
  return a['Número'].localeCompare(b['Número']);
});

// Hoja 3 orden
groupSummary.sort((a, b) => b['# Participantes'] - a['# Participantes']);

// ---------- 5. Construir workbook ----------
const wb = XLSX.utils.book_new();

function addSheet(name, rows, colWidths) {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = colWidths;
  // Forzar "Número" como texto
  const headers = Object.keys(rows[0]);
  const numIdx = headers.indexOf('Número');
  if (numIdx >= 0) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 1; R <= range.e.r; R++) {
      const addr = XLSX.utils.encode_cell({ c: numIdx, r: R });
      if (ws[addr]) ws[addr].t = 's';
    }
  }
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!autofilter'] = { ref: ws['!ref'] };
  XLSX.utils.book_append_sheet(wb, ws, name);
}

addSheet('Todos los contactos', rowsAll, [
  { wch: 30 }, // Nombre
  { wch: 22 }, // Número
  { wch: 14 }, // País
  { wch: 14 }, // Tipo
  { wch: 10 }, // # Grupos
  { wch: 80 }, // Grupos
]);

addSheet('Contactos por grupo', rowsByGroup, [
  { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 40 }, { wch: 8 },
]);

addSheet('Resumen grupos', groupSummary, [{ wch: 50 }, { wch: 16 }]);

const outPath = path.join(process.cwd(), 'promestetic-grupos.xlsx');
XLSX.writeFile(wb, outPath);

// Stats
const withName = rowsAll.filter((r) => r['Nombre']).length;
const inGroups = rowsAll.filter((r) => r['# Grupos'] > 0).length;
const privateOnly = rowsAll.length - inGroups;

console.log(`✅ ${outPath}`);
console.log(`   👥 ${rowsAll.length} contactos UNIFICADOS`);
console.log(`      → ${withName} con nombre`);
console.log(`      → ${rowsAll.length - withName} sin nombre (celda vacía)`);
console.log(`      → ${inGroups} en al menos 1 grupo`);
console.log(`      → ${privateOnly} solo chat privado (no en grupos)`);
console.log(`   📋 ${rowsByGroup.length} filas detalle por grupo`);
console.log(`   👥 ${groupSummary.length} grupos`);
console.log(`   💾 ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
