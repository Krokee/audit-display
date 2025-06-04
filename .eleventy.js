module.exports = function (eleventyConfig) {
	eleventyConfig.addCollection("sitePages", function (collectionApi) {
		const sites = require("./src/_data/sites.json");
		return sites.map(siteObj => ({
			...siteObj,
			id: siteObj.site.id,
		}));
	});

	return {
		dir: {
			input: "src",
			output: "dist",
			includes: "_includes"
		},
		markdownTemplateEngine: "njk",
		htmlTemplateEngine: "njk",
		dataTemplateEngine: "njk"
	};
};
