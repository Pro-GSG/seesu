define(['pv', 'spv', 'app_serv', './comd', 'jquery',
'js/libs/BrowseMap', './SongsList' , 'js/common-libs/htmlencoding',
'./UserAcquaintancesLists', './SuUsersPlaylists', './user_music_lfm', './user_music_vk'],
function(pv, spv, app_serv, comd, $,
BrowseMap, SongsList, htmlencoding,
UserAcquaintancesLists, SuUsersPlaylists, user_music_lfm, user_music_vk){
"use strict";
var localize = app_serv.localize;

var UsersList = function() {};
BrowseMap.Model.extendTo(UsersList, {
	
});



var UserCard = function() {};

BrowseMap.Model.extendTo(UserCard, {
	model_name: 'usercard',
	sub_pa: {
		'vk:tracks': {
			constr: user_music_vk.VkUserTracks,
			title: localize('vk.com tracks')
		},
		'vk:friends': {
			constr: user_music_vk.VKFriendsList,
			title: localize('vk.com friends')
		},
		'playlists':{
			constr: SuUsersPlaylists
		},
		'acquaintances':{
			constr: UserAcquaintancesLists,
			title: localize("Acquaintances")
		},
		'lfm:friends': {
			constr: user_music_lfm.LfmFriendsList,
			title: localize("Last.fm friends")
		},
		'lfm:neighbours':{
			constr: user_music_lfm.LfmNeighboursList,
			title: localize("Neighbours")
		},
		'lfm:artists':{
			constr: user_music_lfm.LfmUserArtists.LfmUserArtistsForCU,
			title: localize('Artists')
		},
		'lfm:tracks':{
			constr: user_music_lfm.LfmUserTracks,
			title: localize('Tracks')
		},
		'lfm:tags':{
			constr: user_music_lfm.LfmUserTags,
			title: localize('Tags')
		},
		'lfm:albums':{
			constr: user_music_lfm.LfmUserAlbums,
			title: localize('Albums')
		}
	},
	nest: (function() {
		var result = {
			'user-playlists': ['playlists'],
			'users_acqutes': ['acquaintances'],
			'preload_list': [['vk:friends', 'lfm:tags', 'lfm:friends', 'lfm:neighbours'], true]
		};


		var networks_pages = ['vk:tracks', 'vk:friends', 'lfm:friends', 'lfm:neighbours', 'lfm:artists', 'lfm:tracks', 'lfm:tags', 'lfm:albums'];
		for (var i = 0; i < networks_pages.length; i++) {
			var cur = networks_pages[i];
			result[cur.replace(':', '__')] = [cur];
		}

		return result;
	})(),
	'compx-can_expand': [
		['^can_expand', 'for_current_user'],
		function(can_expand, for_current_user) {
			return for_current_user && can_expand;
		}
	],
	init: function() {
		this._super.apply(this, arguments);
		var _this = this;
		
		//плейлисты
		var gena = this.getSPI('playlists', true);
		var hasPlaylistCheck = function(items) {
			pv.update(_this, 'has_playlists', !!items.length);
		};
		hasPlaylistCheck(this.app.gena.playlists);
		this.app.gena.on('playlists-change', hasPlaylistCheck);
		
		return this;
	}
});
var VkUserCard = function() {};
BrowseMap.Model.extendTo(VkUserCard, {
	model_name: 'vk_usercard',
	sub_pa: {
		'tracks': {
			constr: user_music_vk.VkUserTracks,
			title: localize('Tracks')
		},
		'friends': {
			constr: user_music_vk.VKFriendsList,
			title: localize('Friends')
		}
	},
	'compx-big_desc': {
		depends_on: ['first_name', 'last_name'],
		fn: function(first_name, last_name){
			return [first_name, last_name].join(' ');
		}
	},
	'compx-p_nav_title': [
		['vk_userid'],
		function(vk_userid) {
			return 'Vk.com user: ' + vk_userid;
		}],
	'compx-nav_title': {
		depends_on: ['big_desc', 'p_nav_title'],
		fn: function(big_desc, p_nav_title){
			return (big_desc && 'Vk.com user: ' + big_desc) || p_nav_title;
		}
	},
	setProfileData: function(data) {
		/*if (data.lfm_image){
			data.lfm_image = this.app.art_images.getImageRewrap(data.lfm_image);
		}*/
		var result = {};
		for (var state in data){
			if (!this.state(state)){
				result[state] = data[state];
			}
		}

		this.updateManyStates(result);
	},
	nest: (function() {
		var result = {};

		var networks_pages = ['friends', 'tracks'];
		for (var i = 0; i < networks_pages.length; i++) {
			var cur = networks_pages[i];
			result[ 'vk__' + cur ] = [cur];
		}

		return result;

	})(),
	req_map: [
		[
			['first_name', 'last_name', 'photo', 'ava_image', 'selected_image'],
			{
				source: 'response.0',
				props_map: {

					first_name: 'first_name',
					last_name: 'last_name',
					photo: 'photo',
					'ava_image.url': 'photo_medium',
					'selected_image.url': 'photo'
				}
			},
			['vktapi', 'get', function() {
				return ['users.get', {
					user_ids: [this.state('vk_userid')],
					fields: ['id', 'first_name', 'last_name', 'sex', 'photo', 'photo_medium', 'photo_big'].join(',')
				}];
			}]
		]
	],
	'stch-mp_has_focus': function(target, state) {
		if (state){

			target.requestState('first_name', 'last_name', 'photo', 'ava_image');


			var list_to_preload = [
				target.getNesting('vk__friends')

			];
			for (var i = 0; i < list_to_preload.length; i++) {
				var cur = list_to_preload[i];
				if (cur){
					cur.preloadStart();
				}
			}
		}
	}
});

var LfmUserCard = function() {};
BrowseMap.Model.extendTo(LfmUserCard, {
	model_name: 'lfm_usercard',
	'compx-nav_title': [
		['lfm_userid'],
		function(lfm_userid) {
			return 'Last.fm user: ' + lfm_userid;
		}
	],
	nest: (function() {
		var result = {};
		var networks_pages = ['friends', 'neighbours', 'artists', 'tracks', 'tags', 'albums'];
		for (var i = 0; i < networks_pages.length; i++) {
			var cur = networks_pages[i];
			result[ 'lfm__' + cur ] = [cur];
		}

		return result;
	})(),
	sub_pa: {
		'friends': {
			constr: user_music_lfm.LfmFriendsList,
			title: localize("Friends")
		},
		'neighbours':{
			constr: user_music_lfm.LfmNeighboursList,
			title: localize('Neighbours')
		},
		'artists':{
			constr: user_music_lfm.LfmUserArtists,
			title: localize('Artists')
		},
		'tracks':{
			constr: user_music_lfm.LfmUserTracks,
			title: localize('Tracks')
		},
		'tags':{
			constr: user_music_lfm.LfmUserTags,
			title: localize('Tags')
		},
		'albums':{
			constr: user_music_lfm.LfmUserAlbums,
			title: localize('Albums')
		}
	},
	setProfileData: function(data) {
		if (data.lfm_image){
			data.lfm_image = this.app.art_images.getImageRewrap(data.lfm_image);
		}
		var result = {};
		for (var state in data){
			if (!this.state(state)){
				result[state] = data[state];
			}
		}

		this.updateManyStates(result);
	},
	'compx-big_desc': [
		['realname', 'age', 'gender', 'country'],
		function(realname, age, gender, country)  {
			var big_desc = [];
			var bide_items = [realname, age, gender, country];
			for (var i = 0; i < bide_items.length; i++) {
				if (bide_items[i]){
					big_desc.push(bide_items[i]);
				}
			}
			return big_desc.join(', ');
		}
	],
	req_map: [
		[
			['userid', 'realname', 'country', 'age', 'gender', 'playcount', 'playlists', 'lfm_img', 'registered', 'scrobblesource', 'recenttrack'],
			{
				source: 'user',
				props_map: {
					userid: 'name',
					realname: null,
					country: null,
					age: ['num', 'age'],
					gender: null,
					playcount: ['num', 'playcount'],
					playlists: ['num', 'playlists'],
					lfm_img: ['lfm_image', 'image'],
					registered: ['timestamp', 'registered'],
					scrobblesource: null,
					recenttrack: null
				}
			},
			['lfm', 'get', function() {
				return ['user.getInfo', {'user': this.state('lfm_userid')}];
			}]
		]
	],
	'stch-mp_has_focus': function(target, state) {
		if (state){
			target.requestState('realname', 'country', 'age', 'gender');
			var list_to_preload = [
				target.getNesting('lfm__tags'),
				target.getNesting('lfm__friends'),
				target.getNesting('lfm__neighbours')

			];
			for (var i = 0; i < list_to_preload.length; i++) {
				var cur = list_to_preload[i];
				if (cur){
					cur.preloadStart();
				}
			}
		}
	}
});
UserCard.LfmUserCard = LfmUserCard;
UserCard.VkUserCard = VkUserCard;

var SongListener = function() {};
pv.Model.extendTo(SongListener, {
	init: function(opts, params) {
		this.app = opts.app;
		this.userdata = params.data;
		//pv.update(this, 'picture', this.userdata.big_pic.url);
	},
	showFullPreview: function() {

	}
});

return UserCard;
});