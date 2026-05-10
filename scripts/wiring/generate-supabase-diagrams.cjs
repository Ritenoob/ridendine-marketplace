const fs = require('fs');
const path = require('path');

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const architectureDir = path.join(root, 'docs', 'architecture', 'supabase');
const obsidianDir = path.join(root, 'docs', 'obsidian', 'codebase-map');
const graphifyDir = path.join(root, 'graphify-out', 'ridendine-codebase-map');

const appSurfaces = [
  { name: 'Customer Web', key: 'web', root: 'apps/web', role: 'customers' },
  { name: 'Chef Admin', key: 'chef-admin', root: 'apps/chef-admin', role: 'chefs' },
  { name: 'Driver App', key: 'driver-app', root: 'apps/driver-app', role: 'drivers' },
  { name: 'Ops Admin', key: 'ops-admin', root: 'apps/ops-admin', role: 'platform operators' },
  { name: 'Shared Packages', key: 'packages', root: 'packages', role: 'shared backend/domain code' },
];

const groupDefinitions = [
  {
    title: 'Identity and Roles',
    slug: 'identity',
    tables: ['auth.users', 'customers', 'chef_profiles', 'drivers', 'platform_users', 'notifications', 'push_subscriptions'],
  },
  {
    title: 'Chef, Storefront, and Menu',
    slug: 'chef-menu',
    tables: [
      'chef_profiles',
      'chef_kitchens',
      'chef_storefronts',
      'chef_documents',
      'chef_availability',
      'chef_delivery_zones',
      'menu_categories',
      'menu_items',
      'menu_item_options',
      'menu_item_option_values',
      'menu_item_availability',
      'storefront_state_changes',
    ],
  },
  {
    title: 'Customer, Cart, Orders, and Reviews',
    slug: 'customer-orders',
    tables: [
      'customers',
      'customer_addresses',
      'carts',
      'cart_items',
      'favorites',
      'orders',
      'order_items',
      'order_item_modifiers',
      'order_status_history',
      'reviews',
      'checkout_idempotency_keys',
    ],
  },
  {
    title: 'Driver and Delivery',
    slug: 'driver-delivery',
    tables: [
      'drivers',
      'driver_documents',
      'driver_vehicles',
      'driver_shifts',
      'driver_presence',
      'driver_locations',
      'driver_earnings',
      'deliveries',
      'delivery_assignments',
      'assignment_attempts',
      'delivery_events',
      'delivery_tracking_events',
    ],
  },
  {
    title: 'Payments, Ledger, Payouts, and Finance',
    slug: 'finance',
    tables: [
      'orders',
      'ledger_entries',
      'payout_runs',
      'chef_payout_accounts',
      'chef_payouts',
      'driver_payout_accounts',
      'driver_payouts',
      'platform_accounts',
      'stripe_events_processed',
      'stripe_reconciliation',
      'instant_payout_requests',
      'refund_cases',
      'payout_adjustments',
    ],
  },
  {
    title: 'Ops, Engine, Support, and Audit',
    slug: 'ops-engine',
    tables: [
      'domain_events',
      'order_exceptions',
      'sla_timers',
      'kitchen_queue_entries',
      'ops_override_logs',
      'system_alerts',
      'support_tickets',
      'admin_notes',
      'audit_logs',
      'ops_processor_runs',
      'platform_settings',
      'service_areas',
      'analytics_events',
    ],
  },
  {
    title: 'Growth, Promo, Loyalty, and Referral',
    slug: 'growth',
    tables: ['promo_codes', 'loyalty_accounts', 'loyalty_transactions', 'referral_codes', 'referral_signups'],
  },
];

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function write(filePath, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${body.trimEnd()}\n`);
}

function walk(dir, predicate, acc = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
    const child = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(child, predicate, acc);
    else if (!predicate || predicate(child)) acc.push(child);
  }
  return acc.sort();
}

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function normalizeIdent(identifier) {
  return String(identifier || '')
    .trim()
    .replace(/[",;]/g, '')
    .replace(/\s+/g, '')
    .replace(/^public\./i, '')
    .replace(/^only\./i, '');
}

function displayTableName(schema, table) {
  return schema === 'auth' ? `auth.${table}` : table;
}

function entityName(name) {
  return normalizeIdent(name).replace(/\./g, '_').replace(/[^A-Za-z0-9_]/g, '_');
}

function mermaidText(value) {
  return String(value || '')
    .replace(/"/g, "'")
    .replace(/\|/g, '/')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function mermaidType(value) {
  return String(value || 'text')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[\[\],]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'text';
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function table(headers, rows) {
  const header = `| ${headers.map(mdEscape).join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.length ? rows.map((row) => `| ${row.map(mdEscape).join(' | ')} |`).join('\n') : `| ${headers.map(() => 'None').join(' | ')} |`;
  return `${header}\n${sep}\n${body}`;
}

function splitTopLevel(input) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const prev = input[i - 1];
    if (char === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    if (char === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    if (!inSingle && !inDouble) {
      if (char === '(') depth += 1;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char === ',' && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function findMatchingParen(text, openIndex) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    const prev = text[i - 1];
    if (char === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    if (char === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    if (inSingle || inDouble) continue;
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function ensureTable(schema, table, source, schemaMap) {
  const name = displayTableName(schema, table);
  if (!schemaMap.tables.has(name)) {
    schemaMap.tables.set(name, {
      name,
      schema,
      table,
      columns: new Map(),
      fks: [],
      policies: [],
      rls: false,
      indexes: [],
      sources: new Set(),
    });
  }
  if (source) schemaMap.tables.get(name).sources.add(source);
  return schemaMap.tables.get(name);
}

function parseRef(segment) {
  const match = segment.match(/references\s+(?:(auth|public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\)/i);
  if (!match) return null;
  return {
    schema: match[1] || 'public',
    table: match[2],
    column: match[3],
  };
}

function parseColumn(definition, tableInfo, source) {
  const trimmed = definition.replace(/\s+/g, ' ').trim();
  if (!trimmed || /^(constraint|primary|foreign|unique|check|exclude)\b/i.test(trimmed)) return null;
  const match = trimmed.match(/^"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(.+)$/i);
  if (!match) return null;
  const [, name, rest] = match;
  const typeStop = rest.search(/\s+(default|not\s+null|null|primary\s+key|references|unique|check|collate|generated|identity)\b/i);
  const type = (typeStop === -1 ? rest : rest.slice(0, typeStop)).trim();
  const ref = parseRef(rest);
  const column = {
    name,
    type: type || 'text',
    pk: /\bprimary\s+key\b/i.test(rest),
    fk: Boolean(ref),
    required: /\bnot\s+null\b/i.test(rest),
    unique: /\bunique\b/i.test(rest),
    defaulted: /\bdefault\b/i.test(rest),
    source,
    ref,
  };
  tableInfo.columns.set(name, { ...(tableInfo.columns.get(name) || {}), ...column });
  if (ref) {
    tableInfo.fks.push({
      fromTable: tableInfo.name,
      fromColumn: name,
      toTable: displayTableName(ref.schema, ref.table),
      toColumn: ref.column,
      source,
    });
  }
  return column;
}

function parseCreateTables(sql, source, schemaMap) {
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(auth|public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(/gi;
  let match;
  while ((match = re.exec(sql))) {
    const schema = match[1] || 'public';
    const tableName = match[2];
    const openIndex = sql.indexOf('(', match.index);
    const closeIndex = findMatchingParen(sql, openIndex);
    if (closeIndex === -1) continue;
    const tableInfo = ensureTable(schema, tableName, source, schemaMap);
    const block = sql.slice(openIndex + 1, closeIndex);
    for (const part of splitTopLevel(block)) {
      parseColumn(part, tableInfo, source);
      const fkMatch = part.match(/foreign\s+key\s*\(\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\)\s*references\s+(?:(auth|public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\)/i);
      if (fkMatch) {
        tableInfo.fks.push({
          fromTable: tableInfo.name,
          fromColumn: fkMatch[1],
          toTable: displayTableName(fkMatch[2] || 'public', fkMatch[3]),
          toColumn: fkMatch[4],
          source,
        });
        const column = tableInfo.columns.get(fkMatch[1]);
        if (column) column.fk = true;
      }
    }
  }
}

function parseAlterTables(sql, source, schemaMap) {
  const statements = sql.match(/alter\s+table[\s\S]*?;/gi) || [];
  for (const statement of statements) {
    const tableMatch = statement.match(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:(auth|public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/i);
    if (!tableMatch) continue;
    const schema = tableMatch[1] || 'public';
    const tableInfo = ensureTable(schema, tableMatch[2], source, schemaMap);
    if (/enable\s+row\s+level\s+security/i.test(statement)) tableInfo.rls = true;

    const additions = statement.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+([^,;]+)/gi);
    for (const addition of additions) parseColumn(`${addition[1]} ${addition[2]}`, tableInfo, source);

    const drops = statement.matchAll(/drop\s+column\s+(?:if\s+exists\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi);
    for (const drop of drops) tableInfo.columns.delete(drop[1]);

    const renames = statement.matchAll(/rename\s+column\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s+to\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi);
    for (const rename of renames) {
      const existing = tableInfo.columns.get(rename[1]);
      if (!existing) continue;
      tableInfo.columns.delete(rename[1]);
      tableInfo.columns.set(rename[2], { ...existing, name: rename[2] });
    }

    const fkAdditions = statement.matchAll(/foreign\s+key\s*\(\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\)\s*references\s+(?:(auth|public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\)/gi);
    for (const fk of fkAdditions) {
      tableInfo.fks.push({
        fromTable: tableInfo.name,
        fromColumn: fk[1],
        toTable: displayTableName(fk[2] || 'public', fk[3]),
        toColumn: fk[4],
        source,
      });
      const column = tableInfo.columns.get(fk[1]);
      if (column) column.fk = true;
    }
  }
}

function parsePolicies(sql, source, schemaMap) {
  const policies = sql.matchAll(/create\s+policy\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s+on\s+(?:(auth|public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi);
  for (const policy of policies) {
    const tableInfo = ensureTable(policy[3] || 'public', policy[4], source, schemaMap);
    tableInfo.policies.push({ name: policy[1] || policy[2], source });
  }

  const rls = sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:(auth|public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+enable\s+row\s+level\s+security/gi);
  for (const match of rls) ensureTable(match[1] || 'public', match[2], source, schemaMap).rls = true;
}

function parseFunctions(sql, source, schemaMap) {
  const functions = sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:(public|auth)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(/gi);
  for (const fn of functions) {
    const name = displayTableName(fn[1] || 'public', fn[2]);
    if (!schemaMap.functions.has(name)) schemaMap.functions.set(name, { name, source: new Set(), usedBy: new Set() });
    schemaMap.functions.get(name).source.add(source);
  }
}

function parseIndexes(sql, source, schemaMap) {
  const indexes = sql.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?("?[A-Za-z_][A-Za-z0-9_]*"?)\s+on\s+(?:(public)\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi);
  for (const index of indexes) {
    const tableInfo = ensureTable(index[2] || 'public', index[3], source, schemaMap);
    tableInfo.indexes.push(normalizeIdent(index[1]));
  }
}

function parseSchema() {
  const schemaMap = { tables: new Map(), functions: new Map(), migrations: [] };
  if (!fs.existsSync(migrationsDir)) return schemaMap;
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const source = `supabase/migrations/${file}`;
    const raw = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const sql = stripSqlComments(raw);
    schemaMap.migrations.push({ file: source, bytes: raw.length });
    parseCreateTables(sql, source, schemaMap);
    parseAlterTables(sql, source, schemaMap);
    parsePolicies(sql, source, schemaMap);
    parseFunctions(sql, source, schemaMap);
    parseIndexes(sql, source, schemaMap);
  }
  return schemaMap;
}

function usageSurface(file) {
  return appSurfaces.find((surface) => file.startsWith(surface.root)) || null;
}

function inferOperation(textAfter) {
  if (/\.insert\s*\(/.test(textAfter)) return 'insert';
  if (/\.upsert\s*\(/.test(textAfter)) return 'upsert';
  if (/\.update\s*\(/.test(textAfter)) return 'update';
  if (/\.delete\s*\(/.test(textAfter)) return 'delete';
  if (/\.select\s*\(/.test(textAfter)) return 'select';
  return 'touch';
}

function addUsage(map, key, item) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}

function scanAppUsage(schemaMap) {
  const files = [
    ...walk('apps', (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)),
    ...walk('packages', (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)),
  ];
  const tableUsage = new Map();
  const rpcUsage = new Map();
  const storageUsage = new Map();

  for (const file of files) {
    const surface = usageSurface(file);
    if (!surface) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8');

    const fromCalls = text.matchAll(/\.from\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    for (const match of fromCalls) {
      const prefix = text.slice(Math.max(0, match.index - 40), match.index);
      const owner = prefix.match(/([A-Za-z0-9_$.]+)\s*$/)?.[1] || '';
      if (['Array', 'Buffer', 'Object', 'Set', 'String', 'Number'].includes(owner)) continue;
      const key = match[1];
      const item = {
        surface: surface.name,
        file,
        operation: inferOperation(text.slice(match.index, match.index + 240)),
      };
      if (/storage\s*$/i.test(prefix) || /\.storage\s*$/i.test(prefix)) addUsage(storageUsage, key, item);
      else addUsage(tableUsage, key, item);
    }

    const rpcCalls = text.matchAll(/\.rpc\s*\(\s*['"`]([^'"`]+)['"`]/g);
    for (const match of rpcCalls) {
      const name = match[1];
      addUsage(rpcUsage, name, { surface: surface.name, file, operation: 'rpc' });
      const publicName = `public.${name}`;
      if (schemaMap.functions.has(publicName)) schemaMap.functions.get(publicName).usedBy.add(surface.name);
      if (schemaMap.functions.has(name)) schemaMap.functions.get(name).usedBy.add(surface.name);
    }
  }

  return { tableUsage, rpcUsage, storageUsage };
}

function columnRows(tableInfo) {
  return [...tableInfo.columns.values()].map((column) => [
    column.name,
    column.type,
    [
      column.pk ? 'PK' : '',
      column.fk ? 'FK' : '',
      column.required ? 'required' : '',
      column.unique ? 'unique' : '',
      column.defaulted ? 'default' : '',
    ].filter(Boolean).join(', ') || '-',
    column.ref ? `${displayTableName(column.ref.schema, column.ref.table)}.${column.ref.column}` : '-',
  ]);
}

function allRelationships(schemaMap) {
  const seen = new Set();
  const edges = [];
  for (const tableInfo of schemaMap.tables.values()) {
    for (const fk of tableInfo.fks) {
      const key = `${fk.fromTable}.${fk.fromColumn}->${fk.toTable}.${fk.toColumn}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(fk);
    }
  }
  return edges.sort((a, b) => `${a.fromTable}.${a.fromColumn}`.localeCompare(`${b.fromTable}.${b.fromColumn}`));
}

function erDiagramForTables(schemaMap, tableNames, title, includeColumns = true) {
  const selected = new Set(tableNames.filter((name) => schemaMap.tables.has(name)));
  if ([...selected].some((name) => schemaMap.tables.get(name).fks.some((fk) => fk.toTable === 'auth.users'))) selected.add('auth.users');
  const lines = ['```mermaid', 'erDiagram'];
  for (const name of selected) {
    const info = schemaMap.tables.get(name);
    if (!info) continue;
    lines.push(`  ${entityName(name)} {`);
    const columns = includeColumns ? [...info.columns.values()].slice(0, 14) : [];
    if (columns.length) {
      for (const column of columns) {
        const flags = [column.pk ? 'PK' : '', column.fk ? 'FK' : ''].filter(Boolean).join(' ');
        lines.push(`    ${mermaidType(column.type)} ${column.name}${flags ? ` ${flags}` : ''}`);
      }
    } else {
      lines.push('    uuid id PK');
    }
    lines.push('  }');
  }
  for (const fk of allRelationships(schemaMap)) {
    if (!selected.has(fk.fromTable) || !selected.has(fk.toTable)) continue;
    lines.push(`  ${entityName(fk.toTable)} ||--o{ ${entityName(fk.fromTable)} : "${mermaidText(fk.fromColumn)}"`);
  }
  lines.push('```');
  return `### ${title}\n\n${lines.join('\n')}`;
}

function flowDiagram(schemaMap, usage) {
  const lines = [
    '```mermaid',
    'flowchart LR',
    '  Web["Customer Web\\nridendine.ca"]:::app',
    '  Chef["Chef Admin\\nchef.ridendine.ca"]:::chef',
    '  Driver["Driver App\\ndriver.ridendine.ca"]:::driver',
    '  Ops["Ops Admin\\nops.ridendine.ca"]:::ops',
    '  API["Next.js API Routes\\nserver-side Supabase clients"]:::api',
    '  Packages["@ridendine/db + @ridendine/engine\\nrepositories and orchestration"]:::pkg',
    '  Auth["Supabase Auth\\nauth.users"]:::auth',
    '  Public["Supabase public schema\\napplication tables, RLS, RPC"]:::db',
    '  Storage["Supabase Storage\\nchef/customer/driver assets"]:::storage',
    '  Stripe["Stripe\\ncheckout, webhooks, payouts"]:::external',
    '  Web --> API',
    '  Chef --> API',
    '  Driver --> API',
    '  Ops --> API',
    '  API --> Packages',
    '  API --> Auth',
    '  Packages --> Public',
    '  API --> Public',
    '  API --> Storage',
    '  API --> Stripe',
    '  Stripe --> Public',
    '  classDef app fill:#dbeafe,stroke:#2563eb,color:#0f172a',
    '  classDef chef fill:#ffedd5,stroke:#ea580c,color:#0f172a',
    '  classDef driver fill:#dcfce7,stroke:#16a34a,color:#0f172a',
    '  classDef ops fill:#ede9fe,stroke:#7c3aed,color:#0f172a',
    '  classDef api fill:#f1f5f9,stroke:#475569,color:#0f172a',
    '  classDef pkg fill:#fef9c3,stroke:#ca8a04,color:#0f172a',
    '  classDef auth fill:#cffafe,stroke:#0891b2,color:#0f172a',
    '  classDef db fill:#e0f2fe,stroke:#0284c7,color:#0f172a',
    '  classDef storage fill:#ecfccb,stroke:#65a30d,color:#0f172a',
    '  classDef external fill:#fee2e2,stroke:#dc2626,color:#0f172a',
    '```',
  ];
  return lines.join('\n');
}

function appToTableDiagram(usage) {
  const primaryTables = {
    'Customer Web': ['customers', 'customer_addresses', 'carts', 'cart_items', 'favorites', 'orders', 'order_items', 'reviews', 'notifications', 'loyalty_transactions', 'referral_codes'],
    'Chef Admin': ['chef_profiles', 'chef_storefronts', 'chef_kitchens', 'chef_availability', 'menu_categories', 'menu_items', 'orders', 'order_items', 'reviews', 'chef_payout_accounts'],
    'Driver App': ['drivers', 'driver_presence', 'driver_locations', 'deliveries', 'assignment_attempts', 'delivery_tracking_events', 'driver_payout_accounts', 'instant_payout_requests'],
    'Ops Admin': ['platform_users', 'orders', 'deliveries', 'drivers', 'chef_profiles', 'customers', 'ledger_entries', 'payout_runs', 'stripe_reconciliation', 'support_tickets', 'audit_logs'],
    'Shared Packages': ['orders', 'deliveries', 'ledger_entries', 'assignment_attempts', 'order_exceptions', 'system_alerts', 'support_tickets', 'platform_settings'],
  };
  const lines = ['```mermaid', 'flowchart LR'];
  for (const [surface, tables] of Object.entries(primaryTables)) {
    const surfaceId = entityName(surface);
    lines.push(`  ${surfaceId}["${surface}"]:::surface`);
    for (const tableName of tables) {
      const use = usage.tableUsage.get(tableName) || [];
      const surfaceUses = use.filter((item) => item.surface === surface);
      if (!surfaceUses.length && surface !== 'Shared Packages') continue;
      const tableId = entityName(`table_${tableName}`);
      lines.push(`  ${tableId}["${tableName}"]:::table`);
      lines.push(`  ${surfaceId} --> ${tableId}`);
    }
  }
  lines.push('  classDef surface fill:#f8fafc,stroke:#475569,color:#0f172a');
  lines.push('  classDef table fill:#e0f2fe,stroke:#0284c7,color:#0f172a');
  lines.push('```');
  return lines.join('\n');
}

function financeFlowDiagram() {
  return [
    '```mermaid',
    'flowchart LR',
    '  Checkout["Customer checkout"] --> Orders["orders"]',
    '  Orders --> OrderItems["order_items"]',
    '  Orders --> StripeEvents["stripe_events_processed"]',
    '  StripeEvents --> Reconciliation["stripe_reconciliation"]',
    '  Orders --> Ledger["ledger_entries"]',
    '  Ledger --> ChefPayouts["chef_payouts"]',
    '  Ledger --> DriverPayouts["driver_payouts"]',
    '  ChefPayouts --> PayoutRuns["payout_runs"]',
    '  DriverPayouts --> PayoutRuns',
    '  DriverPayouts --> Instant["instant_payout_requests"]',
    '  Refunds["refund_cases"] --> Adjustments["payout_adjustments"]',
    '  Orders --> Refunds',
    '  Adjustments --> Ledger',
    '```',
  ].join('\n');
}

function rlsDiagram() {
  return [
    '```mermaid',
    'flowchart TB',
    '  User["auth.users"] --> Customer["customers profile"]',
    '  User --> Chef["chef_profiles profile"]',
    '  User --> Driver["drivers profile"]',
    '  User --> Platform["platform_users role"]',
    '  Customer --> CustomerData["own addresses, carts, orders, reviews, notifications"]',
    '  Chef --> ChefData["own storefront, kitchen, menu, availability, orders, payouts"]',
    '  Driver --> DriverData["own presence, locations, assignments, deliveries, payouts"]',
    '  Platform --> OpsData["ops-wide orders, dispatch, support, finance, audit"]',
    '  ServiceRole["service role/admin client"] --> SystemData["cross-role processors, webhooks, payouts, health checks"]',
    '```',
  ].join('\n');
}

function usageRows(schemaMap, usage) {
  const rows = [];
  const allTableNames = [...new Set([...schemaMap.tables.keys(), ...usage.tableUsage.keys()])].sort();
  for (const name of allTableNames) {
    const hits = usage.tableUsage.get(name) || [];
    const surfaces = [...new Set(hits.map((hit) => hit.surface))].sort();
    const ops = [...new Set(hits.map((hit) => hit.operation))].sort();
    rows.push([
      schemaMap.tables.has(name) ? 'DEFINED' : 'REFERENCED_ONLY',
      name,
      surfaces.join(', ') || '-',
      ops.join(', ') || '-',
      String(hits.length),
      hits[0]?.file || '-',
    ]);
  }
  return rows;
}

function missingUsageRows(schemaMap, usage) {
  return [...usage.tableUsage.keys()]
    .filter((name) => !schemaMap.tables.has(name))
    .sort()
    .map((name) => {
      const hits = usage.tableUsage.get(name) || [];
      return [name, [...new Set(hits.map((hit) => hit.surface))].join(', '), hits[0]?.file || '-', 'Code references this name but migrations do not create it. Confirm table, view, storage bucket, or typo.'];
    });
}

function rpcRows(schemaMap, usage) {
  const used = new Set(usage.rpcUsage.keys());
  const names = [...new Set([...schemaMap.functions.keys(), ...[...used].map((name) => `public.${name}`)])].sort();
  return names.map((name) => {
    const shortName = name.replace(/^public\./, '');
    const hits = usage.rpcUsage.get(shortName) || usage.rpcUsage.get(name) || [];
    const fn = schemaMap.functions.get(name) || schemaMap.functions.get(shortName);
    return [
      fn ? 'DEFINED' : 'REFERENCED_ONLY',
      name,
      [...new Set(hits.map((hit) => hit.surface))].join(', ') || '-',
      hits[0]?.file || '-',
      fn ? [...fn.source].join(', ') : '-',
    ];
  });
}

function storageRows(usage) {
  return [...usage.storageUsage.keys()].sort().map((bucket) => {
    const hits = usage.storageUsage.get(bucket) || [];
    return [bucket, [...new Set(hits.map((hit) => hit.surface))].join(', '), String(hits.length), hits[0]?.file || '-'];
  });
}

function tableInventory(schemaMap) {
  const sections = [];
  for (const tableInfo of [...schemaMap.tables.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    sections.push(`## ${tableInfo.name}

Source migrations: ${[...tableInfo.sources].join(', ') || '-'}

RLS: ${tableInfo.rls ? 'enabled' : 'not detected'}

Policies detected: ${tableInfo.policies.length}

Indexes detected: ${tableInfo.indexes.length}

${table(['Column', 'Type', 'Flags', 'References'], columnRows(tableInfo))}`);
  }
  return `# Supabase Table Inventory

Generated from \`supabase/migrations/*.sql\`. This is migration-derived, so it is meant to show the intended repo schema, not a live database introspection snapshot.

${sections.join('\n\n')}`;
}

function appUsageDoc(schemaMap, usage) {
  return `# Supabase App Usage Matrix

This matrix maps application code and shared packages to Supabase tables, RPCs, and storage buckets using static scans of \`.from(...)\`, \`.rpc(...)\`, and \`storage.from(...)\`.

## Table Usage

${table(['Schema Status', 'Table/Bucket Name', 'Surfaces', 'Operations', 'Reference Count', 'Example File'], usageRows(schemaMap, usage))}

## Referenced Names Missing From Migrations

${table(['Name', 'Surfaces', 'Example File', 'Review Note'], missingUsageRows(schemaMap, usage))}

## RPC Usage

${table(['Schema Status', 'RPC Function', 'Surfaces', 'Example File', 'Migration Source'], rpcRows(schemaMap, usage))}

## Storage Bucket Usage

${table(['Bucket', 'Surfaces', 'Reference Count', 'Example File'], storageRows(usage))}`;
}

function graphOutput(schemaMap, usage) {
  const nodes = [];
  const edges = [];
  const addNode = (id, label, type) => {
    if (!nodes.some((node) => node.id === id)) nodes.push({ id, label, type });
  };
  const addEdge = (from, to, label, status = 'mapped') => {
    if (!edges.some((edge) => edge.from === from && edge.to === to && edge.label === label)) edges.push({ from, to, label, status });
  };

  for (const surface of appSurfaces) addNode(`app:${surface.key}`, surface.name, 'app');
  for (const tableInfo of schemaMap.tables.values()) addNode(`table:${tableInfo.name}`, tableInfo.name, 'supabase_table');
  for (const fn of schemaMap.functions.values()) addNode(`rpc:${fn.name}`, fn.name, 'supabase_rpc');
  for (const fk of allRelationships(schemaMap)) addEdge(`table:${fk.fromTable}`, `table:${fk.toTable}`, `fk:${fk.fromColumn}`);

  for (const [tableName, hits] of usage.tableUsage.entries()) {
    addNode(`table:${tableName}`, tableName, schemaMap.tables.has(tableName) ? 'supabase_table' : 'missing_table_reference');
    for (const surface of new Set(hits.map((hit) => hit.surface))) {
      const app = appSurfaces.find((item) => item.name === surface);
      if (app) addEdge(`app:${app.key}`, `table:${tableName}`, 'uses table', schemaMap.tables.has(tableName) ? 'mapped' : 'review');
    }
  }

  for (const [rpcName, hits] of usage.rpcUsage.entries()) {
    addNode(`rpc:public.${rpcName}`, `public.${rpcName}`, schemaMap.functions.has(`public.${rpcName}`) ? 'supabase_rpc' : 'missing_rpc_reference');
    for (const surface of new Set(hits.map((hit) => hit.surface))) {
      const app = appSurfaces.find((item) => item.name === surface);
      if (app) addEdge(`app:${app.key}`, `rpc:public.${rpcName}`, 'calls rpc', schemaMap.functions.has(`public.${rpcName}`) ? 'mapped' : 'review');
    }
  }

  return { nodes, edges };
}

function overviewDoc(schemaMap, usage) {
  const tables = [...schemaMap.tables.values()].sort((a, b) => a.name.localeCompare(b.name));
  const relationships = allRelationships(schemaMap);
  const missingRows = missingUsageRows(schemaMap, usage);
  const grouped = groupDefinitions.map((group) => erDiagramForTables(schemaMap, group.tables, group.title)).join('\n\n');
  const allRelationshipRows = relationships.map((fk) => [fk.fromTable, fk.fromColumn, fk.toTable, fk.toColumn, fk.source]);
  const tableSummaryRows = tables.map((item) => [
    item.name,
    String(item.columns.size),
    String(item.fks.length),
    item.rls ? 'yes' : 'not detected',
    String(item.policies.length),
    [...item.sources].slice(0, 2).join(', '),
  ]);

  return `# Supabase SQL Diagram

Generated by \`pnpm docs:supabase\` from Supabase migrations and application Supabase calls.

## Scope

- Migration files scanned: ${schemaMap.migrations.length}
- Tables/views represented from SQL table definitions and ALTER statements: ${tables.length}
- Foreign-key relationships detected: ${relationships.length}
- SQL/RPC functions detected: ${schemaMap.functions.size}
- RLS policy declarations detected: ${tables.reduce((sum, item) => sum + item.policies.length, 0)}
- Application table references detected: ${[...usage.tableUsage.values()].reduce((sum, hits) => sum + hits.length, 0)}
- Application RPC references detected: ${[...usage.rpcUsage.values()].reduce((sum, hits) => sum + hits.length, 0)}

## Supabase System Diagram

${flowDiagram(schemaMap, usage)}

## App To Supabase Wiring

${appToTableDiagram(usage)}

## RLS And Role Model

${rlsDiagram()}

## Finance And Payment SQL Flow

${financeFlowDiagram()}

## Entity Relationship Diagrams

${grouped}

## Table Summary

${table(['Table', 'Columns', 'FKs', 'RLS', 'Policies', 'Primary Sources'], tableSummaryRows)}

## Relationship Index

${table(['From Table', 'From Column', 'To Table', 'To Column', 'Migration Source'], allRelationshipRows)}

## RPC/Function Map

${table(['Schema Status', 'RPC Function', 'Surfaces', 'Example File', 'Migration Source'], rpcRows(schemaMap, usage))}

## Code References Missing From SQL Migrations

${missingRows.length ? table(['Name', 'Surfaces', 'Example File', 'Review Note'], missingRows) : 'No missing table/RPC references detected by the static scan.'}

## Related Files

- [Supabase table inventory](./SUPABASE_TABLE_INVENTORY.md)
- [Supabase app usage matrix](./SUPABASE_APP_USAGE_MATRIX.md)
- [Supabase graph JSON](../../../graphify-out/ridendine-codebase-map/supabase-graph.json)

## Notes

- This is a repo-derived SQL diagram, not a live Supabase introspection dump.
- RLS is marked as detected when migrations contain \`ENABLE ROW LEVEL SECURITY\` for a table.
- Dynamic table names are intentionally not guessed.
- Supabase Storage buckets are listed in the usage matrix because they are code-level Supabase resources rather than SQL tables.`;
}

function obsidianDoc(schemaMap, usage) {
  return `# Supabase SQL Diagram

Source of truth: [[Every Page Document]], Supabase migrations, and app/package Supabase calls.

## System

${flowDiagram(schemaMap, usage)}

## App Wiring

${appToTableDiagram(usage)}

## ERD Groups

${groupDefinitions.map((group) => erDiagramForTables(schemaMap, group.tables, group.title)).join('\n\n')}

## Review Gaps

${table(['Name', 'Surfaces', 'Example File', 'Review Note'], missingUsageRows(schemaMap, usage))}

## Linked Repo Docs

- \`docs/architecture/supabase/SUPABASE_SQL_DIAGRAM.md\`
- \`docs/architecture/supabase/SUPABASE_TABLE_INVENTORY.md\`
- \`docs/architecture/supabase/SUPABASE_APP_USAGE_MATRIX.md\`
- \`graphify-out/ridendine-codebase-map/supabase-graph.json\``;
}

function updateObsidianIndex() {
  const indexPath = path.join(obsidianDir, '00 Index.md');
  if (!fs.existsSync(indexPath)) return;
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('[[Supabase SQL Diagram]]')) return;
  write(indexPath, `${current.trimEnd()}

## Supabase

- [[Supabase SQL Diagram]]`);
}

function main() {
  const schemaMap = parseSchema();
  const usage = scanAppUsage(schemaMap);
  const graph = graphOutput(schemaMap, usage);

  write(path.join(architectureDir, 'SUPABASE_SQL_DIAGRAM.md'), overviewDoc(schemaMap, usage));
  write(path.join(architectureDir, 'SUPABASE_TABLE_INVENTORY.md'), tableInventory(schemaMap));
  write(path.join(architectureDir, 'SUPABASE_APP_USAGE_MATRIX.md'), appUsageDoc(schemaMap, usage));
  write(path.join(architectureDir, 'README.md'), `# Supabase Architecture

Generated Supabase SQL diagrams and inventories for the RideNDine monorepo.

- [Supabase SQL Diagram](./SUPABASE_SQL_DIAGRAM.md)
- [Supabase Table Inventory](./SUPABASE_TABLE_INVENTORY.md)
- [Supabase App Usage Matrix](./SUPABASE_APP_USAGE_MATRIX.md)

Refresh with:

\`\`\`powershell
pnpm docs:supabase
\`\`\``);

  write(path.join(obsidianDir, 'Supabase SQL Diagram.md'), obsidianDoc(schemaMap, usage));
  updateObsidianIndex();

  fs.mkdirSync(graphifyDir, { recursive: true });
  write(path.join(graphifyDir, 'supabase-graph.json'), JSON.stringify(graph, null, 2));
  write(path.join(graphifyDir, 'supabase-nodes.csv'), toCsv(['id', 'label', 'type'], graph.nodes.map((node) => [node.id, node.label, node.type])));
  write(path.join(graphifyDir, 'supabase-edges.csv'), toCsv(['from', 'to', 'label', 'status'], graph.edges.map((edge) => [edge.from, edge.to, edge.label, edge.status])));

  console.log(`Generated Supabase docs: ${schemaMap.tables.size} tables, ${allRelationships(schemaMap).length} relationships, ${schemaMap.functions.size} functions, ${graph.nodes.length} graph nodes.`);
}

function toCsv(headers, rows) {
  const encode = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.map(encode).join(','), ...rows.map((row) => row.map(encode).join(','))].join('\n');
}

main();
