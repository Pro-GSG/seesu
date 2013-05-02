define(['provoda', 'jquery', './SongUI', './songsListViewBase', './etc_views', 'app_serv'], function(provoda, $, SongUI, slbase, etc_views, app_serv) {
	"use strict";
	var songsListView;
	var localize = app_serv.localize;
	var PlaylistSettingsRowView = function(){};
	etc_views.BaseCRowUI.extendTo(PlaylistSettingsRowView, {
		"stch-dont_rept_pl": function(state) {
			this.dont_rept_pl_chbx.prop('checked', !!state);
		},
		createDetailes: function(){
			var parent_c = this.parent_view.row_context;
			var buttons_panel = this.parent_view.buttons_panel;
			this.c =  parent_c.children('.pla-settings');
			this.button = buttons_panel.children('.pl-settings-button');

			this.bindClick();
			//var _this = this;
			var _this = this;

			this.dont_rept_pl_chbx = this.c.find('.dont-rept-pl input').click(function() {
				_this.RPCLegacy('setDnRp', $(this).prop('checked'));
			});
		}
	});


	var MultiAtcsRowView = function(){};
	etc_views.BaseCRowUI.extendTo(MultiAtcsRowView, {
		createDetailes: function(){
			var parent_c = this.parent_view.row_context;
			var buttons_panel = this.parent_view.buttons_panel;
			this.c =  parent_c.children('.pla-row');
			this.button = buttons_panel.children('.pla-button');


			var _this = this;

			this.c.find(".search-music-files").click(function(){
				_this.RPCLegacy('makePlayable');
				
				//
			});

			this.c.find('.open-external-playlist').click(function(){
				_this.RPCLegacy('makeExternalPlaylist');
			
				//e.preventDefault();
			});


			this.bindClick();
		}
	});



	var PlARowView = function() {};
	etc_views.ActionsRowUI.extendTo(PlARowView, {
		createBase: function(){
		//	var parent_c = this.parent_view.row_context; var buttons_panel = this.parent_view.buttons_panel;
			this.c = this.parent_view.panel;
			this.row_context = this.c.find('.pla-row-content');
			this.arrow = this.row_context.children('.rc-arrow');
			this.buttons_panel = this.c.children().children('.pla-panel');
		},
		canUseWaypoints: function() {
			return this.parent_view.state('mp_has_focus');
		},
		children_views: {
			"row-multiatcs": {
				main: MultiAtcsRowView
			},
			"row-pl-settings": {
				main: PlaylistSettingsRowView
			}
		}
	});





	var songsListBaseView = function() {};
	provoda.extendFromTo("songsListBaseView", provoda.View, songsListBaseView);



	songsListView = function(){};
	songsListBaseView.extendTo(songsListView, {
		'stch-mp_show': function(opts) {
			this.c.toggleClass('hidden', !opts);
		},
		'stch-mp_has_focus': function(state) {
			this.lc.toggleClass('list-overview', !!state);
			if (!this.opts || !this.opts.overview){
				this.c.toggleClass('show-zoom-to-track', !state);
			}

		},
		'stch-error': function(error){
			if (this.error_b && this.error_b.v !== error){
				this.error_b.n.remove();
				delete this.error_b;
			}
			if (error && !this.error_b){
				this.error_b = {
					v: error,
					n: $('<li>' + localize('nothing-found','Nothing found') + '</li>').appendTo(this.c)
				};

			}
		},
		'stch-loader_disallowing_desc': function(state) {
			this.loader_dis_c.toggleClass('hidden', !state);
			this.loader_dis_c.text(state);
		},
		createPanel: function() {
			this.panel = this.root_view.getSample('playlist_panel');
			this.panel.appendTo(this.c);
			this.loader_dis_c = this.panel.find('.loader_disallowing_desc');
			this.dom_related_props.push('panel', 'loader_dis_c', 'error_b');
			return this;
		},
		'collch-plarow': function(name, md) {
			var view = this.getFreeChildView({name: name, space: 'main'}, md, {lite: this.opts && this.opts.overview});
			this.requestAll();
		},
		children_views: {
			plarow: {
				main: PlARowView
			},
			'songs-list': SongUI
		}

	});

return songsListView;
});