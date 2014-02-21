define(['./coct'], function(coct) {
"use strict";

var MusicConductorPage = function() {};
coct.PageView.extendTo(MusicConductorPage, {
	base_tree: {
		sample_name: 'music_conductor_page'
	},
	children_views: {
		allpas: coct.LiListsPreview,
		сountries: coct.LiListsPreview
	}
});

return MusicConductorPage;
});