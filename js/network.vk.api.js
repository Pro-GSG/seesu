/*global create_jsonp_callback: false, cache_ajax: false, su: false, hex_md5: false, $: false, has_music_copy: false*/

/*
su.vk_api.use('execute', {code:code},function(r){console.log(r)});


var makeBigVKCodeMusicRequest = function(music_list){
	var code = 'return [';
	for (var i=0; i < alist.length; i++) {
		code += '{"query": "' + acon(alist[i] + '", "result": ' + 'API.audio.search({"count":50,"q":"' + acon(alist[i] + '"})' + '}';
		if (i != alist.length -1){
			code += ',';
		}
	};
	code+= '];'
	return code;
}*/

var auth_to_vkapi = function(vk_t, save_to_store, app_id, fallback, error_callback, callback){
	var rightnow = ((new Date()).getTime()/1000).toFixed(0);
	if (!vk_t.expires_in || (vk_t.expires_in > rightnow)){
	
		var _vkapi = new vk_api(vk_t, {
			queue: seesu.delayed_search.vk_api.queue,
			use_cache: true
		}, 
		function(info, r){
			if (info){
				if (seesu.ui && seesu.ui.samples && seesu.ui.samples.vk_login){
					seesu.ui.samples.vk_login.remove(); 
				}
				seesu.vk.id = vk_t.user_id;
				seesu.vk_api = _vkapi;
				su.mp3_search.add(_vkapi.asearch, true);
				
				console.log('got vk api');
				
				if (save_to_store){
					w_storage('vk_token_info', vk_t, true);
				}
				
				if (vk_t.expires_in){
					var end = (vk_t.expires_in - rightnow)*1000;
					if (fallback){
						var _t = detach_vkapi(_vkapi.asearch, end + 10000, true);
						setTimeout(function(){
							fallback(function(){
								clearTimeout(_t);
							});
						}, end);
					} else{
						detach_vkapi(_vkapi.asearch, end, true);
					}
				}
				
				
				var _d = {data_source: 'vkontakte'};
				for (var a in info) {
					_d[a] = info[a];
				};
				su.vk.user_info = _d;
				
				
				/*
				if (!su.distant_glow.auth || su.distant_glow.auth.id != user_api_data.viewer_id){
					su.api('user.getAuth', {
						type:'vk',
						vk_api: JSON.stringify({
							session: user_api_data,
							timeout: vk_t.expires_in
						}),
					}, function(su_sess){
						if (su_sess.secret && su_sess.sid){
							
							su.distant_glow.auth = {
								id: user_api_data.viewer_id,
								secret: su_sess.secret,
								sid: su_sess.sid
							};
							w_storage('dg_auth', su.distant_glow.auth, true);
							su.api('user.update', su.vk.user_info);
							
						}
						
					});
				} else{
					su.api('user.update', su.vk.user_info);
				}	*/			
				if (callback){callback();}
			} else{
				w_storage('vk_session'+app_id, '', true);
				error_callback('no info');
			}
			
		},function(){
			detach_vkapi(_vkapi.asearch);
			if (fallback){
				fallback(false, true);
			}
			
		});
		return _vkapi;
		
		
		
		
	} else{
		w_storage('vk_session'+app_id, '', true);
		error_callback('expired');
	}
};
var vkTokenAuth = function(vk_t_raw){
	var vk_t = JSON.parse(vk_t_raw);
	vk_t.expires_in = parseFloat(vk_t.expires_in);
	auth_to_vkapi(vk_t, true, 2271620);
};

var vk_auth_box = {
	requestAuth: function(p){
		
		this.authInit(p);
		
	},
	createAuthFrame: function(first_key){
		if (this.auth_inited){
			return false;
		}
		var i = this.auth_frame = document.createElement('iframe');	
		addEvent(window, 'message', function(e){
			if (e.data == 'vk_bridge_ready:'){
				console.log('vk_bridge_ready')
				e.source.postMessage("add_keys:" + first_key, '*');
			} else if(e.data.indexOf('vk_token:') === 0){
				vkTokenAuth(e.data.replace('vk_token:',''));
				console.log('got vk_token!!!!')
				console.log(e.data.replace('vk_token:',''));
				seesu.track_event('Auth to vk', 'end');
			}
		});
		i.className = 'serv-container';
		i.src = 'http://seesu.me/vk/bridge.html';
		document.body.appendChild(i);
		this.auth_inited = true;
	},
	getInitAuthData: function(p){
		var ru = p && p.ru;
		
		var o = {};//http://api.vkontakte.ru/oauth/authorize?client_id=2271620&scope=friends,video,offline,audio,wall&redirect_uri=http://seesu.me/vk/tr?t=14234&display=page&response_type=token
		o.link = 'http://api.' + (ru ? "vkontakte.ru" :  'vk.com') + '/oauth/authorize?client_id=2271620&scope=friends,video,offline,audio,wall&display=page&response_type=token';
		var link_tag = 'http://seesu.me/vk/callbacker.html';
		
		if (!su.env.deep_sanbdox){
			o.bridgekey = hex_md5(Math.random() + 'bridgekey'+ Math.random());
			link_tag += '?key=' + o.bridgekey;
		}
		
		
		
		o.link += '&redirect_uri=' + encodeURIComponent(link_tag);
		
		return o;
		/*
		var vkdomain = class_name.match(/sign-in-to-vk-ru/) ? 'vkontakte.ru' : 'vk.com';
		if (su.vk_app_mode){
			if (window.VK){
				VK.callMethod('showSettingsBox', 8);
			}
		} else{
			window.open('http://' + vkdomain + '/login.php?app=1915003&layout=openapi&settings=8' + '&channel=http://seesu.me/vk_auth.html');
			
		}
		*/
	},
	setAuthBridgeKey: function(key){
		if (!this.auth_inited){
			this.createAuthFrame(key)
		} else{
			this.auth_frame.contentWindow.postMessage("add_keys:" + key, '*');
		}
	},
	authInit: function(p){
		
		
		//init_auth_data.bridgekey		
		
		var init_auth_data = this.getInitAuthData(p);
		if (init_auth_data.bridgekey || !p.c){
			this.setAuthBridgeKey(init_auth_data.bridgekey);
		}  else{
			p.c.addClass('vk-finishing');
		}
		open_url(init_auth_data.link);
		seesu.track_event('Auth to vk', 'start');
		
		//dstates.add_state('body','vk-waiting-for-finish');
		
		
		return
		
	}
}



function vk_api(vk_t, params, callback, fallback, iframe){
	var p = params || {};
	if (p.use_cache){
		this.use_cache = true
	}
	this.core.setAccessToken(vk_t.access_token);
	this.user_id = vk_t.user_id;
	this.audio_collection = {};
	var _this = this;

	if (p.queue){
		this.queue = p.queue;
	}
	
	if (iframe){
		this.iframe = true;
	}
	if (!p.no_init_check){
		this.get_user_info(function(info, r){
			if(info){
				this.user_info = info;
			}
			
			if (callback){
				callback(info, r);
			}
		});
	} else{
		if (callback){
			callback();
		}
	}
	if (fallback){
		this.fallback = fallback;
	}
	this.fallback_counter = 0;
	
	this.search_source = {
		name: 'vk',
		key: this.allow_random_api ? 'rambler' : 'nice'
	};
	


	this.asearch = {
		test: function(mo){
			return canUseSearch(mo, _this.search_source);
		},
		search: function(){
			return _this.audio_search.apply(_this, arguments);
		},
		collectiveSearch: function(){
			return _this.collectAudio.apply(_this, arguments);
		},
		name: this.search_source.name,
		description: 'vkontakte.ru',
		slave: this.allow_random_api ? true: false,
		preferred: null,
		s: this.search_source,
		q: p.queue,
		getById: function(){
			return _this.getAudioById.apply(_this, arguments);
		}
	};
	
};
var vkCoreApi = function(p){
	if (p.jsonp){
		this.jsonp = true;
	}
};
vkCoreApi.prototype = {
	link: 'https://api.vk.com/method/',
	setAccessToken: function(at){
		this.access_token = at;
	},
	removeAccessToken: function(){
		delete this.access_token;	
	},
	hasAccessToken: function(){
		!!this.access_token;
	}, 
	sendRequest: function(method, params, callback, error){ //nocache, after_ajax, cache_key, only_cache
		
	
		
		if (method) {
			var _this = this;
			var	params_full = params || {};
			if (this.access_token){
				params_full.access_token = this.access_token;
			}
			//https://api.vkontakte.ru/method/wall.post?message=test&access_token=a3644920a3674f11a33856ac55a345e6952a367a3666f0b6249c010e6ac9e68
				
			var response_callback = function(r){
				if (!r.error){
					if (callback) {callback(r);}
				} else{
					if (r.error.error_code < 5){
						if (_this.fallback){ error({fallback: true, server: r.error});}
						
					} else if (r.error.error_code >= 5){
						if (error) {error({server: r.error});}
						
					}
				}
			};
			if (this.jsonp && typeof create_jsonp_callback == 'function'){
				params_full.callback = create_jsonp_callback(response_callback);
			}

			$.ajax({
			  url: this.link + method,
			  type: "GET",
			  dataType: params_full.callback ? 'script' : 'json',
			  data: params_full,
			  timeout: 20000,
			  success: !params_full.callback ? response_callback : false,
			  jsonpCallback: params_full.callback ? params_full.callback : false, 
			  error: function(xhr, text){
				if (error && xhr) {error({network: true, xhr: xhr, text: text})}
				
			  }
			});
		}
	}
};

vk_api.prototype = {
	core: new vkCoreApi({jsonp: !app_env.cross_domain_allowed}),
	use: function(method, params, callback, error, api_pipi){ //nocache, after_ajax, cache_key, only_cache
		var p = api_pipi || {};
		if (method) {
			var _this = this;			
			if (p.cache_key && typeof cache_ajax == 'object' && _this.use_cache && !p.nocache){
				var cache_used = cache_ajax.get('vk_api', p.cache_key, function(r){
					//загрузка кеша
					callback(r);
				});
				if (cache_used) {
					return true;
				}
			}
			if (p.only_cache){
				return false;
			}
			var request = function(){
				if (typeof cache_ajax == 'object' && _this.use_cache && !p.nocache){
					var cache_used = cache_ajax.get('vk_api', p.cache_key, function(r){
						//загрузка кеша
						callback(r);
					});
					if (cache_used) {
						return true;
					}
				}
				_this.core.sendRequest(method, params, function(r){
					if (p.cache_key && typeof cache_ajax == 'object'){
						cache_ajax.set('vk_api', p.cache_key, r);
						//сохранение кеша
					}
					callback(r);
					
				}, error);
				if (p.after_ajax) {p.after_ajax();}
			};
			if (_this.queue){
				return _this.queue.add(request, p.not_init_queue);
			} else{
				request();
				return true;
			}
			
			
		}
	},
	get_user_info: function(callback){
		this.use('getProfiles', {
			uids: this.user_id,
			fields: 'uid, first_name, last_name, domain, sex, city, country, timezone, photo, photo_medium, photo_big'
			
		}, function(r){
			if(callback){
				callback(r && r.response && r.response[0], r);
			}
			console.log(r);
		}, false, {nocache: true});
	},
	makeVKSong: function(cursor){
		if (cursor && cursor.url){
			return {
						artist	: HTMLDecode(cursor.artist ? cursor.artist : cursor.audio.artist),
						duration	: cursor.duration ? cursor.duration : vksong.audio.duration,
						link		: cursor.url ? cursor.url : cursor.audio.url,
						track		: HTMLDecode(cursor.title ? cursor.title : cursor.audio.title),
						from		: 'vk',
						downloadable: false,
						_id			: cursor.owner_id + '_' + cursor.aid
					
					}
		} else{
			return false;
		}
		
	},
	getAudioById: function(id, callback, error, nocache, after_ajax, only_cache){
		var _this = this;
		if (typeof su == 'object' && su.track_event){
			su.track_event('mp3 search', 'vk api', !_this.allow_random_api ? 'with auth' : 'random apis');
		}
		var used_successful = this.use('audio.getById', {audios: id}, 
		function(r){
			if (r && r.response && r.response[0]){
				var entity = _this.makeVKSong(r.response[0]);
				if (entity){
					if (callback) {callback(entity, _this.search_source);}
				} else{
					if (error) {error(_this.search_source);}
				}
			} else{
				if (error) {error(_this.search_source);}
			}
			console.log(r);
			return 
			
		}, function(xhr){
			if (error){error(_this.search_source);}
		}, {
			nocache: nocache, 
			after_ajax: after_ajax, 
			cache_key: id, 
			only_cache: only_cache,
			not_init_queue: true
		});
		return used_successful;
	},
	audioResponceHandler: function(r, callback, errorCallback){
		var _this = this;
		
			var music_list = [];
			for (var i=1, l = r.length; i < l; i++) {
				var entity = _this.makeVKSong( r[i]);
				
				if (entity && !entity.link.match(/audio\/.mp3$/) && !has_music_copy(music_list,entity)){
					music_list.push(entity);
				}
			
			
			}
			if (music_list && music_list.length){
				if (callback) {callback(music_list, _this.search_source);}
			} else{
				if (errorCallback) {errorCallback(_this.search_source);}
			}
		

		
	},
	audio_search: function(msq, callback, error, nocache, after_ajax, only_cache){
		
		var query = msq.q ? msq.q: ((msq.artist || '') + ' - ' + (msq.track || ''));
		
		var _this = this;
		var params_u = {};
			params_u.q = query;
			params_u.count = params_u.count || 30;
		
		if (typeof su == 'object' && su.track_event){
			su.track_event('mp3 search', 'vk api', !_this.allow_random_api ? 'with auth' : 'random apis');
		}
		
	
			
		var used_successful = this.use('audio.search', params_u, 
		function(r){
			if (r.response && (r.response.length > 1 )) {
				_this.audioResponceHandler(r.response, callback, error);
			} else{
				if (error) {error(_this.search_source);}
			}
			
		}, function(xhr){
			if (error){error(_this.search_source);}
		}, {
			nocache: nocache, 
			after_ajax: after_ajax, 
			cache_key: query, 
			only_cache: only_cache,
			not_init_queue: true
		});
		return used_successful;
	},
	addToAudioCollection: function(collection_key, cooperaty, last_in_collection){
		
		var _this = this;
		var c = (this.audio_collection[collection_key] || (this.audio_collection[collection_key] = []));
		var is_dublicate = false;
		for (var i=0; i < c.length; i++) {
			if (c[i].query == cooperaty.query){
				is_dublicate = true;
			}
			break
			
		};
		if (is_dublicate){
			return false;
		}
		
		clearTimeout(c.auto_send);
		
		
		if (this.getActualAudioCollectionPart(collection_key).length > 4){
			this.sendCollection(collection_key)
		}
		c.push(cooperaty);
		
		if (last_in_collection){
			this.sendCollection(collection_key)
		} else{
			
			c.auto_send = setTimeout(function(){
				_this.sendCollection(collection_key);
			},3000);
		}
		
	},
	getActualAudioCollectionPart: function(collection_key){
		var c = this.audio_collection[collection_key];
		var actual = [];
		for (var i=0; i < c.length; i++) {
			if (!c[i].disabled){
				actual.push(c[i]);
			}
			
		};
		return actual;
	},
	sendCollection: function(collection_key){
		var _this = this;
		var ac = this.getActualAudioCollectionPart(collection_key);
		if (ac.length){
			var querylist = [];
			for (var i=0; i < ac.length; i++) {
				ac[i].disabled = true;
				querylist.push(ac[i].query)
			};
			su.vk_api.use('execute', {code:this.makeBigVKCodeMusicRequest(querylist)},function(r){
				if (r && r.response && r.response.length){
					for (var i=0; i < r.response.length; i++) {
						var cursor = r.response[i];
						if (cursor.result && cursor.result.length > 1 ) {
							_this.audioResponceHandler(cursor.result, ac[i].callback);
						} 
						
					};
				}
				
			});
			
			
		}
	},
	collectAudio: function(msq, callback, error, nocache, after_ajax, only_cache){
		var query = msq.q ? msq.q: ((msq.artist || '') + ' - ' + (msq.track || ''));
		//msq.collect_for
		//msq.last_in_collection
		this.addToAudioCollection(msq.collect_for, {
			query: query,
			callback: callback,
			error: error
		}, msq.last_in_collection);
	},
	makeBigVKCodeMusicRequest: function(query_list){
		var code = 'return [';
		for (var i=0; i < query_list.length; i++) {
			code += '{"query": "' + query_list[i] + '", "result": ' + 'API.audio.search({"count":30,"q":"' + query_list[i] + '"})' + '}';
			if (i != query_list.length -1){
				code += ',';
			}
		};
		code+= '];'
		return code;
	}
};



