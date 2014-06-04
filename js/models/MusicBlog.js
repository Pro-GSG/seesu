define(['spv', 'js/libs/BrowseMap', './SongsList', './LoadableList'],
function(spv, BrowseMap, SongsList, LoadableList) {
"use strict";
var MusicBlogSongs = function() {};
SongsList.extendTo(MusicBlogSongs, {
	init: function(opts, params) {
		this._super.apply(this, arguments);
		this.initStates(params);

	},
	
	'nest_req-songs-list': [
		[{
			is_array: true,
			source: 'songs',
			props_map: {
				artist: 'artist',
				track: 'title'
			}
		}, {
			props_map: {
				total: null
			}
		}],
		['exfm', 'get', function() {
			return ['site/' + encodeURIComponent(this.state('url')) + '/songs', null];
		}]
	]
});

var music_blog_sps = ['songs'];
var MusicBlog = function() {};
BrowseMap.Model.extendTo(MusicBlog, {
	model_name: 'music_blog',
	init: function(opts, params) {
		this._super.apply(this, arguments);

		this.initStates(params);
		this.sub_pa_params = {url: params.blog_url};
		this.wch(this, 'mp_show', function(e) {
			if (e.value) {
				this.requestState('nav_title');
			}
		});

	},
	'nest-lists_list':
		[music_blog_sps],
	'nest-preview_list':
		[music_blog_sps, true],
	sub_pa: {
		songs: {
			title: 'Song of the blog',
			constr: MusicBlogSongs
		}
	},
	addRawData: function(data) {
		this.updateState('nav_title', data.nav_title);
	},
	req_map: [
		[
			['nav_title'],
			{
				props_map: {
					'nav_title': 'site.title'
				}
			},
			['exfm', 'get', function() {
				return ['site/' + encodeURIComponent(this.state('blog_url')), null];
			}]
		]
	]
});

var BlogsList = function() {};
LoadableList.extendTo(BlogsList, {
	model_name: 'blogs_list',
	init: function(opts) {
		this._super.apply(this, arguments);
		this.initStates();
	},
	makeDataItem: function(data) {
		var item = this.app.start_page.getSPI('blogs/' + this.app.encodeURLPart(data.url.replace('http://', '')), true);
		item.addRawData(data);
		return item;
	},

	'nest_req-lists_list': [
		[{
			is_array: true,
			source: 'sites',
			props_map: {
				nav_title: 'title',
				url: 'url'
			}
		}, {
			props_map: {
				total: null
			}
		}],
		['exfm', 'get', function() {
			return [this.api_url_part, null];
		}]

	]
});

var FeaturedBlogs = function() {};
BlogsList.extendTo(FeaturedBlogs, {
	api_url_part: 'site/featured'
});

var TrendedBlogs = function() {};
BlogsList.extendTo(TrendedBlogs, {
	api_url_part: 'sotd'
});

var blogs_cond_sps = ['blogs-of-the-day'/*, 'featured'*/];
var BlogsConductor = function() {};
BrowseMap.Model.extendTo(BlogsConductor, {
	model_name: 'blogs_conductor',
	init: function(opts) {
		this._super.apply(this, arguments);
		this.initStates();
	},
	'nest-lists_list':
		[blogs_cond_sps],
	'nest-preview_list':
		[blogs_cond_sps, true],
	sub_pa: {
		'blogs-of-the-day': {
			title: 'Blogs of the day',
			constr: TrendedBlogs
		},
		featured: {
			constr: FeaturedBlogs,
			title: 'Featured'
		}
	}
});



//http://ex.fm/api/v3/sotd
//http://ex.fm/api/v3/site/featured

//http://ex.fm/api/v3/site/awesometapes.com
//http://ex.fm/api/v3/site/awesometapes.com/songs
MusicBlog.BlogsConductor = BlogsConductor;

return MusicBlog;

});