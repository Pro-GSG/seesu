var ListPreviewLine = function() {};
provoda.View.extendTo(ListPreviewLine, {
	createBase: function() {
		this.c = $('<span class="desc_item"></span>');
		if (this.extended_viewing){
			this.image_c = $('<span class="desc_item-imgcon"></span>').appendTo(this.c);
		}
		
		this.text_c = $('<span class="desc_item-text"></span>').appendTo(this.c);

	},
	'compx-selected-title': {
		depends_on: ['nav-title', 'nav-short-title'],
		fn: function(title, short_title) {
			return short_title || title;
		}
	},
	'stch-selected-title': function(state) {
		this.text_c.text(state);
	}
});
var ArtistsListPreviewLine = function() {};
ListPreviewLine.extendTo(ArtistsListPreviewLine, {
	extended_viewing: true,
	'stch-selected-image': function(lfm_wrap) {
		if (!lfm_wrap){
			return;
		}
		var url = lfm_wrap.lfm_id ? 'http://userserve-ak.last.fm/serve/64s/' + lfm_wrap.lfm_id : lfm_wrap.url;


		if (url){
			this.image_c.empty();
			this.image_c.append(
				$('<img/>').attr({
					'src': url,
					alt: this.state('artist')
				})
			);
		}
	}
});

var ListPreview = function() {};
provoda.View.extendTo(ListPreview, {
	useBase: function(node) {
		this.c = node;
		this.bindBase();
	},
	bindBase: function() {
		this.ancs = this.root_view.getPvAnchors(this.c);
		var _this = this;
		this.c.click(function() {
			_this.md.showOnMap();
		});

		this.addWayPoint(this.c);
	},
	createBase: function() {
		this.c = this.root_view.getSample('area_for_button');
		this.bindBase();
	},
	'stch-nav-title': function(state) {
		this.ancs.header.text(state);
	}
});


var ItemOfLL = function() {};
ListPreview.extendTo(ItemOfLL, {
	
	'stch-list-loading': function(state) {
		this.ancs.listc.toggleClass('list-loading', !!state);
	},
	children_views: {
		preview_list: ArtistsListPreviewLine
	},
	'collch-preview_list': {
		place: 'ancs.listc',
		limit: 9
	}
});

var ListOfListsView = function() {};
PageView.extendTo(ListOfListsView, {
	createBase: function() {
		this.c = $('<div class="usual_page lilists"></div>');
	},
	children_views: {
		lists_list: ItemOfLL
	},
	'collch-lists_list': 'c'
});



var LiListsPreview = function() {};
ListPreview.extendTo(LiListsPreview, {
	createBase: function() {
		this._super();
		this.c.addClass('tag_artists-preview');
	},
	children_views: {
		lists_list: ListPreviewLine
	},
	'collch-lists_list': 'ancs.listc'
});

var TagPageView = function() {};
PageView.extendTo(TagPageView, {
	createBase: function() {
		this.c = $('<div class="tag_page usual_page"></div>');
		this.header = $('<h2></h2>').appendTo(this.c);
		this.artists_c = $('<div class="artists_lists"></div>').appendTo(this.c);
		this.songs_c = $('<div class="songs_list"></div>').appendTo(this.c);
	},
	'stch-tag-name': function(state) {
		this.header.text(state);
	},
	children_views: {
		artists_lists: {
			main: LiListsPreview
		},
		songs_list: {
			main: LiListsPreview
		}
	},
	'collch-songs_list': 'songs_c',
	'collch-artists_lists': 'artists_c'
});