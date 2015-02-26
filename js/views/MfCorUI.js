define(['pv', 'jquery', 'spv', './etc_views'], function(pv, $, spv, etc_views) {
"use strict";

var notifyCounterUI = function() {};
pv.View.extendTo(notifyCounterUI, {
	createBase: function() {
		this.c = $('<span class="notifier hidden"></span>');
	},
	state_change: {
		counter: function(state) {
			this.c.toggleClass('hidden', !state);
		}
	}
});
var FileIntorrentPromiseUI = function(){};
pv.View.extendTo(FileIntorrentPromiseUI, {
	'stch-infoHash': function(state) {
		this.c.text(state);
	},
	createBase: function(){
		this.c = $('<li></li>');
	}
});

var FileInTorrentUI = function() {};
pv.View.extendTo(FileInTorrentUI,{
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
		},
		'full_title': function(state) {
			this.f_text.text(state);

		},
		'torrent_link': function(state) {
			this.downloadlink.attr('href', state);
		}
	},
	createBase: function() {
		var _this = this;
		this.c = $('<li></li>');


		$('<span class="play-button-place"></span>').appendTo(this.c);
		

		var pg = $('<span class="mf-progress"></span>');
		this.f_text = $('<span class="mf-text"></span>').appendTo(pg);

		this.downloadlink = $('<a class="external download-song-link"></a>').click(function(e) {
			e.stopPropagation();
			e.preventDefault();
			_this.RPCLegacy('download');
		}).text('torrent').appendTo(this.c);

		this.addWayPoint(this.downloadlink, {
			
		});

		pg.appendTo(this.c);

	}
});
var SongFileModelUI = function() {};
pv.View.extendTo(SongFileModelUI, {
	dom_rp: true,
	getProgressWidth: function() {
		return this.tpl.ancs['progress_c'].width();
	},
	'stch-key-progress-c-width': function(state) {
		if (state) {
			pv.update(this, 'vis_progress-c-width', this.getBoxDemensionByKey(this.getProgressWidth, state));
		} else {
			pv.update(this, 'vis_progress-c-width', 0);
		}
	},
	complex_states: {
		"can-progress": {
			depends_on: ['^^vis_is_visible', 'vis_con_appended', 'selected'],
			fn: function(vis, apd, sel){
				var can = vis && apd && sel;
				return can;
			}
		},
		'vis_wp_usable': {
			depends_on: ['overstock', '^^want_more_songs', '^show_overstocked'],
			fn: function(overstock, pp_wmss, p_show_overstock) {

				if (overstock){
					return pp_wmss && p_show_overstock;
				} else {
					return pp_wmss;
				}

			}
		},
		'key-progress-c-width': [
			['can-progress', '^^want_more_songs', '#workarea_width', '^^must_be_expandable'],
			function (can, p_wmss, workarea_width, must_be_expandable) {
				if (can) {
					return this.getBoxDemensionKey('progress_c-width', workarea_width, !!p_wmss, !!must_be_expandable);
				} else {
					return false;
				}
			}
		],

		"vis_loading_p": {
			depends_on: ['vis_progress-c-width', 'loading_progress'],
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
		"vis_playing_p": {
			depends_on: ['vis_progress-c-width', 'playing_progress'],
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
	base_tree: {
		sample_name: 'song-file'
	},
	expandBase: function() {


		var progress_c = this.tpl.ancs['progress_c'];

		var _this = this;

		var path_points;
		var positionChange = function(){
			var last = path_points[path_points.length - 1];

			var width = _this.state('vis_progress-c-width');

			if (!width){
				console.log("no width for pb :!((");
			}
			if (width){
				_this.RPCLegacy('setPositionByFactor', [last.cpos, width]);
			}
		};
		var getClickPosition = function(e, node){
			//e.offsetX ||
			var pos = e.pageX - $(node).offset().left;
			return pos;
		};

		var touchDown = function(e){
			path_points = [];
			e.preventDefault();
			path_points.push({cpos: getClickPosition(e, progress_c[0]), time: e.timeStamp});
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
			path_points.push({cpos: getClickPosition(e, progress_c[0]), time: e.timeStamp});
			positionChange();
		};
		var touchUp = function(e){
			if (!_this.state('selected')){
				return true;
			}
			if (e.which && e.which != 1){
				return true;
			}
			$(progress_c[0].ownerDocument)
				.off('mouseup', touchUp)
				.off('mousemove', touchMove);

			var travel;
			if (!travel){
				//
			}


			path_points = null;

		};
		progress_c.on('mousedown', function(e){

			$(progress_c[0].ownerDocument)
				.off('mouseup', touchUp)
				.off('mousemove', touchMove);

			if (!_this.state('selected')){
				return true;
			}
			if (e.which && e.which != 1){
				return true;
			}

			$(progress_c[0].ownerDocument)
				.on('mouseup', touchUp)
				.on('mousemove', touchMove);

			touchDown(e);

		});

	},
	tpl_events: {
		'selectFile': function() {
			if (!this.state('selected')){
				this.RPCLegacy('requestPlay', pv.$v.getBwlevId(this));
				// this.RPCLegacy('trigger', 'want-to-play-sf');
			}
		},
		'switchPlay': function(e) {
			// var _this = this;
			e.stopPropagation();
			
			this.RPCLegacy('switchPlay', pv.$v.getBwlevId(this));
			// this.
			// if (_this.state('selected')){

			// 	if (_this.state('play') == 'play'){
			// 		_this.RPCLegacy('pause');
			// 	} else {
			// 		_this.RPCLegacy('trigger', 'want-to-play-sf');
			// 		//_this.RPCLegacy('play');
			// 	}
			// } else {
			// 	_this.RPCLegacy('trigger', 'want-to-play-sf');
			// }
		}
	}
});


var FilesSourceTunerView = function(){};
pv.View.extendTo(FilesSourceTunerView, {
	tpl_events: {
		changeTune: function(e, node){
			var tune_name = node.name;
			this.overrideStateSilently(tune_name, node.checked);
			this.RPCLegacy('changeTune', tune_name, node.checked);
			
			//disable_search
			//wait_before_playing
			//changeTuneconsole.log(arguments);

		}
	}
});


var ComplectPionerView = function(){};
pv.View.extendTo(ComplectPionerView, {
	children_views: {
		vis_tuner: FilesSourceTunerView
	}
});




var mfComplectUI = function() {};
pv.View.extendTo(mfComplectUI, {
	children_views: {
		'pioneer': ComplectPionerView
	},
	children_views_by_mn: {
		moplas_list_start: {
			'file-torrent-promise': FileIntorrentPromiseUI,
			'file-torrent': FileInTorrentUI,
			'file-http': SongFileModelUI
		},
		moplas_list_end: {
			'file-torrent-promise': FileIntorrentPromiseUI,
			'file-torrent': FileInTorrentUI,
			'file-http': SongFileModelUI
		}
	},
	'collch-moplas_list_start': {
		place: 'tpl.ancs.listc-start',
		by_model_name: true
	},
	'collch-moplas_list_end': {
		place: 'tpl.ancs.listc-end',
		by_model_name: true
	}
});

var YoutubePreview = function() {};
pv.View.extendTo(YoutubePreview, {
	createBase: function() {
		var li = $('<li class="you-tube-video-link"></li>');
		this.c = li;
		var _this = this;

		this.c.click(function(e){
			e.stopPropagation();
			e.preventDefault();
			_this.RPCLegacy('requestVideo');
			
			
		});

		this.user_link = $("<a class='video-preview external'></a>").appendTo(li);

		this.addWayPoint(li);
	},
	remove: function() {
		this._super();
		this.user_link = $();
	},
	'stch-nav_title': function(state) {
		this.c.attr('title', state || "");
	},
	'stch-cant_show': function(state) {
		this.c.toggleClass('cant-show', !!state);
	},
	'stch-yt_id': function(state) {
		var link = 'http://www.youtube.com/watch?v=' + state;
		this.user_link.attr('href', link);
	},
	'stch-previews': function(thmn) {
		var imgs = $();

		if (thmn.start && thmn.middle &&  thmn.end){
			$.each(["start","middle","end"], function(i, el) {

				var span = $("<span class='preview-slicer'></span>");

				$('<img  alt=""/>').addClass('preview-part preview-' + el).attr('src', thmn[el]).appendTo(span);

				imgs = imgs.add(span);
				span = null;

			});
		} else {
			imgs.add($('<img  alt="" class="whole"/>').attr('src', thmn['default']));
		}
		this.user_link.empty().append(imgs);
		imgs = null;
						
	}
});


var MfCorUI = function() {};
pv.View.extendTo(MfCorUI, {
	children_views:{
		notifier: notifyCounterUI,
		vk_auth: etc_views.VkLoginUI,
		sorted_completcs: mfComplectUI,
		yt_videos: YoutubePreview
	},
	'collch-vk_auth': {
		place: 'tpl.ancs.messages_c',
		strict: true
	},
	'collch-yt_videos': 'tpl.ancs.video_list',
	// bindBase: function() {
	// 	//this.createTemplate();
	// 	var _this = this;
	// 	this.tpl.ancs.more_songs_b.click(function() {
	// 		_this.RPCLegacy('switchMoreSongsView');
	// 	});
	// 	this.addWayPoint(this.tpl.ancs.more_songs_b);
	// },
	'compx-vis_is_visible':{
		'depends_on': ['^^^mp_show_end'],
		fn: function(mp_show_end) {
			return !!mp_show_end;
		}
	},
	// base_tree: {
	// 	sample_name: 'moplas-block'
	// }
});

return MfCorUI;

});