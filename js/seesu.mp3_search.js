var searches_pr = {
	vk: 0,
	soundcloud: -5
};
var song_methods = {
	view: function(no_navi){
		su.mp3_search.find_mp3(this);
		su.ui.updateSongContext(this);
		viewSong(this, no_navi);	
	},
	wheneWasChanged: function(){
		return (this.raw && 1) || this.sem.changed;
	},
	song: function(){
		if (this.raw){
			return this;
		} else if (this.sem) {
			var s = cmo.getAllSongTracks(this.sem);
			return !!s && s[0].t[0];
		} else{
			return false;
		}
	},
	songs: function(){
		if (this.raw){
			return [{t:[this]}];
		} else{
			return cmo.getAllSongTracks(this.sem);
		}
		
	},
	getURLPart: function(){
		var url ="";
		if (this.artist && this.plst_titl.playlist_type != 'artist'){
			url += '/' + this.artist + '/' + (this.track || '_');
		} else{
			if (this.track){
				url += '/' + this.track;
			}
		}
		return url;
	},
	isHaveAnyResultsFrom: function(source_name){
		return !!this.raw || !!this.sem && this.sem.isHaveAnyResultsFrom(source_name);
	},
	isNeedsAuth: function(service_name){
		return !this.raw && (su.mp3_search.isNoMasterOfSlave(service_name));
	},
	isHaveTracks: function(){
		return !!this.raw || !!this.sem && this.sem.have_tracks ;
	},
	isSearchCompleted: function(){
		return !!this.raw || !!this.sem && this.sem.search_completed;
	},
	isHaveBestTracks: function(){
		return !!this.raw || !!this.sem && this.sem.have_best;
	},
	kill: function(){
		if (su.player.v_song == this){
			delete su.player.v_song;
		}
		if (su.player.c_song == this){
			delete su.player.c_song;
		}
		if (this.sem){
			this.sem.removeSong(this);
		}
		for(var a in this){
			delete this[a];
		}
	}
};
var extendSong = function(mo){
	if (!mo.extended){
		$.extend(mo, song_methods);
		mo.extended = true;
	}
	
};

cmo = {
	getSteamsData: function(sem){
		
		var steams = sem.steams;
		if (!steams){
			return false;
		}
		var allr = [];
		
		for (var steam in steams){
			var d = this.getSteamData(sem, steam);
			if (d){
				allr.push(d);
			}
		}
		return !!allr.length && allr;
	},
	getSteamData: function(sem, steam_name){
		if (!sem.steams){
			return false;
		}
		var steam = sem.steams[steam_name];
		if (!steam){
			return false;
		}
		var nice_steam;
		for(var source in steam){
			if (!steam[source].failed && steam[source].t){
				nice_steam = steam[source];
				break;
			}
		}
		var ugly_steam;
		if (!nice_steam){
			for(var source in steam){
				if (steam[source].failed){
					ugly_steam = steam[source];
					break;
				}
			}
		}
		return nice_steam || ugly_steam || false;
	},
	addSteamPart: function(sem, search_source, t ){
		var _ms = this.getMusicStore(sem, search_source);
		_ms.t = t;
		sem.have_tracks = true;
		_ms.processing = false;
		sem.some_results = true;
		_ms.failed = false;
		var searches_indexes=[];
		for (var s in searches_pr) {
			if (searches_pr[s] < 1){
				searches_indexes.push(searches_pr[s]);
			}
			
		};
		var best = Math.max.apply(Math, searches_indexes);
		if (searches_pr[search_source.name] === best){
			sem.have_best = true;
		}
		sem.changed = +new Date();
		
	},
	blockSteamPart: function(sem, search_source, can_be_fixed){
		var _ms = this.getMusicStore(sem, search_source);
		_ms.processing = false;
		sem.some_results = true;
		if (!_ms.t){
			_ms.failed = true;
			if (can_be_fixed){
				_ms.fixable = true;
				
			}
			return true;
		} else{
			return false;
		}
		sem.changed = +new Date();
		
	},
	getSomeTracks: function(steam){
		var many_tracks = [];
		for(var source in steam){
			if (!steam[source].failed && steam[source].t){
				many_tracks.push.apply(many_tracks, steam[source].t);
			}
		}
		return !!many_tracks.length && many_tracks;
	},
	by_best_search_index: function(g,f){
		if (g && f) {
			var gg = searches_pr[g.name];
			var ff = searches_pr[f.name];
			if (typeof gg =='undefined'){
				gg = -1000;
			}
			if (typeof ff =='undefined'){
				ff = -1000;
			}
			
			
			if (gg < ff){
				return 1;
			}
			else if (gg > ff){
				return -1;
			}
			else{
				return 0;
			}
		} else {
			return 0;
		}
	},
	getAllSongTracks: function(sem){
		
		if (!sem || !sem.steams){
			return false;
		}
		var tracks_pack = [];
		for(var steam in sem.steams){
			var m = this.getSomeTracks(sem.steams[steam]);
			if (m){
				tracks_pack.push({
					name: steam,
					t: m
				})
			}
		}
		tracks_pack.sort(this.by_best_search_index);
		return !!tracks_pack.length && tracks_pack;
	},
	getMusicStore: function(sem, search_source){
		
		var ss = {
			name: (search_source && search_source.name) || 'sample',
			key: (search_source && search_source.key) || 0
		};
		
		if (!sem.steams){
			sem.steams = {};
		}
		if (!sem.steams[ss.name]){
			sem.steams[ss.name] = {};
		}
		if (!sem.steams[ss.name][ss.key]){
			sem.steams[ss.name][ss.key] = {
				name: ss.name,
				key: ss.key
			};
		}
		return sem.steams[ss.name][ss.key];
	}
	
}







function getSongMatchingIndex(song, query){
	var _ar = song.artist,
		_tr = song.track;
		
	var artist = query.artist,
		track = query.track;
	
	if (!track && !artist){
		if (!query.q){
			return -1000;
		} else{
			artist = query.q;
			_tr = '';
			track = '';
		}
		
	}
		
	var mi = 0;
	
	
	var epic_fail_test = artist + ' ' + track,
		epic_fail = !~epic_fail_test.indexOf(artist.replace(/^The /, '')) && !~epic_fail_test.indexOf(track);
	
	if (epic_fail){
		return mi = -1000;
	} else{
		if ((_ar == artist) && (_tr == track)){
			return mi;
		} 
		--mi;
		if ((_ar.toLowerCase() == artist.toLowerCase()) && (_tr.toLowerCase() == track.toLowerCase())){
			return mi;
		} 
		--mi;
		if ((_ar.replace(/^The /, '') == artist.replace(/^The /, '')) && (_tr == track)){
			return mi;
		} 
		--mi;
		if ((_ar.replace(/^The /, '') == artist.replace(/^The /, '')) && (_tr.replace(/.mp3$/, '') == track)){
			return mi;
		} 
		--mi;
		if ((_ar.toLowerCase() == artist.replace(/^The /).toLowerCase()) && (_tr.toLowerCase() == track.toLowerCase())){
			return mi;
		} 
		--mi;
		if (~_ar.indexOf(artist) && ~_tr.indexOf(track)) {
			return mi;
		} 
		--mi;
		if (~_ar.toLowerCase().indexOf(artist.toLowerCase()) && ~_tr.toLowerCase().indexOf(track.toLowerCase())) {
			return mi;
		} 
		
		--mi 
		return mi;
		
	}
	
		
	
};


function by_best_matching_index(g,f, query){
	if (g && f) {
		if (getSongMatchingIndex(g,query) < getSongMatchingIndex(f, query)){
			return 1;
		}
		else if (getSongMatchingIndex(g, query) > getSongMatchingIndex(f, query)){
			return -1;
		}
		else{
			return 0;
		}
	} else {
		return 0;
	}
};

function kill_music_dubs(array) {
	var cleared_array = [];
	for (var i=0; i < array.length; i++) {
		if (!has_music_copy(array, array[i], i+1)){
			cleared_array.push(array[i]);
		}
	}
	return cleared_array
};
function has_music_copy(array, entity, from_position){
	var ess = /(^\s*)|(\s*$)/g;
	if (!array.length) {return false}
	
	for (var i = from_position || 0, l = array.length; i < l; i++) {
		if ((array[i].artist.replace(ess, '') == entity.artist.replace(ess, '')) && (array[i].track.replace(ess, '') == entity.track.replace(ess, '')) && (array[i].duration == entity.duration)) {
			return true;
		}
	};
};


function canUseSearch(sem, search_source){
	if (!sem.steams){
		return true;
	}
	if (!sem.steams[search_source.name]){
		return true;
	}
	
	var my_steam = sem.steams[search_source.name][search_source.key];
	if (my_steam){
		if (my_steam.failed){
			if (my_steam.fixable){
				return true;
			} else{
				return false;
			}
		} else if (my_steam.t){
			return false; 
		} else if (my_steam.processing){
			return false; 
		} else{
			return true;
		}
		
	}
		
	var fixable = true;
	var getted = false;
	for (var steam in sem.steams) {
		if (sem.steams[steam].t){
			getted = true;
		}
		if (sem.steams[steam].failed && !sem.steams[steam].fixable){
			fixable = false;
		}
		
	};
	if (!getted && fixable){
		return true;
	} else{
		return false;
	}
};
function handle_song(mo, complete, get_next){
	
	su.ui.updateSongContext(mo);
	
	if (complete){
		mo.node.removeClass('search-mp3');
		if (mo.isHaveTracks()){
			clearTimeout(mo.cantwait);
			wantSong(mo);
			if (get_next){
				if (su.player.c_song && !su.player.c_song.load_finished) {
					if (mo == su.player.c_song.next_song && su.player.musicbox.preloadSong){
						su.player.musicbox.preloadSong(su.player.c_song.next_song.song().link);
					} 
				}
			}
		} else{
			mo.node.addClass('search-mp3-failed').removeClass('waiting-full-render');
			if (get_next){
				if (su.player.c_song) {
					if (mo == su.player.c_song.next_song || mo == su.player.c_song.prev_song || mo == su.player.c_song.next_preload_song){
						su.player.fix_songs_ui();
					}
					if (su.player.c_song.next_preload_song){
						get_next_track_with_priority(su.player.c_song.next_preload_song);
					}
				}
			}
		}
	} else if (mo.isHaveBestTracks()){
		clearTimeout(mo.cantwait);
		wantSong(mo);
	} else if (mo.isHaveTracks()){
		mo.cantwait = setTimeout(function(){
			mo.node.removeClass('search-mp3');
			wantSong(mo);
			
		},20000);
	}
	
	if (mo.isHaveTracks() || mo.isHaveBestTracks()){
		
		su.ui.updateSong(mo);
		su.ui.els.export_playlist.addClass('can-be-used');
	}
};

var get_mp3 = function(msq, options, p, callback, just_after_request){
	var o = options || {};
	var search_query = msq.q ? msq.q: ((msq.artist || '') + ' - ' + (msq.track || ''));
	
	//o ={handler: function(){}, nocache: false, only_cache: false, get_next: false}
	
	if (!o.nocache && !o.only_cache){
		su.ui.els.art_tracks_w_counter.text((su.delayed_search.tracks_waiting_for_search += 1) || '');
	}
	
	var count_down = function(search_source, music_list, can_be_fixed){
		var complete = p.n !== 0 && --p.n === 0;
		if (!o.nocache && !o.only_cache){
			su.ui.els.art_tracks_w_counter.text((su.delayed_search.tracks_waiting_for_search -= 1) || '');
		}
		if (callback){
			callback(!music_list, search_source, complete, music_list, can_be_fixed)
		}
	};

	var callback_success = function(music_list, search_source){
		music_list.sort(function(g,f){
			return by_best_matching_index(g,f, msq)
		});
		cache_ajax.set(search_source.name + 'mp3', search_query, {
			music_list: music_list,
			search_source: search_source
		});
		
		
		//success
		for (var i=0; i < music_list.length; i++) {
			music_list[i].raw = true;
//			extendSong(music_list[i]);
		};
		
		count_down(search_source, music_list);
		
	};
	
	var callback_error = function(search_source, can_be_fixed){
		//error
		count_down(search_source, false, can_be_fixed);
	};
	var used_successful = o.handler(search_query, callback_success, callback_error, o.nocache, just_after_request, o.only_cache);
	
	
	return used_successful;
};


function music_seach_emitter(q){
	this.q = q;
	this.fdefs = [];
	this.songs = [];
	
};
music_seach_emitter.prototype = {
	addSong: function(mo, get_next){
		if (!~this.songs.indexOf(mo)){
			this.songs.push(mo);
			mo.sem = this;
			if (this.some_results){
				handle_song(mo, this.search_completed, get_next);
			}
		} 
		
	},
	removeSong: function(mo){
		var i = this.songs.indexOf(mo);
		if (!!~i){
			delete this.songs[i];
		}
	},
	emmit_handler: function(c, complete){
		console.log('ja')
		if (!c.done){
			if (c.filter){
				var r = cmo.getSteamData(this, c.filter);
				if (r){
					c.handler(r.failed && {failed: true}, [r], c, complete);
					console.log('filter, no repsonce, handling')
				} else if (!su.mp3_search.haveSearch(c.filter)){
					c.handler({not_exist: true}, false, c, complete);
					console.log('no filter, no search, handling')
				}
			} else{
				var r = cmo.getSteamsData(this);
				if (r){
					c.handler(false, r, c, complete);
					console.log('no filter, handling')
				} else{
					c.handler(false, false, c, complete);
					console.log('no filter, no repsonce, handling')
				}
			}
		}
	},
	addHandler: function(oh){
		this.fdefs.push(oh);
		this.emmit_handler(oh);
	},
	emit: function(complete, get_next){
		for (var i=0; i < this.songs.length; i++) {
			if (this.songs[i]){
				handle_song(this.songs[i], complete, get_next);
			}
			
		}
		
		for (var i=0; i < this.fdefs.length; i++) {
			this.emmit_handler(this.fdefs[i], complete, get_next)
			
			
			
		}
		
	},
	wait_ui: function(){
		for (var i=0; i < this.songs.length; i++) {
			var mo = this.songs[i];
			if (mo && !mo.have_tracks){
				mo.node.addClass('search-mp3');
			}
		}
		
		for (var i=0; i < this.fdefs.length; i++) {
			if (!this.fdefs[i].done && this.fdefs[i].while_wait){
				this.fdefs[i].while_wait(); 
			}
			
		}
	},
	isHaveAnyResultsFrom: function(source_name){
		return !!cmo.getSteamData(this, source_name);
	}
};
su.mp3_search= (function(){
		var s = [];
		s.search_emitters = {};
		s.abortAllSearches = function(){
			for (var i=0; i < this.length; i++) {
				if (this[i].q && this[i].q.abort){
					this[i].q.abort;
				}
			};
		};
		s.getCache = function(sem, name){
			return cache_ajax.get(name + 'mp3', sem.q, function(r){
				
				cmo.addSteamPart(sem, r.search_source, r.music_list);
				sem.emit();
				
			});
		};
		
		s.searchFor = function(query, init, filter, options){
			var q = HTMLDecode(query.q || (query.artist + ' - ' + query.track));
			var o = options || {};
			var search_handlers = [];
			
			var seeking_something_fresh;
			var sem = this.search_emitters[q] || (this.search_emitters[q] = new music_seach_emitter(q));
			if (init){
				seeking_something_fresh = init(sem);
			}
	
			var tried_cache = [];
			
			for (var i=0; i < this.length; i++) {
				var cursor = this[i];
				var _c; //cache
				if (!filter || cursor.name == filter){
					if (!seeking_something_fresh && !~tried_cache.indexOf(cursor.name)){
						_c = this.getCache(sem, cursor.name);
						tried_cache.push(cursor.name);
					}
					
					if (!_c && !o.only_cache && !cursor.disabled){
						if (!cursor.preferred || cursor.preferred.disabled){
							var can_search = cursor.test(sem);
							if (can_search){
								cmo.getMusicStore(sem, cursor.s).processing = true;
								search_handlers.push(cursor.search);
							}
								
						}
						
					}
				}
				
			};
			var p = {
				n: search_handlers.length
			};
			var successful_uses = []
			if (search_handlers.length){
				for (var i=0; i < search_handlers.length; i++) {				
					var used_successful =  get_mp3(query, {
						handler: search_handlers[i],
						get_next: o.get_next
					}, p, function(err, search_source, complete, music_list, can_be_fixed){
						if (err){
							if (search_source){
								cmo.blockSteamPart(sem, search_source, can_be_fixed);
							}
						} else{
							cmo.addSteamPart(sem, search_source, music_list);
						}
						if (complete){
							sem.search_completed = true;
						}
						sem.emit(complete, o.get_next);
					}, function(){
						sem.wait_ui();
					});
					if (used_successful){successful_uses.push(used_successful)}
					
					
					
				};
			} else if (!o.only_cache) {
				if (!seeking_something_fresh){
					sem.emit(sem.search_completed = true, o.get_next);
				}
				
			}
			
			return !!successful_uses.length && successful_uses;
		},
		s.find_mp3 = function(mo, options){
//			extendSong(mo);
			if (!mo.artist || !mo.track || mo.raw ){
				return false;
			}
			var music_query = {
				artist:mo.artist,
				track: mo.track
			};
			var mqs = mo.artist + ' - '+ mo.track;
			var successful_uses = this.searchFor(music_query, function(sem){
				if (!mo.handled){
					sem.addSong(mo, !!options && options.get_next);
					mo.handled = true;
					
				} 
				var force_changed;
				if (!mo.was_forced){
					if (!options || !options.only_cache){
						mo.was_forced = true;
						force_changed = true;
					}
					
				}
				return !force_changed && mo.was_forced && mo.isSearchCompleted();

				
			}, false, options);
			
			if (successful_uses){
				for (var i=0; i < successful_uses.length; i++) {
					var used_successful = successful_uses[i];
					if (typeof used_successful == 'object'){
						var has_pr = mo.want_to_play;
						if (has_pr) {
							used_successful.pr = has_pr;
						}
						mo.delayed_in.push(used_successful);
						used_successful.q.init();
					};
				};
			}
			
			
			
		};
		s.find_files = function(q, filter, callback, options){
			
			var successful_uses = this.searchFor(q, function(sem){
				sem.addHandler({
					filter: filter,
					handler: callback
				});
			}, filter, options);
			
			if (successful_uses){
				for (var i=0; i < successful_uses.length; i++) {
					var used_successful = successful_uses[i];
					if (typeof used_successful == 'object'){
						used_successful.pr = su.player.want_to_play + 1;
						used_successful.q.init();
					}
				};
			}
			
		};
		var newSearchInit = function(){
			for (var am in this.search_emitters){
				if (this.search_emitters[am] instanceof music_seach_emitter){
					delete this.search_emitters[am].search_completed;
				}
			}
			if (su.player){
				if (su.player.c_song){
					if (su.player.c_song.sem){
						s.searchFor(su.player.c_song.sem.q);
					}
					
					if (su.player.c_song.next_preload_song && su.player.c_song.next_preload_song.sem){
						s.searchFor(su.player.c_song.next_preload_song.sem.q);
					}
				}
				if (su.player.v_song && su.player.v_song != su.player.c_song ){
					if (su.player.v_song.sem){
						s.searchFor(su.player.v_song.sem.q);
					}
					
				}
			}
			
		};
		s.getMasterSlaveSearch = function(filter){
			var o = {
				exist_slave: false,
				exist_alone_master: false,
				exitst_master_of_slave: false
			}
			var exist_slave;
			var exist_alone_master;
			for (var i=0; i < this.length; i++) {
				var cmp3s = this[i];
				if (!cmp3s.disabled && cmp3s.name == filter){
					if (cmp3s.slave){
						if (!o.exist_slave){
							o.exist_slave = cmp3s;
							break
						}
					}
				}
			};
			for (var i=0; i < this.length; i++) {
				var cmp3s = this[i];
				if (!cmp3s.disabled && cmp3s.name == filter){
					if (!cmp3s.slave){
						if (o.exist_slave){
							if (o.exist_slave.preferred == cmp3s){
								o.exitst_master_of_slave = cmp3s;
							} else{
								o.exist_alone_master = cmp3s;
							}
						} else{
							o.exist_alone_master = cmp3s;
						}
					}
				}
			};
			return o;
		};
		s.haveSearch = function(search_name){
			var o = this.getMasterSlaveSearch(search_name);	
			return !!o.exist_slave || !!o.exitst_master_of_slave || !!o.exist_alone_master;
		};
		s.isNoMasterOfSlave= function(filter){
			var o = this.getMasterSlaveSearch(filter);
			return !!o.exist_slave && !o.exitst_master_of_slave;
		};
		s.add = function(asearch, force){
			
			
			var push_later;
			
			
			var o = this.getMasterSlaveSearch(asearch.name);
			

			if (o.exist_slave){
				if (force || !o.exitst_master_of_slave){
					if (o.exist_slave.preferred){
						o.exist_slave.preferred.disabled = true;
					}
					
					this.push(asearch);
					o.exist_slave.preferred = asearch;
					newSearchInit();
				} 
			} else if (o.exist_alone_master){
				if (force){
					o.exist_alone_master.disabled = true;
					this.push(asearch);
					newSearchInit();
				}
			} else{
				this.push(asearch);
				newSearchInit();
			}
		}

		return s;
})();

if (typeof soundcloud_search != 'undefined'){
	(function(){
		 
		var sc_search_source = {name: 'soundcloud', key: 0};
		su.mp3_search.add({
			test: function(mo){
				return canUseSearch(mo, sc_search_source);
			},
			search: soundcloud_search,
			name: sc_search_source.name,
			description:'soundcloud.com',
			slave: false,
			s: sc_search_source,
			preferred: null,
			q: su.soundcloud_queue
		})
		
		
		/*testVKAccaunt();*/
	})();
	
};