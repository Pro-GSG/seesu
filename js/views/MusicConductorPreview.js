define(['provoda', 'jquery'], function(provoda, $) {
"use strict";

var MusicConductorPreview = function() {};
provoda.View.extendTo(MusicConductorPreview, {
	createBase: function() {
		this.c = this.root_view.els.start_screen.find('.music-conductor-preview');
		var _this = this;

		this.button = this.c.find('.area-button').removeClass('hidden');
		this.button.click(function() {
			_this.RPCLegacy('showOnMap');
		});
		this.addWayPoint(this.button);

		//this.ww_c = $('<div class="hidden"></div>').appendTo(this.c);
	},
	'stch-can_expand': function(state){
		if (state){
			this.requirePart('start-page-blocks');
		}
	},

	//'collch-allpas': 'ww_c',
	parts_builder: {
		'start-page-blocks': function() {
			var _this = this;


			var wow_tags= function(tag,c){
				var link = $('<a class="hyped-tag js-serv"></a>')
					.text(tag)
					.click(function(e){
						_this.root_view.RPCLegacy('show_tag', tag);
						su.trackEvent('Navigation', 'hyped at start page', "tag: " + tag );
						e.preventDefault();
					}).appendTo(c);
				c.append(document.createTextNode(' '));
				_this.addWayPoint(link);

			};

			if (window.lastfm_toptags && lastfm_toptags.length){
				var _c = $('<div class="block-for-startpage tags-hyped tags_list"></div>').appendTo(this.c);
				$('<h3></h3>').appendTo(_c)
								.append(localize('Pop-tags','Popular tags'));
				for (var i=0; i < lastfm_toptags.length; i++) {
					wow_tags(lastfm_toptags[i], _c);
				}
			}


			var users_play = $('<div class="block-for-startpage users-play-this"></div>').appendTo(this.c);
			var users_limit = 6;
			var showUsers = function(listenings,c, above_limit_value){
				if (listenings.length){

					var uselisteningClick = function(e) {
						var a = $(this).data('artist');
						var t = $(this).data('track');
						_this.root_view.RPCLegacy('showArtistTopTracks', a, false, {artist: a, track: t});
					};

					var uc = $('<ul></ul>');
					for (var i=0, l = Math.min(listenings.length, Math.max(users_limit, users_limit + above_limit_value)); i < l; i++) {
						var lig = listenings[i];
						if (lig.info){
							var list_item = $('<li></li>')
								.append("<div class='vk-ava'><img alt='user photo' src='" + lig.info.photo + "'/></div>");



							$('<div class="desc-row"></div>')
								.append($('<a class="external"></a>').attr('href', 'http://vk.com/id' + lig.vk_id).text(lig.info.first_name))
								.append(document.createTextNode(' ' + localize ('listening') + ' '))
								.appendTo(list_item);




							var song_complect = $('<a class="song-by-user"></a>')
								.data('artist', lig.artist)
								.data('track', lig.title)
								.attr('title',lig.artist + ' - ' + lig.title)
								.click(uselisteningClick);

							$('<span class="song-track-name"></span>').text(lig.title).appendTo(song_complect);
							$('<span class="song-artist_name"></span>').text(lig.artist).appendTo(song_complect);


							list_item.append(song_complect).appendTo(uc);

						}
					}
					uc.appendTo(c);
				}
				return Math.max(users_limit - listenings.length, 0);
			};

			var showUsersListenings = function(r){
				users_play.removeClass('loading');
				if (r && r.length){
					if ([].concat.apply([],r).length){
						users_play.empty();
						var _header = $('<h3></h3>').appendTo(users_play)
						.append(localize('User-listening','Users are listening'));

						$('<a class="js-serv"></a>').text(localize('refresh')).click(function(e){
							su.s.susd.ligs.getData();
						}).appendTo(_header);
						var above_limit_value = 0;
						for (var i=0; i < r.length; i++) {
							if (r[i] && r[i].length){
								above_limit_value = showUsers(r[i], users_play, above_limit_value);
							}
						}
					}

				}


			};
			su.s.susd.ligs.regCallback('start-page', showUsersListenings, function(){
				users_play.addClass('loading');
			});

			return true;

		}
	}
});

return MusicConductorPreview;


});