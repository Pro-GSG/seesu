var commonMessagesStore = function(glob_store, store_name) {
	this.init();
	this.glob_store = glob_store;
	this.store_name = store_name;
};


provoda.Eventor.extendTo(commonMessagesStore, {
	markAsReaded: function(message) {
		var changed = this.glob_store.set(this.store_name, message);
		if (changed){
			this.trigger('read', message);
		}
	},
	getReadedMessages: function() {
		return this.glob_store.get(this.store_name);
	}
});


var gMessagesStore = function(set, get) {
	this.sset = set;
	this.sget = get;
	this.store = this.sget() || {};
	this.cm_store = {};
};

Class.extendTo(gMessagesStore, {
	set: function(space, message) {
		this.store[space] = this.store[space] || [];
		if ( this.store[space].indexOf(message) == -1 ){
			this.store[space].push(message);
			this.sset(this.store);
			return true;
		}
	},
	get: function(space) {
		return this.store[space] || [];
	},
	getStore: function(name) {
		return this.cm_store[name] || (this.cm_store[name] = new commonMessagesStore(this, name));
	}
});


var ImagesPack = function() {};
provoda.Model.extendTo(ImagesPack, {
	init: function() {
		this._super();
		this.images_by_source = {};
		this.all_images = [];
	},
	addImage: function(lfm_arr, source) {
		if (!this.images_by_source[source] && lfm_arr){
			this.images_by_source[source] = lfm_arr;
			this.all_images.push({
				data: lfm_arr,
				source: source
			});
			this.checkImages();
		}
	},
	checkImages: function() {
		var best_data = $filter(this.all_images, 'data.lfm_id', function(value) {
			return !!value;
		});
		if (!this.state('best-image')){
			if (best_data.length){
				this.updateState('best-image', best_data[0].data);
			}
			
		}
		if (!this.state('just-image')){
			if (best_data.not.length){
				this.updateState('just-image', best_data.not[0].data);
			}
			
		}
	}
})
var TrackImages  = function() {};
ImagesPack.extendTo(TrackImages, {
	init: function(artmd, info) {
		this._super();
	
		this.artmd = artmd;
		this.artist = info.artist;
		this.track = info.track;

		var _this = this;
		artmd.on('state-change.image-to-use', function(e) {
			_this.updateState('artist-image', e.value);
		});
		var art_image = artmd.state('image-to-use');
		if (art_image){
			this.updateState('artist-image', art_image);
		}

	},
	complex_states: {
		'image-to-use': {
			depends_on: ['best-image', 'just-image', 'artist-image'],
			fn: function(bei, jui, arti){
				return bei || jui || arti;
			}
		}
	}
});

var ArtistImages = function() {};
ImagesPack.extendTo(ArtistImages, {
	init: function(artist_name) {
		this._super();

		this.artist_name = artist_name;
		
	},
	complex_states: {
		'image-to-use': {
			depends_on: ['best-image', 'just-image'],
			fn: function(bei, jui){
				return bei || jui;
			}
		}
	}
});

var LastFMArtistImagesSelector = function() {};
provoda.Eventor.extendTo(LastFMArtistImagesSelector, {
	init: function() {
		this._super();
		this.art_models = {};
		this.track_models = {};
		this.unknown_methods = {};
	},
	getImageWrap: function(array) {
		if (!array){
			return
		}
		var
			url,
			lfm_id;

		if (typeof array == 'string'){
			url = array
		} else {
			url = getTargetField(array, '3.#text');
		}
		if (url){
			if (url.indexOf('http://cdn.last.fm/flatness/catalogue/noimage') === 0){
				return
			} else {
				lfm_id = this.getLFMImageId(url);

				if (lfm_id){
					return {
						lfm_id: lfm_id
					};
				} else {
					return {
						url: url
					};
				}
			}

			
		}

		
	},
	getLFMImageId: function(url) {
		var url_parts = url.split(/\/+/);
		if (url_parts[1] == 'userserve-ak.last.fm'){
			return url_parts[4].replace(/png$/, 'jpg');

		}
		
	},
	setArtistImage: function(artist_name, lfm_arr, source) {
		this.getArtistImagesModel(artist_name).addImage(this.getImageWrap(lfm_arr), source);
	},
	setTrackImage: function(info, lfm_arr, source) {
		
		this.getTrackImagesModel(info).addImage(this.getImageWrap(lfm_arr), source);
	},
	setImage: function(info, source) {
		if (!info.artist){
			throw new Error('give me artist name');
		}
		if (!source){
			throw new Error('give me source');
		}
	},
	getTrackImagesModel: function(info) {
		if (!info.artist || !info.track){
			throw new Error ('give me full track info')
		}
		var model_id = info.artist + ' - ' + info.track;
		if (!this.track_models[model_id]){

			var md = new TrackImages();
			md.init(this.getArtistImagesModel(info.artist), info);
			this.track_models[model_id] = md;
		}
		return this.track_models[model_id];
	},
	getArtistImagesModel: function(artist_name) {
		if (!artist_name){
			throw new Error('give me artist name');
		}
		if (!this.art_models[artist_name]){
			var md = new ArtistImages();
			md.init(artist_name);
			this.art_models[artist_name] = md
		}
		return this.art_models[artist_name];
	},
	checkLfmData: function(method, r, parsed) {
		if (this.resp_handlers[method]){
			this.resp_handlers[method].call(this, r, method, parsed);
		} else {
			this.unknown_methods[method] = true;
		}
	},
	resp_handlers: {
		'artist.getInfo': function(r, method) {
			var artist_name = getTargetField(r, 'artist.name');
			if (artist_name){
				var images = getTargetField(r, 'artist.image');
				this.setArtistImage(artist_name, images, method);
			}
			
		},
		'artist.getSimilar': function(r, method) {
			var artists = toRealArray(getTargetField(r, 'similarartists.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}
		},	
		'geo.getMetroUniqueTrackChart': function(r, method) {
			var tracks = toRealArray(getTargetField(r, 'toptracks.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, cur.image, method);
				
			}
		},
		'album.getInfo': function(r, method) {
			var image = getTargetField(r, 'album.image');
			var tracks = toRealArray(getTargetField(r, 'album.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, image, method);
				
			}
		},
		'playlist.fetch': function(r, method) {
			var tracks = toRealArray(getTargetField(r, 'playlist.trackList.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.creator,
					track: cur.title
				}, cur.image, method);
			}

		},
		'user.getLovedTracks': function(r, method, tracks) {
			var tracks = toRealArray(getTargetField(r, 'lovedtracks.track'));

			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, cur.image, method);
				
			}

		},
		'user.getRecommendedArtists': function(r, method, artists) {
			var artists = toRealArray(getTargetField(r, 'recommendations.artist'));

			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}

		},
		'track.search': function(r, method) {
			var tracks = toRealArray(getTargetField(r, 'results.trackmatches.track'));

			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist,
					track: cur.name
				}, cur.image, method);
				
			}

		},
		'artist.search': function(r, method) {
			var artists = toRealArray(getTargetField(r, 'results.artistmatches.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}
		},
		'artist.getTopTracks': function(r, method, tracks) {
			tracks = tracks || toRealArray(getTargetField(r, 'toptracks.track'));
			for (var i = 0; i < tracks.length; i++) {
				var cur = tracks[i];
				this.setTrackImage({
					artist: cur.artist.name,
					track: cur.name
				}, cur.image, method);
				
			}
		},
		'tag.getTopArtists': function(r, method, artists) {
			artists = artists || toRealArray(getTargetField(r, 'topartists.artist'));
			for (var i = 0; i < artists.length; i++) {
				var cur = artists[i];
				this.setArtistImage(cur.name, cur.image, method);
			}

		}
	}
});

var PartsSwitcher = function() {};

provoda.Model.extendTo(PartsSwitcher, {
	init: function() {
		this._super();
		this.context_parts = {};
		this.active_part = null;
	},
	hideAll: function() {
		if (this.active_part){
			this.updateState('active_part', false);
			this.active_part.deacivate();
			this.active_part = null;
		}
	},
	hide: function(name){
		if (this.context_parts[name] === this.active_part){
			this.hideAll();
		}
	},
	addPart: function(model) {
		if (!this.context_parts[model.row_name]){
			this.context_parts[model.row_name] = model;
			this.addChild(model);

			var array = this.getChild('context_parts') || [];
			array.push(model);
			this.setChild('context_parts', array, true);

		}
	},
	getAllParts: function(){
		return this.context_parts;
	},
	switchPart: function(name) {
		if (this.context_parts[name] && this.context_parts[name] != this.active_part){
			if (this.active_part){
				this.active_part.deacivate();
			}
			this.active_part = this.context_parts[name];
			this.updateState('active_part', name);
			this.active_part.acivate();
			
	
		} else {
			this.hideAll();
		}
	}
});

var ActionsRowUI = function(){};
provoda.View.extendTo(ActionsRowUI, {
	createDetailes: function(){
		this.createBase();
	},
	'collch-context_parts': function(name, arr) {
		var _this = this;
		$.each(arr, function(i, el){
			var md_name = el.row_name;
			_this.getFreeChildView(md_name, el, 'main');
		});

		this.requestAll();
	},
	state_change: {
		active_part: function(nv, ov) {
			if (nv){
				this.row_context.removeClass('hidden');
				this.arrow.removeClass('hidden');
			} else {
				this.row_context.addClass('hidden');
			}
		}
	}
});



var BaseCRowUI = function(){};
provoda.View.extendTo(BaseCRowUI, {
	bindClick: function(){
		if (this.button){
			var md = this.md;
			this.button.click(function(){
				md.switchView();
			});
		}
	},
	getButtonPos: function(){
		var button_shift = this.button_shift || 0;
		return this.button.offset().left + (this.button.outerWidth()/2) + button_shift;
	},
	"stch-active_view": function(state){
		if (state){
			if (this.expand){
				this.expand();
			}
			var b_pos = this.getButtonPos();
			if (b_pos){
				var arrow = this.parent_view.arrow;
				arrow.css('left', b_pos - arrow.offsetParent().offset().left + 'px');
			}
			this.c.removeClass('hidden');
		} else {
			this.c.addClass('hidden');
		}
	}

});

var BaseCRow = function(){};
provoda.Model.extendTo(BaseCRow, {
	switchView: function(){
		this.actionsrow.switchPart(this.row_name);
	},
	hide: function(){
		this.actionsrow.hide(this.row_name);
	},
	deacivate: function(){
		this.updateState("active_view", false);
	},
	acivate: function(){
		this.updateState("active_view", true);
	}
});



var external_playlist = function(array){ //array = [{artist_name: '', track_title: '', duration: '', mp3link: ''}]
	this.result = this.header + '\n';
	for (var i=0; i < array.length; i++) {
		this.result += this.preline + ':' + (array[i].duration || '-1') + ',' + array[i].artist_name + ' - ' + array[i].track_title + '\n' + array[i].mp3link + '\n';
	}
	this.data_uri = this.request_header + escape(this.result);
	
};
external_playlist.prototype = {
	header : '#EXTM3U',
	preline: '#EXTINF',
	request_header : 'data:audio/x-mpegurl; filename=seesu_playlist.m3u; charset=utf-8,'
};
