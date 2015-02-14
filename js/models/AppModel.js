define(['./AppModelBase', 'spv', 'app_serv', './SongsList', 'pv', '../libs/BrowseMap'], function(AppModelBase, spv, app_serv, SongsList, pv, BrowseMap) {
"use strict";

var localize = app_serv.localize;

var AppModel = function(){};
AppModelBase.extendTo(AppModel, {
	init: function(){
		this._super();

		for (var func_name in this.bmap_travel){
			this[func_name] = this.getBMapTravelFunc(this.bmap_travel[func_name], this);
		}
		
		return this;
	},
	checkUserInput: function(opts) {
		if (opts.ext_search_query) {
			this.search(opts.ext_search_query);
		}

		var state_recovered;
		if (this.p && this.p.c_song){
			this.showNowPlaying(true);
			state_recovered = true;
		}

		if (state_recovered){
			opts.state_recovered = true;
		}
		if (!state_recovered && !opts.ext_search_query){
			this.trigger('handle-location');
		}

		//big_timer.q.push([tracking_opts.category, 'process-thins-sui', big_timer.comp(tracking_opts.start_time), 'seesu ui in process', 100]);
		pv.update(this.start_page, 'can_expand', true);

	},
	infoGen: function(dp, c, base_string){
		if (dp){
			if (c.prev){
				c.str += ', ';
			}
			c.str += base_string.replace('%s', dp);
			if (!c.prev){
				c.prev = true;
			}
		}
	},
	getRemainTimeText: function(time_string, full){
		var d = new Date(time_string);
		var remain_desc = '';
		if (full){
			remain_desc += localize('wget-link') + ' ';
		}


		remain_desc += d.getDate() +
		" " + localize('m'+(d.getMonth()+1)) +
		" " + localize('attime') + ' ' + d.getHours() + ":" + d.getMinutes();

		return remain_desc;
	},

	nowPlaying: function(mo) {
		pv.update(this, 'now_playing', mo.getTitle());
		this.current_playing = mo;
		this.matchNav();
		this.updatePlayedListsHistory(mo);
	},
	matchNav: function() {
		if (this.current_playing){
			pv.update(this, 'viewing_playing', this.nav_tree.indexOf(this.current_playing) != -1);
		}

	},
	updatePlayedListsHistory: function(mo) {
		var array = this.getNesting('played_playlists');
		if (!array) {
			array = [];
		} else {
			array = array.slice();
		}
		var pos = array.indexOf( mo.map_parent );
		if (pos == -1) {
			array.unshift( mo.map_parent );
		} else {
			spv.removeItem(array, pos);
			array.unshift( mo.map_parent );
			
		}
		pv.updateNesting(this, 'played_playlists', array);
		pv.update(this, 'played_playlists_length', array.length);
	},
	playing: function() {
		pv.update(this, 'playing', true);
	},
	notPlaying: function() {
		pv.update(this, 'playing', false);
	},
	createSonglist: function(map_parent, params) {
		var pl = new SongsList();
		pl.init({
			app: this,
			map_parent: map_parent
		}, params);
		return pl;
	},
	keyNav: function(key_name) {
		var md = this.map.getCurMapL().getNesting('pioneer');
		if (md.key_name_nav){
			var func = md.key_name_nav[key_name];
			func.call(md);
		}

	},
	bmap_travel: {
		showArtcardPage: function(artist){
			var md = this.getArtcard(artist);
			md.showOnMap();
			/*
			var md = new ArtCard();
			md.init({
				app: this,
				map_parent: page_md || this.start_page
			}, {
				artist: artist
			});
			md.showOnMap();*/
			return md;
		},
		showArtistAlbum: function(params, page_md){
			var artcard = this.showArtcardPage(params.album_artist, page_md);
			var pl = artcard.showAlbum(params);

			return pl;
		},
		showNowPlaying: function(no_stat) {
			var resolved = this.p.resolved;
			var bwlev = resolved.getNesting('bwlev');
			var pl_bwlev = BrowseMap.getConnectedBwlev(bwlev, this.p.c_song.map_parent);
			pl_bwlev.followTo(this.p.c_song._provoda_id);
			// this.p.c_song.showOnMap();
			if (!no_stat){
				this.trackEvent('Navigation', 'now playing');
			}
		},
		showResultsPage: function(query){
			var target;
			var cur_el = this.search_el;
			// если нет элемента или элемент не отображается
			// если элемента нет или в элемент детализировали

			var need_new = !cur_el || !cur_el.state('mp_has_focus') || cur_el.state('mp_detailed');
			if (need_new){
				var md = this.createSearchPage();
				var _this = this;
				md.on('state_change-mp_show', function(e) {
					if (e.value){
						_this.search_el = this;
					}
				}, {immediately: true});

				md.showOnMap();
				target = md;
			} else {
				target = this.search_el;
			}
			var invstg = target;//.getNesting('pioneer');
			invstg.changeQuery(query);
			return invstg;

		},
		showLastfmUser: function(username) {
			var md = this.getLastfmUser(username);
			md.showOnMap();
			return md;
		},
		show_tag: function(tag){
			var md = this.routePathByModels('tags/' + tag );
			
			md.showOnMap();
			return md;
		},
		showArtistTopTracks: function(artist, page_md, start_song) {
			var artcard = this.showArtcardPage(artist, page_md);

			var track_name = start_song && start_song.track;
			var pl = artcard.showTopTacks(track_name);

			return pl;
		},
		showArtistSimilarArtists: function(artist){
			var artcard = this.showArtcardPage(artist, this.start_page);
			return artcard.showSimilarArtists();
		}
	},
	getVkUser: function(userid) {
		return this.start_page.getSPI('users/vk:' + encodeURIComponent(userid), true);
	},
	getLastfmUser: function(username) {
		return this.start_page.getSPI('users/lfm:' + encodeURIComponent(username), true);
	},
	getSongcard: function(artist_name, track_name) {
		if (!artist_name || !track_name){
			return false;
		}
		return this.start_page.getSPI('tracks/' + this.joinCommaParts([artist_name, track_name]), true);
	},
	getArtcard: function(artist_name) {

		return this.start_page.getSPI('catalog/' + encodeURIComponent(artist_name), true);
	},
	search: function(query){
		var old_v = this.state('search_query');
		if (query != old_v){
			if (!query) {
				this.showStartPage();
			} else {
				this.showResultsPage(query);
			}

		}
		pv.update(this, 'search_query', query);
	},
	'stch-search_request_freshness': function() {
		var query = this.state('search_query');
		if (query) {
			this.showResultsPage(query);
		}

	},
	refreshSearchRequest: function(time) {
		pv.update(this, 'search_request_freshness', time);
	},
	checkActingRequestsPriority: function() {
		var raw_array = [];
		var acting = [];
		var i;

		var w_song = this.p && this.p.wanted_song;

		var addToArray = function(arr, item) {
			if (arr.indexOf(item) == -1){
				arr.push(item);
			}
		};

		if (w_song){
			addToArray(acting, w_song);
		}
		var imporant_models = [ this.p && this.p.waiting_next, this.getNesting('current_mp_md'), this.p && this.p.c_song ];
		for (i = 0; i < imporant_models.length; i++) {
			var cur = imporant_models[i];
			if (cur){
				if (cur.getActingPriorityModels){
					var models = cur.getActingPriorityModels();
					if (models.length){
						raw_array = raw_array.concat(models);
					}
				} else {
					raw_array.push(cur);
				}
			}
		}

		for (i = 0; i < raw_array.length; i++) {
			addToArray(acting, raw_array[i]);
			
		}

		acting.reverse();
		for (i = 0; i < acting.length; i++) {
			acting[i].setPrio('acting');
		}

	}

});

return AppModel;
});