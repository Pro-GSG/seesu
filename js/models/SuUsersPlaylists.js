define(['./UserPlaylists', 'app_serv', 'spv'], function(UserPlaylists, app_serv, spv){
"use strict";
var SuUsersPlaylists = spv.inh(UserPlaylists, {
	init: function(target) {
		target
			.on('each-playlist-change', function() {
				target.app.trackEvent('song actions', 'add to playlist');
			});

		target.app.gena = target;

		var plsts_str = app_serv.store('user_playlists');
		if (plsts_str){
			target.setSavedPlaylists(plsts_str);
		}
	}
}, {
	saveToStore: function(value) {
		app_serv.store('user_playlists', value, true);
	},
	createEnvPlaylist: function(params) {
		return this.app.createSonglist(this, params);
	}
});

return SuUsersPlaylists;
});
