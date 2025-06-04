// File: scripts/fetch-airtable.mjs

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
	console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env');
	process.exit(1);
}

const PROJECT_ROOT = path.resolve();
const CONFIG_PATH = path.join(PROJECT_ROOT, 'site-config.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'src', '_data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'sites.json');

// Table IDs
const SITES_TABLE_ID = 'tblrQMtp54PlE21XX'; // SITES
const AUDITS_TABLE_ID = 'tbl1eXMuVSBhLMD9z'; // AUDITS

// Field IDs used to join
const SITE_ECOINDEX_FLD = 'fldYbJEGdk7JwVzXF'; // in SITES: "Ecoindex"
const AUDIT_SITE_FLD = 'fld7eyVpaA0NWYFze'; // in AUDITS: "Site concerné"

/**
 * Fetch all pages from an Airtable table via REST, optionally filtering,
 * returning records as JSON (fields keyed by display name).
 */
async function fetchAll(tableId, filterFormula = null) {
	const all = [];
	let offset = null;

	do {
		const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`);
		url.searchParams.set('pageSize', '100');
		if (filterFormula) url.searchParams.set('filterByFormula', filterFormula);
		if (offset) url.searchParams.set('offset', offset);

		const res = await fetch(url.toString(), {
			headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
		});
		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Airtable error ${res.status}: ${body}`);
		}
		const json = await res.json();
		all.push(...json.records);
		offset = json.offset || null;
	} while (offset);

	return all;
}

async function main() {
	console.log('\n▶︎ Reading site-config.json…');
	let includeSites;
	try {
		const raw = await fs.readFile(CONFIG_PATH, 'utf8');
		const cfg = JSON.parse(raw);
		includeSites = cfg.includeSites;
	} catch (err) {
		console.error(`❌ Could not load/parse ${CONFIG_PATH}:`, err);
		process.exit(1);
	}

	if (!Array.isArray(includeSites) || includeSites.length === 0) {
		console.error('❌ "includeSites" must be a non-empty array in site-config.json');
		process.exit(1);
	}
	console.log('   • includeSites =', includeSites);

	// Build filter formula to fetch exactly those SITE records by ID
	const siteFormula =
		includeSites.length === 1
			? `RECORD_ID()='${includeSites[0]}'`
			: `OR(${includeSites.map((id) => `RECORD_ID()='${id}'`).join(',')})`;

	// 1️⃣ Fetch the two SITE records (all fields)
	console.log('\n▶︎ Fetching SITE records (all fields) via REST…');
	const siteRecs = await fetchAll(SITES_TABLE_ID, siteFormula);
	console.log(`   • Retrieved ${siteRecs.length} SITE record(s).`);
	siteRecs.forEach((rec) => {
		const ecoArr = rec.fields['Ecoindex'] || [];
		console.log(`     – ${rec.id} → Ecoindex IDs = [ ${ecoArr.join(', ')} ]`);
	});

	// 2️⃣ Fetch all AUDIT records (all fields)
	console.log('\n▶︎ Fetching all AUDIT records (all fields) via REST…');
	const auditRecs = await fetchAll(AUDITS_TABLE_ID);
	console.log(`   • Retrieved ${auditRecs.length} AUDIT record(s).`);

	// 3️⃣ Build a map: siteId → [ array of full audit objects ]
	console.log('\n▶︎ Linking AUDITS to SITES by record ID…');
	const siteToAudits = new Map();
	// initialize map for each site
	siteRecs.forEach((siteRec) => siteToAudits.set(siteRec.id, []));
	// iterate through audits, read their "Site concerné" array
	for (const audit of auditRecs) {
		const linkedSites = audit.fields['Site concerné'] || [];
		linkedSites.forEach((siteId) => {
			if (siteToAudits.has(siteId)) {
				siteToAudits.get(siteId).push(audit);
			}
		});
	}
	siteToAudits.forEach((audits, siteId) => {
		console.log(`   • Site ${siteId} has ${audits.length} audit(s): [ ${audits.map((a) => a.id).join(', ')} ]`);
	});

	// 4️⃣ Assemble final JSON: for each site, include its fields + array of audit fields
	console.log('\n▶︎ Building output JSON…');
	const output = siteRecs.map((siteRec) => {
		const audits = siteToAudits.get(siteRec.id) || [];
		return {
			site: {
				id: siteRec.id,
				fields: siteRec.fields
			},
			audits: audits.map((audit) => ({
				id: audit.id,
				fields: audit.fields
			}))
		};
	});

	// 5️⃣ Write to src/_data/sites.json
	console.log(`\n▶︎ Writing output to ${OUTPUT_FILE}`);
	await fs.mkdir(OUTPUT_DIR, { recursive: true });
	await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
	console.log('✅ Successfully wrote sites + audits to sites.json\n');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
