// File: scripts/fetch-airtable.mjs

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';



// ————————————————————————————————————————————————————————————————
// 1) ENV & PATHS
// ————————————————————————————————————————————————————————————————

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
	console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env');
	process.exit(1);
}

import Airtable from 'airtable';
var base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

const PROJECT_ROOT = path.resolve();
const CONFIG_PATH = path.join(PROJECT_ROOT, 'site-config.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'src', '_data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'sites.json');

// ————————————————————————————————————————————————————————————————
// 2) TABLE & FIELD IDS (these come from your schema export)
// ————————————————————————————————————————————————————————————————

const SITES_TABLE_ID = 'tblrQMtp54PlE21XX';
const AUDITS_TABLE_ID = 'tbl1eXMuVSBhLMD9z';

// In SITES: the linked‐record field “Ecoindex” (links to AUDITS)
const SITE_ECOINDEX_FIELD_ID = 'fldYbJEGdk7JwVzXF';

// In AUDITS: the linked‐record field “Site concerné” (links to SITES)
const AUDIT_SITE_FIELD_ID = 'fld7eyVpaA0NWYFze';

// In AUDITS: the “Date” field (ISO date string)
const AUDIT_DATE_FIELD_ID = 'fldnDdVmUgQKdl0x8';

// ————————————————————————————————————————————————————————————————
// 3) HELPERS: fetch via REST with fieldsByFieldId=true
// ————————————————————————————————————————————————————————————————

async function fetchAllRecords(tableId) {
	console.log(`🔄 Fetching all records from ${tableId} (Airtable.js)…`);
	const all = [];

	base(tableId).select({
		view: "ALL"
	}).eachPage(function page(records, fetchNextPage) {
		// This function (`page`) will get called for each page of records.

		records.forEach(function (record) {
			console.log('Retrieved', record.get('fldyOSUh07mWrSgpM'));
		});

		// To fetch the next page of records, call `fetchNextPage`.
		// If there are more records, `page` will get called again.
		// If there are no more records, `done` will get called.
		fetchNextPage();

	}, function done(err) {
		if (err) { console.error(err); return; }
	});

	console.log(`✅ Retrieved ${all.length} records from ${tableId}`);
	return all;
}

// ————————————————————————————————————————————————————————————————
// 4) MAIN
// ————————————————————————————————————————————————————————————————

async function main() {
	console.log('🚀 Starting fetch-airtable script');

	// 4.1) Read includeSites from site-config.json
	console.log('\n1️⃣  Reading site-config.json…');
	let config;
	try {
		config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
	} catch (err) {
		console.error(`❌ Failed to read/parse ${CONFIG_PATH}:`, err);
		process.exit(1);
	}
	const includeSiteIds = Array.isArray(config.includeSites)
		? config.includeSites
		: [];
	if (!includeSiteIds.length) {
		console.error('❌ "includeSites" array is empty in site-config.json');
		process.exit(1);
	}
	console.log(`   • Will include these SITE IDs: ${includeSiteIds.join(', ')}`);

	// 4.2) Fetch all SITES via REST (fields keyed by ID)
	console.log('\n2️⃣  Fetching all SITES via Airtable.js…');
	let siteRecs;
	try {
		siteRecs = await fetchAllRecords(SITES_TABLE_ID);
	} catch (err) {
		console.error('❌ Error fetching SITES:', err);
		process.exit(1);
	}

	// // 4.3) Filter SITES to include only those in includeSites
	// console.log('\n3️⃣  Filtering SITES by includeSites list:');
	// const filteredSites = siteRecs.filter((rec) => {
	// 	const keep = includeSiteIds.includes(rec.id);
	// 	console.log(`   • Site ${rec.id}: ${keep ? 'KEEP' : 'SKIP'}`);
	// 	return keep;
	// });
	// console.log(`✅ ${filteredSites.length} site(s) remain.`);

	// // 4.4) Fetch all AUDITS via REST (fields keyed by ID)
	// console.log('\n4️⃣  Fetching all AUDITS via REST…');
	// let auditRecs;
	// try {
	// 	auditRecs = await fetchAllRecords(AUDITS_TABLE_ID);
	// } catch (err) {
	// 	console.error('❌ Error fetching AUDITS:', err);
	// 	process.exit(1);
	// }

	// // 4.5) Link AUDITS to filtered SITES by record ID
	// console.log('\n5️⃣  Building site → audits map:');
	// const siteToAuditsMap = new Map();
	// filteredSites.forEach((s) => siteToAuditsMap.set(s.id, []));

	// for (const aRec of auditRecs) {
	// 	const linkedSiteIds = aRec.fields[AUDIT_SITE_FIELD_ID] || [];
	// 	if (!Array.isArray(linkedSiteIds) || !linkedSiteIds.length) {
	// 		console.warn(`   ⚠️  Audit ${aRec.id} has no linked sites.`);
	// 		continue;
	// 	}
	// 	linkedSiteIds.forEach((siteId) => {
	// 		if (!siteToAuditsMap.has(siteId)) {
	// 			console.log(
	// 				`   • Audit ${aRec.id} links to ${siteId}, not in includeSites; ignoring.`
	// 			);
	// 		} else {
	// 			siteToAuditsMap.get(siteId).push(aRec);
	// 		}
	// 	});
	// }
	// console.log('✅ site → audits map built.');

	// // 4.6) Pick latest audit per site
	// console.log('\n6️⃣  Determining latest audit per site:');
	// const siteToLatest = new Map();
	// for (const siteRec of filteredSites) {
	// 	const arr = siteToAuditsMap.get(siteRec.id) || [];
	// 	if (!arr.length) {
	// 		console.log(`   • Site ${siteRec.id} has no audits.`);
	// 		siteToLatest.set(siteRec.id, null);
	// 		continue;
	// 	}
	// 	let latest = null;
	// 	let latestDate = '';
	// 	arr.forEach((aRec) => {
	// 		const d = aRec.fields[AUDIT_DATE_FIELD_ID];
	// 		if (!d) {
	// 			console.warn(`   ⚠️  Audit ${aRec.id} for site ${siteRec.id} missing date.`);
	// 			return;
	// 		}
	// 		if (latest === null || d > latestDate) {
	// 			latest = aRec;
	// 			latestDate = d;
	// 		}
	// 	});
	// 	if (!latest) {
	// 		console.log(`   • Site ${siteRec.id} no dated audits.`);
	// 		siteToLatest.set(siteRec.id, null);
	// 	} else {
	// 		console.log(`   • Site ${siteRec.id}: latest = ${latest.id} (${latestDate})`);
	// 		siteToLatest.set(siteRec.id, latest);
	// 	}
	// }

	// // 4.7) Build output JSON
	// console.log('\n7️⃣  Building output JSON:');
	// const output = filteredSites.map((s) => {
	// 	const latest = siteToLatest.get(s.id);
	// 	return {
	// 		site: { id: s.id, fields: s.fields },
	// 		latestAudit: latest
	// 			? { id: latest.id, fields: latest.fields }
	// 			: null,
	// 	};
	// });
	// console.log('✅ JSON structure ready.');

	// // 4.8) Write to disk
	// console.log(`\n8️⃣  Writing to ${OUTPUT_FILE}:`);
	// try {
	// 	await fs.mkdir(OUTPUT_DIR, { recursive: true });
	// 	await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
	// 	console.log(`✅ Successfully wrote ${output.length} entries.`);
	// } catch (err) {
	// 	console.error(`❌ Failed to write file:`, err);
	// 	process.exit(1);
	// }

	// console.log('\n🏁 Done.');
}

main().catch((err) => {
	console.error('❌ Unexpected error:', err);
	process.exit(1);
});
