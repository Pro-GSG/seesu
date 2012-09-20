var song;
(function(){
	"use strict";

	var baseSong = function() {};
	provoda.extendFromTo("baseSong", mapLevelModel, baseSong);

	song = function(omo, playlist, player, mp3_search){
		this.init.call(this, omo, playlist, player, mp3_search);
		var _this = this;
		this.updateNavTexts();

		this.on('view', function(no_navi, user_want){
			su.show_track_page(this, no_navi);
			if (user_want){
				//fixme - never true!
				if (_this.wasMarkedAsPrev()){
					su.trackEvent('Song click', 'previous song');
				} else if (_this.wasMarkedAsNext()){
					su.trackEvent('Song click', 'next song');
				} else if (_this.state('play')){
					su.trackEvent('Song click', 'zoom to itself');
				}
			}
			
		});
		var actionsrow = new TrackActionsRow(this);
		this.setChild('actionsrow', actionsrow);
		this.addChild(actionsrow);

		this.mf_cor = new mfCor(this, this.omo);
		this.setChild('mf_cor', this.mf_cor);
		this.addChild(this.mf_cor);
		this.mf_cor.on('before-mf-play', function(mopla) {

			_this.player.changeNowPlaying(_this);
			_this.mopla = mopla;
		});
		this.mf_cor.on("error", function(can_play) {
			_this.player.trigger("song-play-error", _this, can_play);
		});
		
		this.watchStates(['files_search', 'marked_as'], function(files_search, marked_as) {
			if (marked_as && files_search && files_search.complete){
				this.updateState('can-expand', true);
			} else {
				this.updateState('can-expand', false);
			}
		});
		this.on('state-change.mp-show', function(e) {
			
			var
				_this = this,
				oldCb = this.makePlayableOnNewSearch;

			if (e.value){
				if (!oldCb){
					this.makePlayableOnNewSearch = function() {
						_this.makeSongPlayalbe(true);
					};
					this.mp3_search.on('new-search', this.makePlayableOnNewSearch);
					
				}
			} else {
				if (oldCb){
					this.mp3_search.off('new-search', oldCb);
					delete this.makePlayableOnNewSearch;
				}
			}
		});
	};

	baseSong.extendTo(song, {
		page_name: 'song page',
		getShareUrl: function() {
			if (this.artist && this.track){
				return "http://seesu.me/o" + "#/catalog/" + su.encodeURLPart(this.artist) + "/_/" + su.encodeURLPart(this.track);
			} else {
				return "";
			}
		},
		updateFilesSearchState: function(complete, get_next){
			this._super.apply(this, arguments);
			if (this.isHaveTracks('mp3')){
				this.plst_titl.markAsPlayable();
			}
		},
		mlmDie: function() {
			this.hide();
		},
		getURL: function(mopla){
			var url ="";
			if (mopla || this.raw()){
				var s = mopla || this.omo;
				url += "/" + su.encodeURLPart(s.from) + '/' + su.encodeURLPart(s._id);
			} else{
				if (this.plst_titl && this.plst_titl.playlist_type == 'artist'){
					if (this.track){
						url += '/' + su.encodeURLPart(this.track);
					}
				} else if (this.artist){
					url += '/' + su.encodeURLPart(this.artist) + '/' + su.encodeURLPart(this.track || '_');
				}
			}
			return url;
		},
		postToVKWall: function(uid){
			var
				data = {},
				file = this.mf_cor.getVKFile();
			if (uid){
				data.owner_id = uid;
			}
			if (file){
				data.attachments = "audio" + file._id;
			}
			
			data.message = this.state('full-title') + " " + encodeURI(this.getShareUrl());
			if (data.attachments){
				data.attachment = data.attachments;
			}

			if (window.VK){
				VK.api("wall.post", data, function() {

				});
			} else {
				

				app_env.openURL( "http://seesu.me/vk/share.html" + 
					"?" + 
					stringifyParams({app_id: su.vkappid}, false, '=', '&') + 
					"#?" + 
					stringifyParams(data, false, '=', '&'));
			}
			seesu.trackEvent('song actions', 'vk share');

			return; //su.vk_api.get("wall.post", data, {nocache: true});
			//console.log(uid);
		}
	});


	

})();
