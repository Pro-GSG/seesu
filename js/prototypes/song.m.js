(function() {
"use strict";
var counter = 0;

provoda.addPrototype("baseSong",{
	state_change: {
		"mp-show": function(opts) {
			if (opts){
				this.makeSongPlayalbe(true);
				this.checkNeighboursChanges(false, true, "track view");
				/*
				if (this.isSearchCompleted() || this.isHaveBestTracks()){
					this.checkNeighboursChanges(false, true, "track view");
				} else {
					//this.checkAndFixNeighbours();
				}*/
				var _this = this;
				this.mp3_search.on("new-search.viewing-song", function(){
					_this.findFiles();
					_this.checkNeighboursChanges(false, true, "track view");
					if (_this.next_preload_song){
					//	_this.next_preload_song.findFiles();
					}

				}, {exlusive: true});
				
			} else {
				this.removeMarksFromNeighbours();
			}
		},
		"player-song": function(state){
			if (state){
				if (!this.state("mp-show") && this.isSearchCompleted()){
					this.checkNeighboursChanges(false, false, "player song");
				}
				
				var _this = this;
				this.mp3_search.on("new-search.player-song", function(){
					_this.findFiles();
					_this.checkNeighboursChanges(false, false, "new search, player song");
					if (_this.next_preload_song){
					//	_this.next_preload_song.findFiles();
					}
				}, {exlusive: true});
			}
		},
		"is_important": function(state){
			if (!state){
				this.unloadFor(this.uid);
			}
		}
	},
	init: function(omo, playlist, player, mp3_search){
		this._super();
		this.plst_titl = playlist;
		this.mp3_search = mp3_search;
		this.player = player;
		
		this.uid = ++counter;
		cloneObj(this, omo, false, ['artist', 'track']);
		this.omo = omo;
		if (omo.artist){
			this.updateState('artist', omo.artist);
		}
		if (omo.track){
			this.updateState('track', omo.track);
		}
	},
	mlmDie: function() {
		
	},
	complex_states: {
		'song-title': {
			depends_on: ['artist', 'track'],
			fn: function(artist, track){
				return this.getFullName(artist, track);
			}
		},
		'full-title': {
			depends_on: ['artist', 'track'],
			fn: function(artist, track){
				return this.getFullName(artist, track);
			}
		},
		is_important: {
			depends_on: ['mp-show', 'player-song'],
			fn: function(mp_show, player_song){
				return !!(mp_show || player_song);

			}
		}
	},
	getFullName: function(artist, track, allow_short){
		var n = '';
		if (this.artist){
			if (this.track){
				if (allow_short && this.plst_titl && (this.plst_titl.info && this.plst_titl.info.artist == this.artist)){
					n = this.track;
				} else {
					n = this.artist + " - " + this.track;
				}
			} else {
				n = this.artist;
			}
		} else if (this.track){
			n = this.track;
		}
		return n || 'no title';
	},
	updateNavTexts: function() {
		var title = this.state('full-title');
		this.updateState('nav-text', title);
		this.updateState('nav-title', title);
	},
	playNext: function(auto) {
		if (this.state('rept-song')){
			this.play()
		} else {
			this.plst_titl.switchTo(this, true, auto);
		}
		
	},
	playPrev: function() {
		this.plst_titl.switchTo(this);
	},
	findNeighbours: function(){
		this.plst_titl.findNeighbours(this);
	},
	checkAndFixNeighbours: function(){
		this.findNeighbours();
		this.addMarksToNeighbours();
	},
	downloadLazy: debounce(function(){
		var song = getTargetField(this.mf_cor.songs(), "0.t.0");
		if (song){
			downloadFile(song.link);
		}
	}, 200),
	canPlay: function() {
		return this.mf_cor.canPlay();
	},
	preloadFor: function(id){
		this.mf_cor.preloadFor(id);
	},
	unloadFor: function(id){
		this.mf_cor.unloadFor(id);
	},
	setVolume: function(vol){
		this.mf_cor.setVolume(vol);
	},
	stop: function(){
		this.mf_cor.stop();
	},
	switchPlay: function(){
		this.mf_cor.switchPlay();
	},
	pause: function(){
		this.mf_cor.pause();
	},
	play: function(mopla){
		this.mf_cor.play(mopla);

	},
	markAs: function(neighbour, mo){
		if (!this.neighbour_for){
			this.neighbour_for = mo;
			this.updateState('marked_as', neighbour);
		}
	},
	unmark: function(mo){
		if (this.neighbour_for == mo){
			delete this.neighbour_for;
			this.updateState('marked_as', false);

		}
	},
	wasMarkedAsPrev: function() {
		return this.state('marked_as') && this.state('marked_as') == 'prev';
	},
	wasMarkedAsNext: function() {
		return this.state('marked_as') && this.state('marked_as') == 'next';
	},
	addMarksToNeighbours: function(){
		
		if (!this.marked_prev_song || this.marked_prev_song != this.prev_song){
			if (this.marked_prev_song){
				this.marked_prev_song.unmark(this);
			}
			if (this.prev_song){
				(this.marked_prev_song = this.prev_song).markAs('prev', this);
			}
		}
		if (!this.marked_next_song || this.marked_next_song != this.next_song){
			if (this.marked_next_song){
				this.marked_next_song.unmark(this);
			}
			if (this.next_song){
				(this.marked_next_song = this.next_song).markAs('next', this);
			}
		}
			
		
	},
	removeMarksFromNeighbours: function(){
		if (this.marked_prev_song){
			this.marked_prev_song.unmark(this);
			delete this.marked_prev_song;
		}
		if (this.marked_next_song){
			this.marked_next_song.unmark(this);
			delete this.marked_next_song;
		}
	},
	wheneWasChanged: function(){
		return (this.raw() && 1) || (this.sem && this.sem.changed || 1);
	},
	waitToLoadNext: function(ready){
		this.ready_to_preload = ready;
		if (ready){
			if (!this.waiting_to_load_next && this.player.c_song == this && this.next_preload_song){
				var nsong = this.next_preload_song;
				var uid = this.uid;
				this.waiting_to_load_next = setTimeout(function(){
					nsong.preloadFor(uid);
				}, 4000);
			}
		} else if (this.waiting_to_load_next){
			clearTimeout(this.waiting_to_load_next);
			delete this.waiting_to_load_next;
		}
	},
	isImportant: function() {
		return this.state('is_important');
	},
	canUseAsNeighbour: function(){
		return (this.canSearchFiles() && (this.canPlay() || !this.isSearchCompleted())) || (!this.track && this.canFindTrackTitle());
	},
	getNeighboursChanges: function(to_check){
		var
			check_list = {},
			need_list = {},
			ste_diff = {},
			n_ste = {},
			o_ste = {
				next_song: this.next_song,
				prev_song: this.prev_song,
				next_preload_song: this.next_preload_song
			};

		for (var i in o_ste){
			check_list[i] = !to_check || (o_ste[i] == to_check);
		}

		cloneObj(n_ste, o_ste);

		var fastCheck = function(neighbour_name){
			if (o_ste[neighbour_name]){
				n_ste[neighbour_name] = o_ste[neighbour_name] && o_ste[neighbour_name].canUseAsNeighbour() && o_ste[neighbour_name]; 
			}
			need_list[neighbour_name] = !n_ste[neighbour_name];
		};

		for (var i in check_list){
			if (check_list[i]){
				fastCheck(i);
			}
		}

		var changes = this.plst_titl.getNeighbours(this, need_list);

		cloneObj(n_ste, changes);


		return getDiffObj(o_ste, n_ste);


	},
	checkNeighboursChanges: function(changed_neighbour, viewing, log) {
		var changes = this.getNeighboursChanges(changed_neighbour)
		//console.log("changes");
		//console.log();
		cloneObj(this, changes)

		//this.findNeighbours();

		viewing = viewing || !!this.state("mp-show");
		var playing = !!this.state("player-song");

		if (viewing){
			this.addMarksToNeighbours();
			if (changes.prev_song && !changes.prev_song.track){
				changes.prev_song.getRandomTrackName();
			}
			
		}
		if ((viewing || playing) && changes.next_preload_song){
			changes.next_preload_song.makeSongPlayalbe(true);
		}
		if (!this.cncco){
			this.cncco = [];
		} else {
			this.cncco.push(log);
		}

		if (viewing || playing){
			if (!this.hasNextSong()){
				this.plst_titl.loadMoreSongs();
			}
		}

	},
	hasNextSong: function(){
		return !!this.next_song;
	},
	canFindTrackTitle: function() {
		return !this.state("no-track-title")
	},
	getRandomTrackName: function(full_allowing, from_collection, last_in_collection){
		this.updateState('loading', true);
		var _this = this;
		if (!this.track && !this.rtn_request){
			var request = this.rtn_request = lfm.get('artist.getTopTracks',{'artist': this.artist, limit: 30, page: 1 })
				.done(function(r){
					if (_this.track){
						return;
					}
					var tracks = toRealArray(getTargetField(r, 'toptracks.track'));
					tracks = $filter(tracks, 'name');
					var some_track = tracks[Math.floor(Math.random()*tracks.length)];
					if (some_track){
						_this.track = some_track;
						_this.updateState('track', some_track);
						_this.updateNavTexts();

						_this.findFiles({
							only_cache: !full_allowing,
							collect_for: from_collection,
							last_in_collection: last_in_collection
						});
						_this.trigger('url-change');



					} else {
						_this.updateState("no-track-title", true);
					}

					_this.checkChangesSinceFS();

				})
				.always(function(){
					_this.updateState('loading', false);
					if (_this.rtn_request == request){
						delete _this.rtn_request;
					}
				});
			if (this.state("mp-show")){
				request.queued && request.queued.setPrio('highest');
			}

			this.addRequest(request);
		}
	},
	prefindFiles: function(){
		this.findFiles({
			get_next: true
		});
		this.setPrio('highest');
	},
	findFiles: function(opts){
		if (this.mp3_search){
			opts = opts || {};
			opts.only_cache = opts.only_cache && !this.state('want_to_play') && (!this.player.c_song || this.player.c_song.next_preload_song != this);
		
			if (!this.artist || !this.track || this.raw() ){
				return false;
			}
			var _this = this;
			var music_query = {
				artist:this.artist,
				track: this.track
			};

			this.mp3_search.searchFor(music_query, function(sem){

				if (!_this.sem){
					_this.sem = sem;
					if (_this.mf_cor){
						_this.mf_cor.setSem(_this.sem);
					}
					sem.on('progress', function() {
						_this.filesSearchStarted();
					});
					sem.on('changed', function(complete){
						_this.updateFilesSearchState(complete);
					});
				}

				var force_changed;
				if (!_this.was_forced){
					if (!opts || !opts.only_cache){
						_this.was_forced = true;
						force_changed = true;
					}
					
				}
				return !force_changed && _this.was_forced && _this.isSearchCompleted();
			}, false, opts);


			if (this.state('want_to_play')) {
				this.sem.setPrio('highest');
			}
			var reqs = this.sem.getRequests();
			for (var i = 0; i < reqs.length; i++) {
				this.addRequest(reqs[i], true);
			}
			
			var queued = this.sem.getQueued();
			for (var i = 0; i < queued.length; i++) {
				queued[i].q.init();
			}

			//this.mp3_search.find_mp3(this, opts);
		}
	},
	makeSongPlayalbe: function(full_allowing,  from_collection, last_in_collection){
		if (this.raw()){
			this.updateState('playable', true);
		} else if (!this.track && full_allowing){
			if (this.getRandomTrackName){
				this.getRandomTrackName(full_allowing, from_collection, last_in_collection);
			}
			
		} else{
		//	if (this.isSearchCompleted()){
			//	this.updateFilesSearchState(true);
			//}
			this.findFiles({
				only_cache: !full_allowing,
				collect_for: from_collection,
				last_in_collection: last_in_collection
			});
		}
	},
	filesSearchStarted: function(){
		this.updateState('searching-files', true);
	},
	updateFilesSearchState: function(complete){

		var _this = this;

		var opts = {
			complete: complete,
			have_tracks: this.isHaveTracks("mp3"),
			have_best_tracks: this.isHaveBestTracks()
		};
		


		if (complete){
			this.updateState('searching-files', false);
		}
		if (opts.have_tracks){
			this.updateState('playable', true);
		}
		this.trigger('files_search', opts);
		this.updateState('files_search', opts);


		this.checkChangesSinceFS();
		


		
	},
	checkChangesSinceFS: function(opts){
		if (this.isImportant()){
			if (!opts || (opts.complete || opts.have_best_tracks)){
				this.checkNeighboursChanges(false, false, 'important; files search');
			}
		} 

		if (!opts || opts.complete){
			var v_song = this.plst_titl.getViewingSong(this);
			var p_song = this.plst_titl.getPlayerSong(this);
			
			if (v_song && v_song.isPossibleNeighbour(this)) {
				v_song.checkNeighboursChanges(this,false, "nieghbour of viewing song; files search");
			}
			
			if (p_song && v_song != p_song && p_song.isPossibleNeighbour(this)){
				p_song.checkNeighboursChanges(this,false, "nieghbour of playing song; files search");
			}
		}
		
	},
	view: function(no_navi, user_want){
		if (!this.state('mp-show')){
			this.trigger('view', no_navi, user_want);
		}
	},
	valueOf:function(){
		return (this.artist ? this.artist + ' - ' : '') + this.track;
	},
	isPossibleNeighbour: function(mo) {
		return this.isNeighbour(mo) || mo == this.next_preload_song;
	},
	isNeighbour: function(mo){
		return (mo == this.prev_song) || (mo == this.next_song);
	},
	canSearchFiles: function(){
		return !!(this.artist && this.track);
	},
	setPlayableInfo: function(info){
		this.playable_info = info;
		return this;
	},
	isNeedsAuth: function(service_name){
		return !this.raw() && this.mp3_search && (this.mp3_search.isNoMasterOfSlave(service_name) || !this.mp3_search.haveSearch(service_name));
	},
	raw: function(){
		return this.mf_cor && this.mf_cor.raw();
	},
	isHaveAnyResultsFrom: function(source_name){
		return this.mf_cor && this.mf_cor.isHaveAnyResultsFrom(source_name);
	},
	isHaveTracks: function(type){
		return this.mf_cor && this.mf_cor.isHaveTracks(type);
	},
	isSearchCompleted: function(){
		return this.mf_cor && this.mf_cor.isSearchCompleted();
	},
	isHaveBestTracks: function(){
		return this.mf_cor && this.mf_cor.isHaveBestTracks();
	},
	song: function(){
		return this.mf_cor && this.mf_cor.song();
	},
	songs: function(){
		return this.mf_cor && this.mf_cor.songs();
	},
	posistionChangeInMopla: function(mopla){
		if (this.getCurrentMopla() == mopla){
			this.submitPlayed(true);
			this.submitNowPlaying();

			if (!this.start_time){
				this.start_time = ((new Date() * 1)/1000).toFixed(0);
			}
		}
	},
	getCurrentMopla: function(){
		return this.mf_cor.getCurrentMopla();
	},
	submitPlayed: function(careful){
		var
			starttime = this.start_time,
			last_scrobble = this.last_scrobble,
			timestamp = ((new Date() * 1)/1000).toFixed(0),
			duration = Math.round(this.getCurrentMopla().getDuration()/1000) || '';


		if ((!duration && !careful) || ((timestamp - starttime)/duration > 0.2) || (last_scrobble && ((timestamp - last_scrobble)/duration > 0.6)) ){

			this.start_time = false;
			this.last_scrobble = timestamp;
			delete this.start_time;


			if (su.settings['lfm-scrobbling']){
				lfm.submit({
					artist: this.artist,
					track: this.track
				}, duration, timestamp);
			}
			if (su.s.loggedIn()){
				su.s.api('track.scrobble', {
					client: su.env.app_type,
					status: 'finished',
					duration: duration,
					artist: this.artist,
					title: this.track,
					timestamp: timestamp
				});
			}
		}
	},
	submitNowPlaying: function(){
		var duration = Math.round(this.getCurrentMopla().getDuration()/1000) || '';
		if (su.settings['lfm-scrobbling']){
			lfm.nowplay({
				artist: this.artist,
				track: this.track
			}, duration);
		}
		if (su.s.loggedIn()){
			su.s.api('track.scrobble', {
				client: su.env.app_type,
				status: 'playing',
				duration: duration,
				artist: this.artist,
				title: this.track,
				timestamp: ((new Date()).getTime()/1000).toFixed(0)
			});
		}
	}
});


})();