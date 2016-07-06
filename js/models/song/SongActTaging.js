define(['js/LfmAuth', 'app_serv', '../comd', 'spv', 'pv'], function(LfmAuth, app_serv, comd, spv, pv) {
"use strict";
var pvUpdate = pv.update;

var LfmTagSong = spv.inh(LfmAuth.LfmLogin, {
	init: function(target) {
		target.mo = target.map_parent.mo;

		pvUpdate(target, 'active', true);
		target.wch(target.pmd || target.map_parent, 'active_view');
		target.wch(target.app.getArtcard(target.mo.state('artist')).getTagsModel(), 'simple_tags_list', 'artist_tags');


		target.on('state_change-canload_personal', function(e) {
			if (e.value){
				target.requestState('personal_tags');
			}

		});

		target.wch(target, 'petags', function(e) {
			if (e.value) {
				if (e.value.length && !target.state('user_tags_string')) {
					pvUpdate(target, 'user_tags_string', e.value.join(', '));
				}
			}
		});

	}
}, {
	'compx-access_desc': [['#locales.lastfm-tagging-access']],
	comma_regx: /\s*\,\s*/,
	comma_regx_end: /\s*\,\s*$/,
	'compx-possible_tags':{
		depends_on: ['user_tags_string'],
		fn: function(user_tags_string) {
			if (!user_tags_string) {return [];}
			return (user_tags_string && spv.getExistingItems(user_tags_string.trim().split(this.comma_regx))).slice(0, 10) || [];
		}
	},
	'compx-petags': {
		depends_on: ['personal_tags'],
		fn: function(personal_tags) {
			return spv.filter(personal_tags, 'name');
		}
	},
	'compx-petags_result':{
		depends_on: ['petags', 'petags_fixed'],
		fn: function(petags, petags_fixed) {
			return petags_fixed || petags;
		}
	},
	'compx-tags_toadd': {
		depends_on: ['petags_result', 'possible_tags'],
		fn: function(petags_result, possible_tags) {
			return spv.arrayExclude(possible_tags, petags_result);
		}
	},
	'compx-tags_toremove': {
		depends_on: ['petags_result', 'possible_tags'],
		fn: function(petags_result, possible_tags) {
			return spv.arrayExclude(petags_result, possible_tags);

		}
	},
	'compx-has_changes': {
		depends_on: ['tags_toadd', 'tags_toremove'],
		fn: function(tags_toadd, tags_toremove) {
			return !!((tags_toadd && tags_toadd.length) || (tags_toremove && tags_toremove.length));
		}
	},
	'compx-canload_personal': {
		depends_on: ['#lfm_userid', 'active_view'],
		fn: spv.hasEveryArgs
	},
	saveTagsChanges: function() {
		var _this = this;
		var tags_toremove = this.state('tags_toremove');
		if (tags_toremove && tags_toremove.length){
			tags_toremove.forEach(function(tag) {
				var req = _this.app.lfm.post('track.removeTag', {
					sk: _this.app.lfm.sk,
					artist: _this.mo.state('artist'),
					track: _this.mo.state('track'),

					tag: tag
				});
				req.then(function() {
					var petags_result = _this.state('petags_result') || [];
					petags_result = spv.arrayExclude(petags_result, tag);

					pvUpdate(_this, 'petags_fixed', petags_result);
				});
				_this.addRequest(req);
					/*
					.always(function(){
						//pvUpdate(_this, 'wait_love_done', false);
						//_this.trigger('love-success');
					});*/
			});

		}

		var tags_toadd = this.state('tags_toadd');
		if (tags_toadd && tags_toadd.length){
			var req = _this.app.lfm.post('track.addTags', {
				sk: _this.app.lfm.sk,
				artist: _this.mo.state('artist'),
				track: _this.mo.state('track'),

				tags: tags_toadd.join(',')
			});

			req.then(function() {
				var petags_result = _this.state('petags_result');
				if (petags_result){
					petags_result = petags_result.slice();
				} else {
					petags_result = [];
				}
				petags_result.push.apply(petags_result, tags_toadd);


				pvUpdate(_this, 'petags_fixed', petags_result);
			});
			_this.addRequest(req);
				/*.always(function(){
					//pvUpdate(_this, 'wait_love_done', false);
					//_this.trigger('love-success');
				});*/

		}

		/*

		track.removeTag
		artist (Required) : The artist name
track (Required) : The track name
tag (Required) : A single user tag to remove from this track.
api_key (Required) : A Last.fm API key.
api_sig (Required) : A Last.fm method signature. See authentication for more information.
sk (Required) : A session key generated by authenticating a user via the authentication protocol.



artist (Required) : The artist name
track (Required) : The track name
tags (Required) : A comma delimited list of user supplied tags to apply to this track. Accepts a maximum of 10 tags.
api_key (Required) : A Last.fm API key.
api_sig (Required) : A Last.fm method signature. See authentication for more information.
sk (Required) : A session key generated by authenticating a user via the authentication protocol

		this.app.lfm.post('Track.love', {
			sk: this.app.lfm.sk,
			artist: this.song.state('artist'),
			track: this.song.state('track')
		})
			.always(function(){
				pvUpdate(_this, 'wait_love_done', false);
				_this.trigger('love-success');
			});*/
	},
	addTag: function(tag_name) {
		var current_tags = this.state('possible_tags');
		if (!current_tags || current_tags.indexOf(tag_name) == -1){

			var full_string = (this.state('user_tags_string') || '');
			if (current_tags && current_tags.length){
				full_string += ', ';
			}
			full_string += tag_name;

			pvUpdate(this, 'user_tags_string', full_string);
		}

		//console.log(tag_name);
	},
	changeTags: function(string) {
		pvUpdate(this, 'user_tags_string', string);
	},
	'stch-active_view': function(target, state) {
		if (state){
			target.requestState('toptags');
		}
	},
	req_map: [
		[
			['toptags'],
			function(r) {
				return [spv.toRealArray(spv.getTargetField(r, 'toptags.tag'))];
			},
			['lfm', 'get', function() {
				return ['track.getTopTags', {
					'artist': this.mo.state('artist'),
					'track': this.mo.state('track')
				}];
			}]
		],
		[
			['personal_tags'],
			function(r) {
				return [spv.toRealArray(spv.getTargetField(r, 'tags.tag'))];
			},
			['lfm', 'get', function() {
				return ['track.getTags', {
					'artist': this.mo.state('artist'),
					'track': this.mo.state('track'),
					'user': this.state('#lfm_userid')
				}, {nocache: true}];
			}]

		]
	]
});


var SongActTaging = spv.inh(comd.BaseCRow, {
	init: function(target){
		target.actionsrow = target.map_parent;
		target.mo = target.map_parent.map_parent;

		var old_tit = null;
		var hide_on_tag = function() {
			target.hide();
		};
		target.on('child_change-lfm_tagsong', function(e) {
			if (old_tit) {
				old_tit.off('tagged-success', hide_on_tag);
			}

			if (e.value) {
				e.value.on('tagged-success', hide_on_tag);
			}
			old_tit = e.value;
		});

	}
}, {
	'nest-lfm_tagsong': [LfmTagSong],
	model_name: 'row-tag'
});
return SongActTaging;

});
