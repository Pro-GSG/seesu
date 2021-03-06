define(['pv', 'spv', 'app_serv', '../comd', 'js/LfmAuth',
'./SongActPlaylisting', './SongActTaging', './SongActSharing'], function(pv, spv, app_serv, comd, LfmAuth,
SongActPlaylisting, SongActTaging, SongActSharing){
"use strict";

var pvUpdate = pv.update;

var LfmLoveIt = spv.inh(LfmAuth.LfmLogin, {
	init: function(target) {
		target.song = target.map_parent.mo;
		pv.update(target, 'active', true);
	}
}, {
	'compx-access_desc': [['#locales.lastfm-loveit-access']],
	beforeRequest: function() {
		this.bindAuthCallback();
	},
	act: function () {
		this.makeLove();
	},
	bindAuthCallback: function(){
		pvUpdate(this.app, 'lfm_auth_request', this);
	},
	makeLove: function() {

		if (this.app.lfm.sk){
			var _this = this;
			pv.update(this, 'wait_love_done', true);
			this.app.lfm.post('Track.love', {
				sk: this.app.lfm.sk,
				artist: this.song.state('artist'),
				track: this.song.state('track')
			}).then(anyway, anyway);

			function anyway(){
				pv.update(_this, 'wait_love_done', false);
				_this.trigger('love-success');
			}

			this.app.trackEvent('song actions', 'love');
		}


	}
});
var LoveRow = spv.inh(comd.BaseCRow, {
	init: function(target){
		target.actionsrow = target.map_parent;
		target.mo = target.map_parent.map_parent;

		var old_lit = null;
		var hide_on_love = function() {
			target.hide();
		};
		target.on('child_change-lfm_loveit', function(e) {
			if (old_lit) {
				old_lit.off('love-success', hide_on_love);
			}

			if (e.value) {
				e.value.on('love-success', hide_on_love);
			}
			old_lit = e.value;
		});

	}
}, {
	'nest-lfm_loveit': [LfmLoveIt, false, 'active_view'],//ver important to not init this each song selected
	model_name: 'row-love'
});








var ScrobbleRow = spv.inh(comd.BaseCRow, {
	init: function(target){
		target.actionsrow = target.map_parent;
	}
}, {
	'nest-lfm_scrobble': [LfmAuth.LfmScrobble],
	model_name: 'row-lastfm'
});





var ShuffleListRow = spv.inh(comd.BaseCRow, {
	init: function(target) {
		target.actionsrow = target.map_parent;

		target.wch(target.app, 'settings-pl-shuffle', function(e) {
			pv.update(this, 'pl_shuffle', e.value);
			pv.update(this.actionsrow.mo, 'pl-shuffle', e.value);
		});
	}
}, {
	model_name: 'row-pl-shuffle',

	switchSetting: function(state) {
		pv.update(this, 'pl_shuffle', state);
		this.app.setSetting('pl-shuffle', state);
	}


});



var RepeatSongRow = spv.inh(comd.BaseCRow, {
	init: function(target){
		target.actionsrow = target.map_parent;

		target.wch(target.app, 'settings-rept-song', function(e) {
			pv.update(this, 'rept_song', e.value);
			pv.update(this.actionsrow.mo, 'rept-song', e.value);
		});
	}
}, {
	model_name: 'row-repeat-song',
	switchSetting: function(state) {
		pv.update(this, 'rept_song', state);
		this.app.setSetting('rept-song', state);
	}
});

var constrs = [ScrobbleRow, RepeatSongRow, ShuffleListRow, SongActPlaylisting, SongActSharing, LoveRow, SongActTaging];

var parts_storage = {};
constrs.forEach(function(el) {
	parts_storage[el.prototype.model_name] = el;
});

var constrs_names= constrs.map(function(el) {
	return el.prototype.model_name;
});


var SongActionsRow = spv.inh(comd.PartsSwitcher, {
	init: function(target) {
		target.mo = target.map_parent;
		pv.update(target, 'active_part', false);
		//target.app = mo.app;
		target.inited_parts = {};

		target.nextTick(target.initHeavyPart);

		target.wch(target.map_parent, 'mp_show', target.hndSongHide);
	}
}, {
	sub_page: parts_storage,
	'nest_posb-context_parts': constrs_names,

	hndSongHide: function(e) {
		if (!e.value) {
			this.hideAll();
		}
	},
	initHeavyPart: function(target) {

		target.wch(target.app, 'settings-volume', function(e) {
			if (!e.value) {
				return;
			}
			target.setVolumeState(e.value);
		});
	},
	setVolumeState: function(fac) {
		if (!fac){
			return;
		}
		pv.update(this, 'volume', fac[0]/fac[1]);
	},
	sendVolume: function(vol) {
		this.app.setSetting('volume', vol);
	},
	setVolume: function(fac) {
		if (!fac){
			return;
		}
		pv.update(this, 'volume', fac[0]/fac[1]);
		this.sendVolume(fac);
		this.map_parent.setVolume(fac);

	}
});

return SongActionsRow;
});
