

var contextRow = function(container){
	this.m = {
		c: container.addClass('hidden'),
		active: false
	};
	this.arrow = container.children('.rc-arrow');
	this.parts = {};
	
};
contextRow.prototype = {
	getC: function(){
		return this.m.c;
	},
	addPart: function(cpart, name){
		if (name){
			this.parts[name] = {
				c: cpart.addClass('hidden'),
				d:{},
				active: false
			};
		}
		
	},
	C: function(name){
		return this.parts[name] && this.parts[name].c;
	},
	D: function(name, key, value){
		if (name && this.parts[name]){
			if (typeof value != 'undefined' && key){
				return this.parts[name].d[key] = value;
			} else if (key){
				return this.parts[name].d[key];
			}
		}
		
	},
	isActive: function(name){
		return !!this.parts[name].active;
	},
	showPart: function(name, posFn, callback){
		

		if (!this.parts[name].active){

			this.hide(true);
		
		
			this.parts[name].c.removeClass('hidden');
			this.parts[name].active = true;
			
			
			if (!this.m.active){
				this.m.c.removeClass('hidden');
				this.m.active = true;
			}
			
		}
		if (posFn){
			//used for positioning
			this.arrow.removeClass('hidden');
			var pos = posFn();
			var arrow_papos = this.arrow.offsetParent().offset();

			//.removeClass('hidden');
			this.arrow.css('left', ((pos.left + pos.owidth/2) - arrow_papos.left) + 'px');
			
		}
		
	},
	hide: function(not_itself, skip_arrow){
		if (!not_itself){
			if (this.m.active){
				this.m.c.addClass('hidden');
				this.m.active = false;
			}
			
		}
		
		for (var a in this.parts){
			if (this.parts[a].active){
				this.parts[a].c.addClass('hidden');
				this.parts[a].active = false;
			}
			
		}
		if (!skip_arrow){
			this.arrow.addClass('hidden');
		}
		
		
		
	}
};


var vkLoginUI = function() {};

provoda.View.extendTo(vkLoginUI, {
	state_change: {
		wait: function(state) {
			if (state){
				this.c.addClass("waiting-vk-login");
			} else {
				this.c.removeClass("waiting-vk-login");
			}
		},
		"request-description": function(state) {
			this.c.find('.login-request-desc').text(state || "");
		}
	},
	createBase: function() {
		this.c = this.root_view.samples.vklc.clone();
		var _this = this;
		var sign_link = this.c.find('.sign-in-to-vk').click(function(e){
			_this.md.requestAuth();
			e.preventDefault();
		});
		this.addWayPoint(sign_link, {
			canUse: function() {

			}
		});
		var input = this.c.find('.vk-code');
		var use_code_button = this.c.find('.use-vk-code').click(function() {
			var vk_t_raw = input.val();
			if (vk_t_raw){
				var vk_token = new vkTokenAuth(su.vkappid, vk_t_raw);
					connectApiToSeesu(vk_token, true);
			}
		});
		this.addWayPoint(input, {
			canUse: function() {

			}
		});

	}
});


var LfmLoginView = function() {};

provoda.View.extendTo(LfmLoginView, {
	'stch-has-session': function(state){
		if (!state){
			this.c.removeClass("hidden");
		} else {
			this.c.addClass("hidden");
		}
	},
	'stch-deep-sanbdox': function(state){
		if (state){
			this.c.addClass("deep-sandbox");
		} else {
			this.c.removeClass("deep-sandbox");
		}
	},
	'stch-wait': function(state) {
		if (state){
			this.c.addClass("waiting-lfm-auth");
		} else {
			this.c.removeClass("waiting-lfm-auth");
		}
	},
	'stch-request-description': function(state) {
		this.c.find('.lfm-auth-request-desc').text(state || "");
	},
	createBase: function() {
		this.c = this.root_view.samples.lfm_authsampl.clone();
		this.auth_block = this.c.children(".auth-block");
		var _this = this;
		var auth_link = this.auth_block.find('.lastfm-auth-bp a').click(function(e){
			_this.md.requestAuth();
			e.preventDefault();
		});
		this.addWayPoint(auth_link);
		this.code_input = this.auth_block.find('.lfm-code');
		var use_code_button = this.auth_block.find('.use-lfm-code').click(function(){
			var value = _this.code_input.val();
			if (value){
				_this.md.useCode(value);
			}
			return false;
		});
		this.addWayPoint(use_code_button);
	}
});

var LfmLoveItView = function() {};
LfmLoginView.extendTo(LfmLoveItView, {
	createBase: function() {
		this._super();
		var _this = this;
		var wrap = $('<div class="add-to-lfmfav"></div>');

		this.nloveb = this.root_view.createNiceButton();
		this.nloveb.c.appendTo(wrap);
		this.nloveb.b.click(function(){
			if (_this.nloveb._enabled){
				_this.md.makeLove();
			}
		});
		this.addWayPoint(this.nloveb.b);
		this.nloveb.b.text(localize('addto-lfm-favs'));
		this.c.append(wrap);
		
	
	},
	"stch-has-session": function(state) {
		state = !!state;
		this.c.toggleClass('has-session', state);
		this.auth_block.toggleClass('hidden', state);
		this.nloveb.toggle(state);
	},
	"stch-wait-love-done": function(state){
		this.c.toggleClass('wait-love-done', !!state);
	}
});


var LfmScrobbleView = function(){};
LfmLoginView.extendTo(LfmScrobbleView, {
	createBase: function(){
		this._super();
		this.scrobbling_switchers = this.root_view.samples.lfm_scrobling.clone().appendTo(this.c);
		this.chbx_enabl = this.scrobbling_switchers.find('.enable-scrobbling');
		this.chbx_disabl = this.scrobbling_switchers.find('.disable-scrobbling');
		var _this = this;
		

		this.chbx_enabl.click(function() {
			_this.md.setScrobbling(true);
		});
		this.chbx_disabl.click(function() {
			_this.md.setScrobbling(false);
		});
		this.addWayPoint(this.chbx_enabl, {
			simple_check: true
		});
		this.addWayPoint(this.chbx_disabl, {
			simple_check: true
		});
	},
	"stch-has-session": function(state) {
		state = !!state;
		this.c.toggleClass('has-session', state);
		this.auth_block.toggleClass('hidden', state);
		this.chbx_enabl.add(this.chbx_disabl).prop('disabled', !state);
	},
	"stch-scrobbling": function(state) {
		this.chbx_enabl.prop('checked', !!state);
		this.chbx_disabl.prop('checked', !state);
	}
});


var fileInTorrentUI = function() {};
provoda.View.extendTo(fileInTorrentUI,{
	state_change: {
		"download-pressed": function(state) {
			if (state){
				this.downloadlink.addClass('download-pressed');
			}
		},
		overstock: function(state) {
			if (state){
				this.c.addClass('overstocked');
			} else {
				this.c.removeClass('overstocked');
			}
		}
	},
	createBase: function() {
		var _this = this;
		this.c = $('<li></li>');


		$('<span class="play-button-place"></span>').appendTo(this.c);
		

		var pg = $('<span class="mf-progress"></span>');
		var f_text = $('<span class="mf-text"></span>').text(this.md.sr_item.title || getHTMLText(this.md.sr_item.HTMLTitle)).appendTo(pg);

		this.downloadlink = $('<a class="external download-song-link"></a>').click(function(e) {
			e.stopPropagation();
			e.preventDefault();
			_this.md.download();
		}).text('torrent').attr('href', this.md.sr_item.torrent_link).appendTo(this.c);

		this.addWayPoint(this.downloadlink, {
			simple_check: true
		});

		pg.appendTo(this.c);

	}
});
var songFileModelUI = function() {};
provoda.View.extendTo(songFileModelUI, {
	createDetailes: function(){
		this.createBase();

		var _this = this;

		var mf_cor_view = this.parent_view.parent_view;
		this.setVisState('p-wmss', !!mf_cor_view.state('want-more-songs'));
		mf_cor_view.on('state-change.want-more-songs', function(e){
			_this.setVisState('p-wmss', !!e.value);
		});

		var song_view = mf_cor_view.parent_view;
		this.setVisState('is-visible', !!song_view.state('mp-show-end'));
		song_view.on('state-change.mp-show-end', function(e){
			_this.setVisState('is-visible', !!e.value);
		});
		
		

	},
	state_change: {
		"unavailable": function(state) {
			if (state){
				this.c.addClass("mf-unavailable");
			} else {
				this.c.removeClass("mf-unavailable");
			}
		},
		'playing-progress': function(factor){
			//this.changeBar(this.cplayng, factor);
		},
		'loading-progress': function(factor){
			//this.changeBar(this.cloading, factor);
		},
		"buffering-progress": function(state, oldstate) {
			if (state){
				this.c.addClass('buffering-progress');
			} else if (oldstate){
				this.c.removeClass('buffering-progress');
			}
			
		},
		play: function(state, oldstate){

			if (state == 'play'){
				this.c.addClass('playing-file');
			} else {
				this.c.removeClass('playing-file');
			}
		},
		selected: function(state) {
			if (state){
				this.c.addClass('selected-mf');
			} else {
				this.c.removeClass('selected-mf');
			}
		},
		overstock: function(state) {
			if (state){
				this.c.addClass('overstocked');
			} else {
				this.c.removeClass('overstocked');
			}
		},
		"vis-loading-p": function(state){
			this.cloading.css({
				width: state
			});
			
		},
		"vis-playing-p": function(state){
			this.cplayng.css({
				width: state
			});
		},
		visible_duration: function(state) {

			if (state){
				var duration = Math.floor(state/1000);
				if (duration){
					var digits = duration % 60;
					this.duration_c.text((Math.floor(duration/60)) + ':' + (digits < 10 ? '0'+ digits : digits ));
				}
			}


		//this.title_c = $('<span></span>');
		//this.title_c.appendTo(this.c);

		},
		title: function(state) {
			this.track_title.text(state || '');
		//	.text(this.md.getTitle())
		},
		source_name: function(state) {
			this.source_name.text(state || '');
			//.text(this.md.from)
		},
		description: function(state) {
			this.track_text.attr('title', state || '');
		}
	},
	complex_states: {
		"can-progress": {
			depends_on: ['vis-is-visible', 'vis-con-appended', 'selected'],
			fn: function(vis, apd, sel){
				var can = vis && apd && sel;
				if (can){
					var _this = this;

					$(window).off('resize.song_file_progress');
					$(window).on('resize.song_file_progress', debounce(function(e){
						_this.setVisState('win-resize-time', e.timeStamp);
					}, 100));
				}
				return can;
			}
		},
		"vis-progress-c-width": {
			depends_on: ['can-progress', 'vis-p-wmss', 'vis-win-resize-time'],
			fn: function(can, p_wmss, wrsz_time){
				if (can){
					return this.progress_c.width();
				} else {
					return 0;
				}
			}
		},
		"vis-loading-p": {
			depends_on: ['vis-progress-c-width', 'loading-progress'],
			fn: function(width, factor){
				if (factor) {
					if (width){
						return Math.floor(factor * width) + 'px';
					} else {
						return (factor * 100) + '%';
					}
				} else {
					return 'auto';
				}
			}
		},
		"vis-playing-p": {
			depends_on: ['vis-progress-c-width', 'playing-progress'],
			fn: function(width, factor){
				if (factor) {
					if (width){
						return Math.floor(factor * width) + 'px';
					} else {
						return (factor * 100) + '%';
					}
				} else {
					return 'auto';
				}
			}
		}
	},
	createBase: function() {
		this.c = $('<li></li>');

		this.createPlayButton();


		var getClickPosition = function(e, node){
			//e.offsetX ||
			var pos = e.pageX - $(node).offset().left;
			return pos;
		};

		this.progress_c = $('<div class="mf-progress"></div>');
		this.c.click(function() {
			if (!_this.state('selected')){
				_this.md.trigger('want-to-play-sf');
			}
		});
		this.addWayPoint(this.c, {
			canUse: function() {
				return !_this.state('selected');
			}
		});
		this.addWayPoint(this.progress_c, {
			canUse: function() {
				return _this.state('selected');
			}
		});

		var _this = this;

		var path_points;
		var positionChange = function(){
			var last = path_points[path_points.length - 1];

			var width = _this.state('vis-progress-c-width');

			if (!width){
				console.log("no width for pb :!((");
			}
			if (width){
				_this.md.setPositionByFactor([last.cpos, width]);
			}
			
		};

		var touchDown = function(e){
			path_points = [];
			e.preventDefault();
			path_points.push({cpos: getClickPosition(e, _this.progress_c[0]), time: e.timeStamp});
			positionChange();
		};
		var touchMove = function(e){
			if (!_this.state('selected')){
				return true;
			}
			if (e.which && e.which != 1){
				return true;
			}
			e.preventDefault();
			path_points.push({cpos: getClickPosition(e, _this.progress_c[0]), time: e.timeStamp});
			positionChange();
		};
		var touchUp = function(e){
			if (!_this.state('selected')){
				return true;
			}
			if (e.which && e.which != 1){
				return true;
			}
			$(_this.progress_c[0].ownerDocument)
				.off('mouseup', touchUp)
				.off('mousemove', touchMove);

			var travel;
			if (!travel){
				//
			}


			path_points = null;

			
		};
		this.progress_c.on('mousedown', function(e){

			$(_this.progress_c[0].ownerDocument)
				.off('mouseup', touchUp)
				.off('mousemove', touchMove);

			if (!_this.state('selected')){
				return true;
			}
			if (e.which && e.which != 1){
				return true;
			}

			$(_this.progress_c[0].ownerDocument)
				.on('mouseup', touchUp)
				.on('mousemove', touchMove);

			touchDown(e);

		});
		
		this.cloading = $('<div class="mf-load-progress"></div>').appendTo(this.progress_c);
		this.cplayng = $('<div class="mf-play-progress"></div>').appendTo(this.progress_c);
		this.track_text = $('<div class="mf-text"></div>').appendTo(this.progress_c);
		this.duration_c = $('<span class="mf-duration"></span>').appendTo(this.track_text);
		this.track_title = $('<span class="main-mf-text"></span>').appendTo(this.track_text);
		this.source_name = $('<span class="mf-source"></span>').appendTo(this.track_text);
		
		this.c.append(this.progress_c);
	},
	createPlayButton: function() {
		var _this = this;

		var pb_place = $('<span class="play-button-place"></span>');
		var pc_place = $('<span class="pc-indicator big-indicator play-indicator pc-place"></span>').appendTo(pb_place);
		var button = $('<span class="pc pc-play big-control"></span>').appendTo(pc_place);
		button.click(function(e) {
			e.stopPropagation();
			if (_this.state('selected')){

				if (_this.state('play') == 'play'){
					_this.md.pause();
				} else {
					_this.md.trigger('want-to-play-sf');
					//_this.md.play();
				}
			} else {
				_this.md.trigger('want-to-play-sf');
			}
		});
		this.addWayPoint(button, {
			simple_check: true
		});

		this.c.append(pb_place);
	},
	changeBar: function(bar, factor){
		if (factor){
			if (this.width){
				bar[0].style.width = Math.floor(factor * this.width) + 'px';
			} else {
				bar[0].style.width = factor * 100 + '%';
			}
		} else {
			bar[0].style.width = 0;
		}
	},
	fixWidth: function(){
		this.width = this.progress_c.width();
	},
	fixBars: function() {
		this.fixWidth();
		this.changeBar(this.cplayng, this.state('playing-progress'));
		this.changeBar(this.cloading, this.state('loading-progress'));
	}
});




var artCardUI = function() {};

provoda.View.extendTo(artCardUI, {
	die: function() {
		this._super();
	},
	state_change: {
		"mp-show": function(opts) {
			this.c.toggleClass('hidden', !opts);
		},
		"loading-albums": function(state) {
			if (state){
				this.ui.albumsc.addClass('loading');
			} else {
				this.ui.albumsc.removeClass('loading');
			}
		},
		"loading-toptracks": function(state) {
			if (state){
				this.ui.topc.addClass('loading');
			} else {
				this.ui.topc.removeClass('loading');
			}
		},
		"loading-baseinfo": function(state) {
			var mark_loading_nodes = this.ui.tagsc.add(this.ui.bioc).add(this.ui.similarsc);

			if (state){
				mark_loading_nodes.addClass('loading');
			} else {
				mark_loading_nodes.removeClass('loading');
			}
		},
		"sorted-albums": function(ob) {
			var all_albums = Array.prototype.concat.apply([], ob.ordered);

			var _this = this;
			var albs_groups = $("<div class='albums-groups'></div>");
			for (var i=0; i < ob.ordered.length; i++) {
				var aul =  $('<ul></ul>');
				this.root_view.renderArtistAlbums(ob.ordered[i], _this.md.artist, aul, {
					source_info: {
						page_md: _this.md,
						source_name: 'artist-albums'
					},
					from_artcard: true
				});
				
				aul.appendTo(albs_groups);
			}
			albs_groups.appendTo(this.ui.albumsc);
			
			$('<a class="js-serv extends-header"></a>').text(localize("Show-all")  + " (" + all_albums.length + ")").click(function(){
				_this.ui.albumsc.toggleClass('show-all-albums');
			}).appendTo(_this.ui.albumsc.children(".row-header"));
		},
		toptracks: function(list) {
			var _this = this;
			var ul = this.ui.topc.children('ul');
			$.each(list, function(i, el){
				if (i < 5){
					if (el.track){
						var a = $('<a class="js-serv"></a>').click(function(){
							su.showTopTacks(_this.md.artist, {
								source_info: {
									page_md: _this.md,
									source_name: 'top-tracks'
								}
							}, {
								artist: _this.md.artist,
								track: el.track
							});
						}).text(el.track);
						$('<li></li>').append(a).appendTo(ul);
					}
				}
				
			});
			ul.removeClass('hidden');
		},
		images: function(images) {
			if (images[4]){
				this.ui.imagec.empty();
				this.ui.imagec.append(
					$('<img/>').attr('src', images[4])
				);
			}
		},
		tags: function(tags) {
			var ul = this.ui.tagsc.children('ul');
			$.each(tags, function(i, el){
				if (el && el.name){
					var li = $('<li></li>');
					$('<a class="js-serv"></a>').click(function(){
						su.show_tag(el.name);
					}).text(el.name).attr('url', el.url).appendTo(li);
					li.appendTo(ul);
					ul.append(' ');
				}
				
			});
			ul.removeClass('hidden');
		},
		bio: function(text) {
			if (text){
				this.ui.bioc.html(text.replace(/\n+/gi, '<br/><br/>'));
				this.root_view.bindLfmTextClicks(this.ui.bioc);
			}
		},
		similars: function(artists) {
			var _this = this;
			var ul = this.ui.similarsc.children('ul');
			$.each(artists, function(i, el){
				var li = $('<li></li>');
				$('<a class="js-serv"></a>').click(function(){
					su.showArtcardPage(el.name);
				}).text(el.name).appendTo(li);
				li.appendTo(ul);
				ul.append(' ');
				
			});
			
			var header_link = $('<a class="js-serv"></a>')
				.click(function(){
					su.showSimilarArtists(_this.md.artist, {
						source_info: {
							page_md: _this.md,
							source_name: 'similar-artists'
						},
						
						from_artcard: true
					});
				})
				.text(localize('similar-arts'));
			var header = this.ui.similarsc.children('h5').empty().append(header_link);
			
			ul.removeClass('hidden');
		}

	},
	createBase: function() {
		var _this = this;
		this.c = this.root_view.samples.artcard.clone();
		this.ui = {
			imagec: this.c.find('.art_card-image .art_card-image-padding'),
			topc: this.c.find('.top-tracks'),
			tagsc: this.c.find('.art_card-tags'),
			albumsc: this.c.find('.art_card-albums'),
			similarsc: this.c.find('.art_card-similar'),
			bioc: this.c.find('.art_card-bio')
		};
		this.top_tracks_link = $(' <a class="js-serv extends-header"></a>').text(localize('full-list')).appendTo(this.ui.topc.children('.row-header')).click(function(){
			su.showTopTacks(_this.md.artist, {
				source_info: {
					page_md: _this.md,
					source_name: 'top-tracks'
				},
				from_artcard: true
			});
		});
	}
});
