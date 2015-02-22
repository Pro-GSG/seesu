define(['pv', 'spv', 'jquery', 'app_serv', 'js/libs/FuncsQueue', './nav', './coct' ,'./uacq',
'./StartPageView', './SearchPageView', './ArtcardUI', './ArtistListView',
'./SongsListView', './UserCardPage', './MusicConductorPage', './TagPageView' ,'./YoutubeVideoView',
'./lul', './SongcardPage', './AppBaseView', './modules/WPBox'],
function(pv, spv, $, app_serv, FuncsQueue, nav, coct, uacq,
StartPageView, SearchPageView, ArtcardUI, ArtistListView,
SongsListView, UserCardPage, MusicConductorPage, TagPageView, YoutubeVideoView,
lul, SongcardPage, AppBaseView, WPBox) {
"use strict";
var app_env = app_serv.app_env;
var localize = app_serv.localize;

var AppExposedView = function() {};
AppBaseView.BrowserAppRootView.extendTo(AppExposedView, {
	location_name: 'exposed_root_view',
	"stch-doc_title": function(title) {
		this.d.title = title || "";
	},
	'stch-playing': function(state) {
		if (app_env.need_favicon){
			if (state){
				this.changeFavicon('playing');
			} else {
				this.changeFavicon('usual');
			}
		}
	},
	changeFaviconNode: function(d, src, type) {
		var link = d.createElement('link'),
			oldLink = this.favicon_node || d.getElementById('dynamic-favicon');
		link.id = 'dynamic-favicon';
		link.rel = 'shortcut icon';
		if (type){
			link.type = type;
		}
		
		link.href = src;
		d.head.replaceChild(link, oldLink);
		this.favicon_node = link;
	},
	changeFavicon: spv.debounce(function(state){
		if (this.isAlive()){
			if (state && this.favicon_states[state]){
				this.changeFaviconNode(this.d, this.favicon_states[state], 'image/png');
			} else{
				this.changeFaviconNode(this.d, this.favicon_states['usual'], 'image/png');
			}
		}

	},300),
	favicon_states: {
		playing: 'icons/icon16p.png',
		usual: 'icons/icon16.png'
	}
});


var map_slice_by_model = {
	$default: coct.ListOfListsView,
	start_page : StartPageView,
	invstg: SearchPageView,
	artcard: ArtcardUI,
	artslist: ArtistListView,
	playlist: {
		'main': SongsListView,
		'all-sufficient-details': SongsListView.SongsListDetailedView,
	},
	vk_usercard: UserCardPage.VkUsercardPageView,
	lfm_usercard: UserCardPage.LfmUsercardPageView,
	usercard: UserCardPage,
	allplaces: coct.SimpleListOfListsView,
	mconductor: MusicConductorPage,
	tag_page: TagPageView,
	tagslist: TagPageView.TagsListPage,
	user_playlists: coct.ListOfListsView,
	songs_lists: coct.ListOfListsView,
	artists_lists: coct.ListOfListsView,
	сountries_list: coct.SimpleListOfListsView,
	city_place: coct.SimpleListOfListsView,
	cities_list: coct.SimpleListOfListsView,
	country_place: coct.ListOfListsView,
	tag_artists: coct.ListOfListsView,
	tag_songs: coct.ListOfListsView,
	youtube_video: YoutubeVideoView,
	vk_users: UserCardPage.VkUsersPageView,
	lfm_users: lul.LfmUsersPageView,
	lfm_listened_artists: coct.ListOfListsView,
	lfm_listened_tracks: coct.ListOfListsView,
	lfm_listened_albums: coct.ListOfListsView,
	lfm_listened_tags: lul.UserTagsPageView,
	vk_users_tracks: coct.ListOfListsView,
	lfm_user_tag: coct.ListOfListsView,
	user_acqs_list: uacq.UserAcquaintancesListView,
	albslist: coct.AlbumsListView,
	lula: lul.LULAPageVIew,
	lulas: lul.LULAsPageVIew,
	songcard: SongcardPage,
	justlists: coct.ListOfListsView,
	vk_posts: coct.VKPostsView,
	songcard_cloudcasts: coct.ListOfListsView,
	cloudcasts_list: coct.ListOfListsView,
	blogs_conductor: coct.ListOfListsView,
	blogs_list: coct.ListOfListsView,
	music_blog: coct.ListOfListsView,
	app_news: coct.AppNewsView
};


function BrowseLevView() {}
pv.View.extendTo(BrowseLevView, {
	children_views_by_mn: {
		pioneer: map_slice_by_model
	},
	base_tree: {
		sample_name: 'browse_lev_con'
	},
	'collch-$spec_common-pioneer': {
		by_model_name: true,
		place: 'c'
	},
	'collch-$spec_det-pioneer': {
		space: 'all-sufficient-details',
		by_model_name: true,
		place: 'c'
	},

	'collch-$spec_noplace-pioneer': {
		by_model_name: true
	},
	// 'collch-$spec_wrapped-pioneer': {
	// 	is_wrapper_parent: '^',
	// 	space: 'all-sufficient-details',
	// 	by_model_name: true,
	// 	place: 'c'
	// },
	'sel-coll-pioneer//detailed':'$spec_det-pioneer',
	'sel-coll-pioneer/start_page': '$spec_noplace-pioneer',
	// 'sel-coll-pioneer/song': '$spec_wrapped-pioneer',
	'sel-coll-pioneer': '$spec_common-pioneer',

	'compx-mp_show_end': {
		depends_on: ['animation_started', 'animation_completed', 'vmp_show'],
		fn: function(animation_started, animation_completed, vmp_show) {
			if (!animation_started){
				return vmp_show;
			} else {
				if (animation_started == animation_completed){
					return vmp_show;
				} else {
					return false;
				}
			}
		}
	}
});


function BrowseLevNavView() {}
pv.View.extendTo(BrowseLevNavView, {
	base_tree: {
		sample_name: 'brow_lev_nav'
	},
	children_views_by_mn: {
		pioneer: {
			$default: nav.baseNavUI,
			start_page: nav.StartPageNavView,
			invstg: nav.investgNavUI
		}
	},
	'collch-pioneer': {
		by_model_name: true,
		place: 'c'
	}
});

var AppView = function(){};
AppBaseView.WebComplexTreesView.extendTo(AppView, {
	/*children_views_by_mn: {
		navigation: {
			$default: nav.baseNavUI,
			start_page: nav.StartPageNavView,
			invstg: nav.investgNavUI
		}
	},*/
	'sel-coll-map_slice/song': '$spec_det-map_slice',
	children_views: {
		map_slice: {
			main: BrowseLevView,
			detailed: BrowseLevView
		},
		navigation: BrowseLevNavView
	},

	state_change: {
		"wait-vk-login": function(state) {
			this.toggleBodyClass(state, 'wait-vk-login');
		},
		"vk-waiting-for-finish": function(state){
			this.toggleBodyClass(state, 'vk-waiting-for-finish');
		},
		"slice-for-height": function(state){
			this.toggleBodyClass(state, 'slice-for-height');
		},
		"deep_sandbox": function(state){
			this.toggleBodyClass(state, 'deep-sandbox');
		},

		"search_query": function(state) {
			this.search_input.val(state || '');
		}
		
	},
	'compx-now_playing_text': {
		depends_on: ['now_playing'],
		fn: function(text) {
			return localize('now_playing','Now Playing') + ': ' + text;
		}
	},

	createDetails: function(){
		this._super();
		var _this = this;
		this.wp_box = new WPBox();
		this.wp_box.init(this, function() {
			return _this.getNesting('current_mp_md');
		}, function(waypoint) {
			_this.setVisState('current_wpoint', waypoint);
		}, function(cwp) {
			$(cwp.node).click();
			$(cwp.node).trigger('activate_waypoint');

			setTimeout(function() {
				if (_this.state('vis_current_wpoint') != cwp) {
					return;
				}
				var still_in_use = _this.wp_box.isWPAvailable(cwp);
				if (still_in_use){
					_this.scrollToWP(still_in_use);
				} else {
					_this.setVisState('current_wpoint', false);
				}
			},100);
		}, function() {
			return _this.state('vis_current_wpoint');
		}, function(wp) {
			var cur_wp = _this.state('vis_current_wpoint');
			if (cur_wp == wp) {
				_this.setVisState('current_wpoint', false);
			}
		});

		_this.dom_related_props.push('favicon_node', 'wp_box');

		this.all_queues = [];
		var addQueue = function() {
			this.reverse_default_prio = true;
			_this.all_queues.push(this);
			return this;
		};
		var resortQueue = function(queue) {
			_this.resortQueue(queue);
		};

		this.lfm_imgq = new FuncsQueue({
			time: [700],
			init: addQueue,
			resortQueue: resortQueue
		});
		this.dgs_imgq = new FuncsQueue({
			time: [1200],
			init: addQueue,
			resortQueue: resortQueue
		});

		this.dgs_imgq_alt = new FuncsQueue({
			time: [250],
			init: addQueue,
			resortQueue: resortQueue
		});


		this.on('vip_state_change-current_mp_md', function() {
			var cwp = this.state('vis_current_wpoint');
			if (cwp){
				if (cwp.canUse && !cwp.canUse()){
					_this.setVisState('current_wpoint', false);
				}
			}

		}, {skip_reg: true, immediately: true});

	},
	/*'compx-window_demensions_key': {
		depends_on: ['window_width', 'window_height'],
		fn: function(window_width, window_height) {
			return window_width + '-' + window_height;
		}
	},*/
	
	
	toggleBodyClass: function(add, class_name){
		if (add){
			this.c.addClass(class_name);
		} else {
			this.c.removeClass(class_name);
		}
	},
	
	parts_builder: {
		//samples
		alb_prev_big: function() {
			return this.els.ui_samples.children('.album_preview-big');
		},
		'song-view': function() {
			return this.els.ui_samples.children('ul').children('.song-view');
		},
		artcard: function() {
			return this.els.ui_samples.children('.art_card');
		},
		lfm_authsampl: function() {
			return this.els.ui_samples.children('.lfm-auth-module');
		},
		lfm_scrobling: function() {
			return this.els.ui_samples.children('.scrobbling-switches');
		}
	},

	buildWidthStreamer: function() {
		(function(_this) {
			var app_workplace_width_stream_node = $("#pages_area_width_streamer", _this.d);
			var awwst_win =  app_workplace_width_stream_node[0].contentWindow;
		// spv.getDefaultView(app_workplace_width_stream_node[0]);
			_this.updateManyStates({
				workarea_width: awwst_win.innerWidth
			});


			var checkWAWidth = spv.debounce(function() {
				//console.log( awwst_win.innerWidth);
				_this.updateManyStates({
					workarea_width: awwst_win.innerWidth
				});
			}, 150);

			spv.addEvent(awwst_win, 'resize', checkWAWidth);

			//$(wd).on('resize', checkWindowSizes);
			_this.onDie(function(){
				spv.removeEvent(awwst_win, 'resize', checkWAWidth);
				awwst_win = null;
				_this = null;
			});


		})(this);
	},
	buildVKSamples: function() {
		var vklc = this.els.ui_samples.children('.vk-login-context');
		var _this = this;
		spv.cloneObj(_this.samples, {
			vklc: vklc,
			vk_login: {
				o: vklc,
				oos: $(),
				hideLoadIndicator: function(){
					this.oos.removeClass('waiting-auth');
					this.load_indicator = false;
				},
				showLoadIndicator:function() {
					this.oos.addClass('waiting-auth');
					this.load_indicator = true;
				},
				remove: function(){
					this.oos.remove();
					this.oos = $();
					su.vk.wait_for_finish = false;
				},
				resetAuth: function(){
					this.oos.find('.auth-container').empty();
				},
				finishing: function(){
					su.vk.wait_for_finish = true;

					this.oos.addClass('vk-finishing');
				},
				vk_login_error: $(),
				captcha_img: $(),
				clone: function(request_description){
					var _this = this;
					var nvk = this.o.clone();
					if (su.vk.wait_for_finish){
						nvk.addClass('vk-finishing');
					}


					if (this.load_indicator){
						nvk.addClass('waiting-auth');
					}
					if (request_description){
						nvk.find('.login-request-desc').text(request_description);
					}
					var auth_c =  nvk.find('.auth-container');
					nvk.find('.sign-in-to-vk').click(function(e){
						var class_name = this.className;
						var clicked_node = $(this);

						var vkdomain = class_name.match(/sign-in-to-vk-ru/) ? 'vkontakte.ru' : 'vk.com';
						if (su.vk_app_mode){
							if (window.VK){
								VK.callMethod('showSettingsBox', 8);
							}
						} else{

							su.vk_auth.requestAuth({
								ru: class_name.match(/sign-in-to-vk-ru/) ? true: false,
								c: _this
							});

						}


						e.preventDefault();
					});
					var input = nvk.find('.vk-code');
					nvk.find('.use-vk-code').click(function() {
						var vk_t_raw = input.val();
						_this.RPCLegacy('vkSessCode', vk_t_raw);
					});

					_this.oos =  _this.oos.add(nvk);
					return nvk;
				}
			}

		});
	},
	checkSizeDetector: function() {
		var _this = this;
		if (app_env.check_resize){
			var detectSize = function(D){
				if (!D){
					return 0;
				} else {
					return $(D).outerHeight();
				}

				//return Math.max(D.scrollHeight, D.offsetHeight, D.clientHeight);
			};
			var getCurrentNode = function() {
				var current_md = _this.getNesting('current_mp_md');
				return current_md && _this.getStoredMpx(current_md).getRooConPresentation(this, true, true).getC();
			};

			var readySteadyResize = function(){
				if (_this.rsd_rz){
					clearInterval(_this.rsd_rz);
				}

				var oldsize = detectSize(getCurrentNode());
				var offset_top;


				var recheckFunc = function(){
					if (typeof documentScrollSizeChangeHandler == 'function'){
						var newsize = detectSize(getCurrentNode());

						if (oldsize != newsize){
							if (typeof offset_top == 'undefined'){
								var offset = $(getCurrentNode()).offset();
								offset_top = (offset && offset.top) || 0;
							}
							documentScrollSizeChangeHandler((oldsize = newsize) + offset_top);
						}

					}
				};

				_this.rsd_rz = setInterval(recheckFunc,100);
				_this.on('vip_state_change-current_mp_md.resize-check', function() {
					recheckFunc();
				}, {
					exlusive: true,
					immediately: true
				});
			};
			readySteadyResize();

		}
	},
	calculateScrollingViewport: function(screens_block) {
		var scrolling_viewport;

		if (screens_block.css('overflow') == 'auto') {
			scrolling_viewport = {
				node: screens_block
			};
		} else if (app_env.as_application){
			scrolling_viewport = {
				node: screens_block
			};
		} else {
			if (app_env.lg_smarttv_app){
				scrolling_viewport = {
					node: screens_block
				};
			} else {
				scrolling_viewport = {
					node: $( this.d.body ),
					offset: true
				};
			}
		}
		return scrolling_viewport;
	},
	buildNowPlayingButton: function() {
		var _this = this;
		var np_button = this.nav.justhead.find('.np-button').detach();
		_this.tpls.push( pv.$v.createTemplate( this, np_button ) );
		this.nav.daddy.append(np_button);
	},
	'stch-nav_helper_is_needed': function(state) {
		if (!state) {
			pv.update(this, 'nav_helper_full', false);
		}
	},
	tpl_events: {
		showFullNavHelper: function() {
			pv.update(this, 'nav_helper_full', true);
		}
	},
	buildNavHelper: function() {
		this.tpls.push( pv.$v.createTemplate(
			this, this.els.nav_helper
		) );
	},
	selectKeyNodes: function() {
		var slider = this.d.getElementById('slider');
		var screens_block = $( '#screens', this.d );
		var app_map_con = screens_block.children('.app_map_con');
		var scrolling_viewport = this.calculateScrollingViewport(screens_block);

		var start_screen = $( '#start-screen', this.d );


		spv.cloneObj(this.els, {
			screens: screens_block,
			app_map_con: app_map_con,
			scrolling_viewport: scrolling_viewport,
			slider: slider,
			navs: $(slider).children('.navs'),
			nav_helper: $(slider).children().children('#nav-helper'),
			start_screen: start_screen,
			pestf_preview: start_screen.children('.personal-stuff-preview')
		});

	},
	buildAppDOM: function() {
		this._super();
		var _this = this;
		var d = this.d;
		
			console.log('dom ready');

			_this.checkSizeDetector();
			_this.nextTick(_this.buildWidthStreamer);
			_this.els.search_form.find('#app_type').val(app_env.app_type);
			
			_this.wrapStartScreen(this.els.start_screen);
			$('#widget-url',d).val(location.href.replace('index.html', ''));

			if (app_env.bro.browser.opera && ((typeof window.opera.version == 'function') && (parseFloat(window.opera.version()) <= 10.1))){

				$('<a id="close-widget">&times;</a>',d)
					.click(function(){
						window.close();
					})
					.prependTo(_this.els.slider);
			}

			_this.buildVKSamples();

			_this.buildNowPlayingButton();
			_this.buildNavHelper();
			
			var d_click_callback = function(e) {
				e.preventDefault();
				app_env.openURL($(this).attr('href'));
				seesu.trackEvent('Links', 'just link');
			};

			$(d).on('click', '.external', d_click_callback);
			_this.onDie(function() {
				$(d).off('click', d_click_callback);
			});



			var kd_callback = function(e){
				if (d.activeElement && d.activeElement.nodeName == 'BUTTON'){return;}
				if (d.activeElement && d.activeElement.nodeName == 'INPUT'){
					if (e.keyCode == 27) {
						d.activeElement.blur();
						e.preventDefault();
						return;
					}
				}

				_this.arrowsKeysNav(e);
			};

			$(d).on('keydown', kd_callback);

			_this.onDie(function() {
				$(d).off('keydown', kd_callback);
			});


			_this.onDie(function() {
				_this = null;
				d = null;
			});
	},
	inputs_names: ['input'],
	key_codes_map:{
		'13': 'Enter',
		'37': 'Left',
		'39': 'Right',
		'40': 'Down',
		'63233': 'Down',
		'38': 'Up',
		'63232': 'Up'
	},
	arrowsKeysNav: function(e) {
		var
			key_name,
			_key = e.keyCode;

		var allow_pd;
		if (this.inputs_names.indexOf(e.target.nodeName.toLowerCase()) == -1){
			allow_pd = true;
		}
		key_name = this.key_codes_map[e.keyCode];

		if (key_name && allow_pd){
			e.preventDefault();
		}
		if (key_name){
			//this.RPCLegacy('keyNav', key_name);
			this.wp_box.wayPointsNav(key_name, e);
		}
	},
	scrollToWP: function(cwp) {
		if (cwp){
			var cur_md_md = this.getNesting('current_mp_md');
			var parent_md = cur_md_md.getParentMapModel();
			if (parent_md && cwp.view.getAncestorByRooViCon('main') == this.getStoredMpx(parent_md).getRooConPresentation(this)){
				this.scrollTo($(cwp.node), {
					node: this.getLevByNum(parent_md.map_level_num).scroll_con
				}, {vp_limit: 0.6, animate: 117});
			}
			this.scrollTo($(cwp.node), false, {vp_limit: 0.6, animate: 117});
		}
	},
	'stch-vis_current_wpoint': function(nst, ost) {
		if (ost){
			$(ost.node).removeClass('surf_nav');
		}
		if (nst) {
			$(nst.node).addClass('surf_nav');
			//if (nst.view.getRooConPresentation(this) ==)

			this.scrollToWP(nst);

			//
		}
	},
	
	appendStyle: function(style_text){
		//fixme - check volume ondomready
		var style_node = this.d.createElement('style');
			style_node.setAttribute('title', 'button_menu');
			style_node.setAttribute('type', 'text/css');

		if (!style_node.styleSheet){
			style_node.appendChild(this.d.createTextNode(style_text));
		} else{
			style_node.styleSheet.cssText = style_text;
		}

		this.d.documentElement.firstChild.appendChild(style_node);

	},
	verticalAlign: function(img, opts){
		//target_height, fix
		var real_height = opts.real_height || (img.naturalHeight ||  img.height);
		if (real_height){
			var offset = (opts.target_height - real_height)/2;

			if (offset){
				if (opts.animate){
					$(img).animate({'margin-top':  offset + 'px'}, opts.animate_time || 200);
				} else {
					$(img).css({'margin-top':  offset + 'px'});
				}

			}
			return offset;
		}
	},
	preloadImage: function(src, alt, callback, place){
		var image = document.createElement('img');
		if (alt){
			image.alt= alt;
		}

		image.onload = function(){
			if (callback){
				callback(image);
			}
		};
		if (place){
			$(place).append(image);
		}
		image.src = src;
		if (image.complete){
			setTimeout(function(){
				if (callback){
					callback(image);
				}
			}, 10);

		}
		return image;
	},
	getAcceptedDesc: function(rel){
		var link = rel.info.domain && ('https://vk.com/' + rel.info.domain);
		if (link && rel.info.full_name){
			return $('<a class="external"></a>').attr('href', link).text(rel.info.full_name);
		}  else if (rel.item.est){
			return $("<span class='desc'></span>").text(su.getRemainTimeText(rel.item.est, true));
		}
	},
	

	create_youtube_video: function(id){
		var youtube_video = document.createElement('embed');
		if (!app_env.chrome_like_ext){
			if (app_env.opera_widget){
				youtube_video.setAttribute('wmode',"transparent");
			} else if (app_env.opera_extension){
				youtube_video.setAttribute('wmode',"opaque");
			}
		}
		

		youtube_video.setAttribute('type',"application/x-shockwave-flash");
		youtube_video.setAttribute('src', 'https://www.youtube.com/v/' + id + '&autoplay=1');
		youtube_video.setAttribute('allowfullscreen',"true");
		youtube_video.setAttribute('class',"you-tube-video");

		return youtube_video;
	},
	bindLfmTextClicks: function(con) {
		con.on('click', 'a', function(e) {
			var node = $(this);
			var link = node.attr('href');
			if (node.is('.bbcode_artist')){
				e.preventDefault();

				var artist_name = decodeURIComponent(link.replace('http://www.last.fm/music/','').replace(/\+/g, ' '));
				su.showArtcardPage(artist_name);
				seesu.trackEvent('Artist navigation', 'bbcode_artist', artist_name);
			} else if (node.is('.bbcode_tag')){
				e.preventDefault();

				var tag_name = decodeURIComponent(link.replace('http://www.last.fm/tag/','').replace(/\+/g, ' '));
				su.show_tag(tag_name);
				seesu.trackEvent('Artist navigation', 'bbcode_tag', tag_name);
			} else {
				e.preventDefault();
				app_env.openURL(link);
				seesu.trackEvent('Links', 'just link');
			}
		});

	},
	loadImage: function(opts) {
		if (opts.url){
			var queue;
			if (opts.url.indexOf('last.fm') != -1){
				queue = this.lfm_imgq;
			} else if (opts.url.indexOf('discogs.com') != -1) {
				queue = this.dgs_imgq;
			} else if (opts.url.indexOf('http://s.pixogs.com') != -1) {
				queue = this.dgs_imgq_alt;
			}
			opts.timeout = opts.timeout || 40000;
			opts.queue = opts.queue || queue;
			return app_serv.loadImage(opts);
		}
	},
	createNiceButton: function(position){
		var c = $('<span class="button-hole"><a class="nicebutton"></a></span>');
		var b = c.children('a');

		if (position == 'left'){
			c.addClass('bposition-l');
		} else if (position == 'right'){
			c.addClass('bposition-r');
		}

		var bb = {
			c: c,
			b: b,
			_enabled: true,
			enable: function(){
				if (!this._enabled){
					this.b.addClass('nicebutton').removeClass('disabledbutton');
					this.b.data('disabled', false);
					this._enabled = true;
				}
				return this;

			},
			disable: function(){
				if (this._enabled){
					this.b.removeClass('nicebutton').addClass('disabledbutton');
					this.b.data('disabled', true);
					this._enabled = false;
				}
				return this;
			},
			toggle: function(state){
				if (typeof state != 'undefined'){
					if (state){
						this.enable();
					} else {
						this.disable();
					}
				}

			}
		};
		bb.disable();
		return bb;
	}
});

AppView.AppExposedView = AppExposedView;
return AppView;
});
