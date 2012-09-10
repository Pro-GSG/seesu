(function(){
	"use strict";
	var songsListBaseView = function() {};
	provoda.extendFromTo("songsListBaseView", suServView, songsListBaseView);
	var songsListBase = function() {};
	provoda.extendFromTo("songsListBase", suMapModel, songsListBase);



	var songsListView = function(pl){};
	songsListBaseView.extendTo(songsListView, {
		'stch-mp-show': function(opts) {
			if (opts){
				this.c.removeClass('hidden');
				$(su.ui.els.slider).addClass('show-player-page');
			} else {
				$(su.ui.els.slider).removeClass('show-player-page');
				this.c.addClass('hidden');
			}
		},
		'stch-mp-blured': function(state) {
			if (state){
				
			} else {
				
			}
		},
		'stch-error': function(error){
			if (this.error_b && this.error_b.v !== error){
				this.error_b.n.remove();
			}
			if (error){
				if (error == 'vk_auth'){
					this.error_b = {
						v: error,
						n: $('<li></li>').append(su.ui.samples.vk_login.clone()).prependTo(this.c)
					};
				} else {
					this.error_b = {
						v: error,
						n: $('<li>' + localize('nothing-found','Nothing found') + '</li>').appendTo(this.c)
					};
				}
			}
		},
		createPanel: function() {
			this.panel = su.ui.samples.playlist_panel.clone();

			var actsrow_view = this.md.plarow.getFreeView(this);
			if (actsrow_view){
				this.addChild(actsrow_view);
			}
			
			
			return this;
		}
	});



	

	songsList = function(params, first_song, findMp3, player){
		//playlist_title, playlist_type, info
		//params.title, params.type, params.data
		this.init();
		this.info = params.data || {};
		if (params.title){
			this.playlist_title = params.title;
		}
		if (params.type){
			this.playlist_type = params.type;
			this.updateState('nav-text', this.playlist_title);
			this.updateState('nav-title', this.playlist_title);
		}
		this.player = player;
		this.findMp3 = findMp3;
		this.findSongOwnPosition(first_song);

		this.plarow = new PlARow();
		this.plarow.init(this);


		this.changed();
		
		var _this = this;
		
		var doNotReptPl = function(state) {
			_this.updateState('dont-rept-pl', state);
		};
		if (su.settings['dont-rept-pl']){
			doNotReptPl(true);
		}
		su.on('settings.dont-rept-pl', doNotReptPl);

		this.regDOMDocChanges(function() {
			var child_ui;
			if (su.ui && su.ui.els.artsTracks){


				child_ui = _this.getFreeView(this);
				if (child_ui){
					su.ui.els.artsTracks.append(child_ui.getA());

					
					child_ui.requestAll();
				}
			}

			if (su.ui.nav.daddy){
				child_ui = _this.getFreeView(this, 'nav');
				if (child_ui){
					su.ui.nav.daddy.append(child_ui.getA());
					child_ui.requestAll();
				}
			}
		});
			
	};


	songsListBase.extendTo(songsList, {
		ui_constr: {
			main: songsListView,
			nav: playlistNavUI
		},
		page_name: 'playlist',
		getURL: function(){
			var url ='';
			if (this.playlist_type == 'artist'){
				url += '/_';
			} else if (this.playlist_type == 'album'){
				url += '/' + su.encodeURLPart(this.info.album);
			} else if (this.playlist_type == 'similar artists'){
				url += '/+similar';
			} else if (this.playlist_type == 'artists by tag'){
				url += '/tags/' + su.encodeURLPart(this.info.tag);
			} else if (this.playlist_type == 'tracks'){
				url += '/ds';
			} else if (this.playlist_type == 'artists by recommendations'){
				url += '/recommendations';
			} else if (this.playlist_type == 'artists by loved'){
				url += '/loved';
			} else if (this.playlist_type == 'cplaylist'){
				url += '/playlist/' + su.encodeURLPart(this.info.name);
			} else if (this.playlist_type == 'chart'){
				url += '/chart/' +  su.encodeURLPart(this.info.country) + '/' + su.encodeURLPart(this.info.metro);
			}
			return url;
		},
		extendSong: function(omo, player, mp3_search){
			if (!(omo instanceof song)){
				return new song(omo, this, player, mp3_search);
			} else{
				return omo;
			}
		},
		makeExternalPlaylist: function() {
			if (!this.palist.length){return false;}
			var simple_playlist = [];
			for (var i=0; i < this.palist.length; i++) {
				var song = this.palist[i].song();
				if (song){
					simple_playlist.push({
						track_title: song.track,
						artist_name: song.artist,
						duration: song.duration,
						mp3link: song.link
					});
				}
					
				
			}
			
			if (simple_playlist.length){
				this.current_external_playlist = new external_playlist(simple_playlist);
				//su.ui.els.export_playlist.attr('href', su.p.current_external_playlist.data_uri);
				if (this.current_external_playlist.result) {
					app_env.openURL(
						'http://seesu.me/generated_files/seesu_playlist.m3u?mime=m3u&content=' + escape(this.current_external_playlist.result)
					);
				}
					
			}
		}
	});
	
	



	var PlARowView = function() {};
	ActionsRowUI.extendTo(PlARowView, {
		createBase: function(c){
		//	var parent_c = this.parent_view.row_context; var buttons_panel = this.parent_view.buttons_panel;
			this.c = this.parent_view.panel;
			this.row_context = this.c.find('.pla-row-content');
			this.arrow = this.row_context.children('.rc-arrow');
			this.buttons_panel = this.c.children().children('.pla-panel');
			

		}
	});


	var PlARow = function(){};

	PartsSwitcher.extendTo(PlARow, {
		init: function(pl) {
			this._super();
			this.pl = pl;
			this.updateState('active_part', false);
			this.addPart(new MultiAtcsRow(this, pl));
			this.addPart(new PlaylistSettingsRow(this, pl));
		},
		ui_constr: PlARowView
	});





	var PlaylistSettingsRowView = function(){};
	BaseCRowUI.extendTo(PlaylistSettingsRowView, {
		"stch-dont-rept-pl": function(state) {
			this.dont_rept_pl_chbx.prop('checked', !!state);
		},
		createDetailes: function(){
			var parent_c = this.parent_view.row_context; var buttons_panel = this.parent_view.buttons_panel;
			this.c =  parent_c.children('.pla-settings');
			this.button = buttons_panel.children('.pl-settings-button');

			this.bindClick();
			//var _this = this;
			var md = this.md

			this.dont_rept_pl_chbx = this.c.find('.dont-rept-pl input').click(function() {
				md.setDnRp($(this).prop('checked'));
			});
		}
	});



	var PlaylistSettingsRow = function(actionsrow){
		this.init(actionsrow);
	};
	BaseCRow.extendTo(PlaylistSettingsRow, {
		init: function(actionsrow){
			this.actionsrow = actionsrow;
			this._super();

			var _this = this;

			var doNotReptPl = function(state) {
				_this.updateState('dont-rept-pl', state);
			};
			if (su.settings['dont-rept-pl']){
				doNotReptPl(true);
			}
			su.on('settings.dont-rept-pl', doNotReptPl);


		},
		setDnRp: function(state) {
			this.updateState('dont-rept-pl', state);
			su.setSetting('dont-rept-pl', state);
		},
		row_name: 'pl-settings',
		ui_constr: PlaylistSettingsRowView
	});



	var MultiAtcsRowView = function(){};
	BaseCRowUI.extendTo(MultiAtcsRowView, {
		createDetailes: function(){
			var parent_c = this.parent_view.row_context; var buttons_panel = this.parent_view.buttons_panel;
			this.c =  parent_c.children('.pla-row');
			this.button = buttons_panel.children('.pla-button');

			

			var _this = this;

			this.c.find(".search-music-files").click(function(){
				_this.md.actionsrow.pl.makePlayable(true);
				su.trackEvent('Controls', 'make playable all tracks in playlist');
				//
			});
			
			this.c.find('.open-external-playlist').click(function(e){
				_this.md.actionsrow.pl.makeExternalPlaylist();
				su.trackEvent('Controls', 'make *.m3u');
				//e.preventDefault();
			});


			this.bindClick();
		}
	});

	var MultiAtcsRow = function(actionsrow){
		this.init(actionsrow);
	};
	BaseCRow.extendTo(MultiAtcsRow, {
		init: function(actionsrow){
			this.actionsrow = actionsrow;
			this._super();
		},
		row_name: 'multiatcs',
		ui_constr: MultiAtcsRowView
	});



	
})();