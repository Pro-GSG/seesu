

var artCard = function(artist) {
	this.init();
	this.artist= artist;
	this.updateState('nav-title', artist);

	this.loadInfo();

	this.updateState('url-part', '/catalog/' + su.encodeURLPart(this.artist));

};
mapLevelModel.extendTo(artCard, {
	model_name: 'artcard',
	page_name: "art card",
	getURL: function() {
		return '/catalog/' + su.encodeURLPart(this.artist);
	},
	loadInfo: function(){
		this.loadTopTracks();
		this.loadAlbums();
		this.loadBaseInfo();
		
		this.setPrio('highest');
		
	},
	loadAlbums: function(){
		
		var _this = this;
		this.updateState('loading-albums', true);
		this.addRequest(lfm.get('artist.getTopAlbums',{'artist': this.artist })
			.done(function(r){
				_this.updateState('loading-albums', false);
				if (r){
					var albums = toRealArray(r.topalbums.album);
					
					if (albums.length){
						albums = sortLfmAlbums(albums, _this.artist);
						if (albums.ordered){
							_this.updateState('sorted-albums', albums);
						}
					}
				}
			})
			.fail(function(){
				_this.updateState('loading-albums', false);
			}), {
				order: 1
			}
		);
	},
	loadTopTracks: function(){
		
		var _this = this;
		this.updateState('loading-toptracks', true);
		this.addRequest(
			lfm.get('artist.getTopTracks',{'artist': this.artist, limit: 30, page: 1 })
				.done(function(r){
					var tracks = toRealArray(getTargetField(r, 'toptracks.track'));

					if (tracks.length){
						var track_list = [];
					
						for (var i=0, l = Math.min(tracks.length, 30); i < l; i++) {
							track_list.push({'artist' : this.artist ,'track': tracks[i].name, images: tracks[i].image});
						}

						_this.updateState('toptracks', track_list);
					}
					
				})
				.always(function(){
					_this.updateState('loading-toptracks', false);
				}),
			{
				order: 3
			}
		);
		
	},
	loadBaseInfo: function(){
		var _this = this;

		this.updateState('loading-baseinfo', true);
		this.addRequest(lfm.get('artist.getInfo',{'artist': this.artist })
			.done(function(r){
				_this.updateState('loading-baseinfo', false);
				r = parseArtistInfo(r);
				if (r.images){
					_this.updateState('images', r.images);
				}
				if (r.tags){
					_this.updateState('tags', r.tags);
				}
				if (r.bio){
					_this.updateState('bio', r.bio);
				}
				if (r.similars){
					_this.updateState('similars', r.similars);
				}
				
			})
			.fail(function(){
				_this.updateState('loading-baseinfo', false);
			}), {
				order: 2
			}
		);
	
	}
});
