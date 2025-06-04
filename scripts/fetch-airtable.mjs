// fetch-airtable.mjs
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const includedSiteIds = JSON.parse(fs.readFileSync(new URL('../site-config.json', import.meta.url))).includeSites;

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

const TABLES = {
	sites: 'SITES',
	audits: 'AUDITS',
};

const API_URL = `https://api.airtable.com/v0/${BASE_ID}`;

async function fetchAirtableRecords(tableName) {
	const records = [];
	let offset = null;

	do {
		const params = new URLSearchParams({
			cellFormat: 'json',
			returnFieldsByFieldId: 'true',
			...(offset ? { offset } : {}),
		});

		const res = await fetch(`${API_URL}/${encodeURIComponent(tableName)}?${params}`, {
			headers: {
				Authorization: `Bearer ${AIRTABLE_API_KEY}`,
			},
		});

		if (!res.ok) {
			throw new Error(`Error fetching ${tableName}: ${res.statusText}`);
		}

		const json = await res.json();
		records.push(...json.records);
		offset = json.offset;
	} while (offset);

	console.log(`Fetched ${records.length} from ${tableName}`);
	return records;
}

function getLatestAuditForSite(audits, siteId) {
	const siteFieldId = 'fld7eyVpaA0NWYFze';
	const dateFieldId = 'fldnDdVmUgQKdl0x8';

	const related = audits.filter(a => {
		if (!a || typeof a !== 'object') return false;
		const fields = a.fields;
		if (!fields || typeof fields !== 'object') return false;
		const siteLinks = fields[siteFieldId];
		if (!Array.isArray(siteLinks)) {
			console.warn(`⚠️ Skipping audit ${a.id || '[no id]'} — invalid 'Site concerné':`, siteLinks);
			return false;
		}
		return siteLinks.includes(siteId);
	});

	const sorted = related.sort((a, b) => new Date(b.fields[dateFieldId]) - new Date(a.fields[dateFieldId]));
	return sorted[0] || null;
}

async function buildData() {
	const sites = await fetchAirtableRecords(TABLES.sites);
	const audits = await fetchAirtableRecords(TABLES.audits);

	console.log("Included site IDs:", includedSiteIds);
	sites.forEach(site => {
		console.log(`Site record: id=${site.id} name=${site.fields?.Name}`);
	});

	const result = sites
		.filter(site => {
			if (!site.id) {
				console.warn("⚠️ Skipping site without ID:", site);
				return false;
			}
			return includedSiteIds.includes(site.id);
		})
		.map(site => {
			const latestAudit = getLatestAuditForSite(audits, site.id);
			const f = latestAudit ? latestAudit.fields : {};

			if (!latestAudit) {
				console.log(`❌ No audit for site: ${site.id}`);
			} else {
				console.log(`✅ Audit for ${site.id}:`, Object.keys(f));
			}

			return {
				id: site.id,
				name: site.fields['Name'] || 'Unnamed Site',
				audit: latestAudit
					? {
						date: f['fldnDdVmUgQKdl0x8'],
						ecoindexNote: f['fld5h0yHSG7S2AZug'],
						websiteCarbonNote: f['fldOO9qoXCP1Zh0tr'],
						environment: f['fld6oLbteTkQJ6ao5'],
						pagespeed: {
							mobile: {
								performance: f['fldtoOj83ztDP62MC'],
								accessibility: f['fld3MGINZteer61CU'],
								bestPractices: f['fldky2G0tu5IZ8pVo'],
								seo: f['fldc3ztBsIYeqYxcN'],
							},
							desktop: {
								performance: f['fldprvkjSnNE25AjX'],
								accessibility: f['fldpk49zqimc6QsxR'],
								bestPractices: f['fldpvldyjDpNs8DmM'],
								seo: f['fld2OPL3aRZpQR7EK'],
							},
						},
						wave: {
							errors: f['fldPGauO8kjDhmaxL'],
							contrastErrors: f['fldx1HKa4sKk7HmZO'],
							alerts: f['fldpFLPHyu4i9h60G'],
						},
						bytecheck: {
							ttfb: f['fldTbbebfl3l0pL1E'],
							totalTime: f['fldF9UtlgLrCEHFpY'],
						},
					}
					: null,
			};
		});

	const outputDir = path.join(path.resolve(), 'src/_data');
	fs.mkdirSync(outputDir, { recursive: true });
	fs.writeFileSync(path.join(outputDir, 'sites.json'), JSON.stringify(result, null, 2));
	console.log('✅ Airtable data saved to src/_data/sites.json');
}

buildData().catch(err => {
	console.error('❌ Failed to fetch data from Airtable:', err);
});
