define(function(require) {
'use strict';

var pv = require('pv');
var spv = require('spv');
var FuncsQueue = require('./libs/FuncsQueue');
var net_apis = require('./modules/net_apis');
var SeesuServerAPI = require('./SeesuServerAPI');
var ScApi = require('./libs/ScApi');
var ProspApi = require('./libs/ProspApi');
var torrent_searches = require('./modules/torrent_searches');

var LastfmAPIExtended = require('./libs/LastfmAPIExtended');

var VkApi = require('./libs/VkApi');
var initVk = require('./modules/initVk');

var $ = require('jquery');

var StartPage = require('./models/StartPage');

return function(self, app_serv, app_env, cache_ajax, resortQueue) {
	self.all_queues = [];

	var addQueue = function() {
		this.reverse_default_prio = true;
		self.all_queues.push(this);
		return this;
	};

	self.vk = {};
	var lfm = initLfm(self, app_serv, app_env, cache_ajax, resortQueue, addQueue);
	self.lfm = lfm;
	initAPIs(self, app_serv, app_env, cache_ajax, resortQueue, addQueue);
};


function initAPIs(self, app_serv, app_env, cache_ajax, resortQueue, addQueue) {

	self.lfm_auth = self.initChi('lfm_auth', {lfm: self.lfm}, {
		deep_sanbdox: app_env.deep_sanbdox,
		callback_url: 'http://seesu.me/lastfm/callbacker.html',
		bridge_url: 'http://seesu.me/lastfm/bridge.html'
	});

	self.lfm_auth.once("session", function() {
		self.setSetting('lfm-scrobbling', true);
		//self.auth.setScrobbling(true);
	});

	self.vk_auth = self.initChi('vk_auth', false, {
		app_id: self.vkappid,
		urls: {
			bridge: 'http://seesu.me/vk/bridge.html',
			callbacker: 'http://seesu.me/vk/callbacker.html'
		},
		permissions: ["friends", "video", "offline", "audio", "wall", "photos"],
		open_api: false,
		deep_sanbdox: app_env.deep_sanbdox,
		vksite_app: app_env.vkontakte,
		vksite_settings: self._url.api_settings,
		display_type: app_env.tizen_app && 'mobile'
	});

	self.auths = {
		lfm: self.lfm_auth,
		vk: self.vk_auth
	};

	self.once("vk-site-api", function() {
		window.documentScrollSizeChangeHandler = function(height){
			window.VK.callMethod("resizeWindow", 800, Math.max(700, height));
		};
		self.vk_auth.trigger('vk-site-api', window.VK);
	});

	self.vk_queue = new FuncsQueue({
		time: [700, 8000 , 7],
		resortQueue: resortQueue,
		init: addQueue
	});

	self.vk_open_api = new VkApi(null, {
		queue: self.vk_queue,
		jsonp: !app_env.cross_domain_allowed,
		cache_ajax: cache_ajax
	});
	self.vktapi = self.vk_open_api;


	self.hypem = new net_apis.HypemApi();
	self.hypem.init({
		xhr2: app_env.xhr2,
		crossdomain: app_env.cross_domain_allowed,
		cache_ajax: cache_ajax,
		queue: new FuncsQueue({
			time: [1700, 4000, 4],
			resortQueue: resortQueue,
			init: addQueue
		})
	});
	self.goog_sc = new net_apis.GoogleSoundcloud();
	self.goog_sc.init({
		crossdomain: app_env.cross_domain_allowed,
		cache_ajax: cache_ajax,
		queue: new FuncsQueue({
			time: [1000, 3000, 4],
			resortQueue: resortQueue,
			init: addQueue
		})
	});
	self.discogs = new net_apis.DiscogsApi();
	self.discogs.init({
		crossdomain: app_env.cross_domain_allowed,
		cache_ajax: cache_ajax,
		queue: new FuncsQueue({
			time: [2000, 4000, 4],
			resortQueue: resortQueue,
			init: addQueue
		}),

		key: app_serv.getPreloadedNK('dgs_key'),
		secret: app_serv.getPreloadedNK('dgs_secret')
	});

	self.mixcloud = new net_apis.MixcloudApi();
	self.mixcloud.init({
		crossdomain: app_env.cross_domain_allowed,
		cache_ajax: cache_ajax,
		queue: new FuncsQueue({
			time: [2000, 4000, 4],
			resortQueue: resortQueue,
			init: addQueue
		})
	});






	self.s  = new SeesuServerAPI(self, app_serv.store('dg_auth'), self.server_url);
	pv.update(self, 'su_server_api', true);

	self.s.on('info-change-vk', function(data) {
		pv.update(self, 'vk_info', data);
		pv.update(self, 'vk_userid', data && data.id);
	});

	self.on('vk-api', function(vkapi, user_id) {
		if (vkapi) {
			self.getAuthAndTransferVKInfo(vkapi, user_id);
		}

	});





	var reportSearchEngs = spv.debounce(function(string){
		self.trackVar(4, 'search', string, 1);
	}, 300);

	self.mp3_search.on('list-changed', function(list){
		list = spv.filter(list, 'name').sort();
		for (var i = 0; i < list.length; i++) {
			list[i] = list[i].slice(0, 2);
		}
		reportSearchEngs(list.join(','));
	});

	self.updateNesting('lfm_auth', self.lfm_auth);

	if (self.lfm.username){
		pv.update(self, 'lfm_userid', self.lfm.username);
	} else {
		// self.lfm_auth.on('session', function() {
		// 	pv.update(self, 'lfm_userid', self.lfm.username);
		// });
	}


	self.lfm_auth.on('session', function(){
		self.trackEvent('Auth to lfm', 'end');
	});
	self.lfm_auth.on('want-open-url', function(wurl){
		if (app_env.showWebPage){
			app_env.openURL(wurl);
			/*
			var opend = app_env.showWebPage(wurl, function(url){
				var path = url.split('/')[3];
				if (!path || path == 'home'){
					app_env.clearWebPageCookies();
					return true
				} else{
					var sb = 'http://seesu.me/lastfm/callbacker.html';
					if (url.indexOf(sb) == 0){
						var params = get_url_parameters(url.replace(sb, ''));
						if (params.token){
							self.lfm_auth.setToken(params.token);

						}
						app_env.clearWebPageCookies();
						return true;
					}
				}

			}, function(e){
				app_env.openURL(wurl);

			}, 960, 750);
			if (!opend){
				app_env.openURL(wurl);
			}
			*/
		} else{
			app_env.openURL(wurl);
		}
		self.trackEvent('Auth to lfm', 'start');

	});
	spv.domReady(window.document, function() {
		self.lfm_auth.try_to_login();
		if (!self.lfm.sk) {
			self.lfm_auth.get_lfm_token();

		}
	});

	moreApis(self, app_serv, app_env, cache_ajax, resortQueue, addQueue);
}


function initLfm(su, app_serv, app_env, cache_ajax, resortQueue, addQueue) {
	var lfm = new LastfmAPIExtended();

	lfm.init(app_serv.getPreloadedNK('lfm_key'), app_serv.getPreloadedNK('lfm_secret'), function(key){
		return app_serv.store(key);
	}, function(key, value){
		return app_serv.store(key, value, true);
	}, cache_ajax, app_env.cross_domain_allowed, new FuncsQueue({
		time: [700],
		resortQueue: resortQueue,
		init: addQueue
	}));

	lfm.checkMethodResponse = function(method, data, r) {
		su.art_images.checkLfmData(method, r);
	};

	return lfm;
}


function moreApis(su, app_serv, app_env, cache_ajax, resortQueue, addQueue){
	spv.domReady(window.document, function() {
		domPart(su, app_serv);
	});

	//su.sc_api = sc_api;
	su.sc_api = new ScApi(app_serv.getPreloadedNK('sc_key'), new FuncsQueue({
		time: [3500, 5000 , 4],
		resortQueue: resortQueue,
		init: addQueue
	}), app_env.cross_domain_allowed, cache_ajax);
	su.mp3_search.add(new ScApi.ScMusicSearch({
		api: su.sc_api,
		mp3_search: su.mp3_search
	}));


	if (app_env.cross_domain_allowed) {
		su.mp3_search.add(new ProspApi.ProspMusicSearch({
			api: new ProspApi(new FuncsQueue({
				time: [3500, 5000, 4],
				resortQueue: resortQueue,
				init: addQueue
			}), app_env.cross_domain_allowed, cache_ajax),
			mp3_search: su.mp3_search
		}));
	}

	/*var exfm_api = new ExfmApi(new FuncsQueue({
		time: [3500, 5000, 4],
		resortQueue: resortQueue,
		init: addQueue
	}), app_env.cross_domain_allowed, cache_ajax);
	su.exfm = exfm_api;

	su.mp3_search.add(new ExfmApi.ExfmMusicSearch({
		api: exfm_api,
		mp3_search: su.mp3_search
	}));
	*/

	if (app_env.nodewebkit) {
		requirejs(['js/libs/TorrentsAudioSearch'], function(TorrentsAudioSearch) {
			su.mp3_search.add(new TorrentsAudioSearch({
				cache_ajax: cache_ajax,
				queue: new FuncsQueue({
					time: [100, 150, 4],
					resortQueue: resortQueue,
					init: addQueue
				}),
				mp3_search: su.mp3_search,
				torrent_search: new torrent_searches.BtdiggTorrentSearch({
					queue: new FuncsQueue({
						time: [3500, 5000, 4],
						resortQueue: resortQueue,
						init: addQueue
					}),
					cache_ajax: cache_ajax,
					mp3_search: su.mp3_search
				})
			}));

		});
	} else {
		var allow_torrents = false || app_env.nodewebkit;

		if (allow_torrents && !(app_env.chrome_app || app_env.chrome_ext || app_env.tizen_app)){
			if (app_env.torrents_support) {
				su.mp3_search.add(new torrent_searches.BtdiggTorrentSearch({
					queue: new FuncsQueue({
						time: [3500, 5000, 4],
						resortQueue: resortQueue,
						init: addQueue
					}),
					cache_ajax: cache_ajax,
					mp3_search: su.mp3_search
				}));
			} else if (app_env.cross_domain_allowed){
				su.mp3_search.add(new torrent_searches.isohuntTorrentSearch({
					cache_ajax: cache_ajax,
					mp3_search: su.mp3_search
				}));
			} else {
				su.mp3_search.add(new torrent_searches.googleTorrentSearch({
					crossdomain: app_env.cross_domain_allowed,
					mp3_search: su.mp3_search,
					cache_ajax: cache_ajax
				}));
			}
		}
	}
}


function domPart(su, app_serv){
	initVk(su);
	su.checkUpdates();
	var queue = new FuncsQueue({
		time: [700]
	});
	queue.add(function() {
		createDatastreamIframe('https://arestov.github.io/su_news_iframe/', app_serv, function(data) {
			if (!data) {
				return;
			}
			pv.update(su.start_page.getNesting('news'), 'news_list', StartPage.AppNews.converNews(data));
		});
	});
	queue.add(function() {
		createDatastreamIframe('https://arestov.github.io/su_blocked_music/', app_serv, function(data) {
			if (!data) {
				return;
			}

			var index = {};
			for (var artist in data) {
				var lc_artist = artist.toLowerCase();
				if (data[artist] === true) {
					index[lc_artist] = true;
					continue;
				}

				var lindex = index[lc_artist] = (index[lc_artist] || {});
				for (var i = 0; i < data[artist].length; i++) {
					var cur = data[artist][i];
					if (!cur || typeof cur !== 'string') {
						continue;
					}

					lindex[ lc_artist ][ data[artist][i].toLowerCase() ] = true;

				}

			}
			//forbidden_by_copyrh
			//white_of_copyrh
			pv.update(su, 'forbidden_by_copyrh', index);
		});
	});
	queue.add(function(){
		if (app_serv.app_env.nodewebkit) {
			createDatastreamIframe('https://arestov.github.io/su_update_iframe/', app_serv, function(data) {
				if (!data) {
					return;
				}
				if (data.last_ver && data.last_ver > seesu_version && data.package_url) {
					var dir_files = global.require('fs').readdirSync(
						global.require('path').resolve(global.require('nw.gui').App.manifest.main, '..')
					);
					if (dir_files.indexOf('.git') == -1) {
						global.require('nodejs/update-receiver')(data.package_url, seesu_version);
					}

					//var
				}
			});
		}
	});
}

function createDatastreamIframe(url, app_serv, callback, allow_exec) {
	var iframe = window.document.createElement('iframe');
	spv.addEvent(window, 'message', function(e) {
		if (e.source == iframe.contentWindow) {
			callback(e.data);
		}
	});
	if (app_serv.app_env.nodewebkit) {
		iframe.nwdisable = !allow_exec;
		iframe.nwfaketop = !allow_exec;

	}
	$(iframe).css({
		position: 'absolute',
		width: '1px',
		height: '1px',
		visibility: 'hidden',
		'z-index': -10
	});
	iframe.src = url;
	$(window.document.body).append(iframe);
}


});
