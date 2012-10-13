var test_pressed_node = function(e, opts){	
	var mouseup = opts && opts.mouseup;
	
	var node = e.target;
	var class_name = node.className;
	var class_list = class_name.split(/\s/);
	var clicked_node = $(node);
	
	
		if(clicked_node.is('a')) {
		  e.preventDefault();
		  if (bN(class_list.indexOf('download-mp3'))){
			app_env.openURL(node.href);
			
		  }
		  else if (bN(class_list.indexOf('vk-reg-ref'))){
			app_env.openURL(su.vkReferer || 'http://vk.com/reg198193');
			seesu.trackEvent('Links', 'vk registration');
			
		  }
		  else if (bN(class_list.indexOf('flash-s'))){
			app_env.openURL('http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html');
			seesu.trackEvent('Links', 'flash security');
			
		  }
		  else if (bN(class_list.indexOf('artist'))){
			artist_name = decodeURIComponent(clicked_node.data('artist'));
			su.showArtcardPage(artist_name);
			seesu.trackEvent('Artist navigation', 'artist', artist_name);
			
		  }
		  else if (bN(class_list.indexOf('music-tag'))){
			tag_name = decodeURIComponent(clicked_node.data('music_tag'));
			su.show_tag(tag_name);
			seesu.trackEvent('Artist navigation', 'tag', tag_name);
			
		  }
		  else if (bN(class_list.indexOf('bbcode_artist'))){
			
			artist_name = decodeURIComponent(clicked_node.attr('href').replace('http://www.last.fm/music/','').replace(/\+/g, ' '));
			su.showArtcardPage(artist_name);
			seesu.trackEvent('Artist navigation', 'bbcode_artist', artist_name);
			
		  }
		  else if (bN(class_list.indexOf('bbcode_tag'))){
			tag_name = decodeURIComponent(clicked_node.attr('href').replace('http://www.last.fm/tag/','').replace(/\+/g, ' '));
			su.show_tag(tag_name);
			seesu.trackEvent('Artist navigation', 'bbcode_tag', tag_name);
			
		  }
		  else if (bN(class_list.indexOf('similar-artists'))){
			var artist = clicked_node.data('artist');
			su.showSimilarArtists(artist);
			seesu.trackEvent('Artist navigation', 'similar artists to', artist);
		  }
		  else if (bN(class_list.indexOf('external'))){
			app_env.openURL(clicked_node.attr('href'));
			seesu.trackEvent('Links', 'just link');
			
		  }
		  else if (bN(class_list.indexOf('seesu-me-link'))){
			app_env.openURL(node.href)
			
		  }
		  else if (bN(class_list.indexOf('hint-query'))){
			var query = clicked_node.text();
			su.search(query);
			clicked_node.text(seesu.popular_artists[(Math.random()*10).toFixed(0)]);
			seesu.trackEvent('Navigation', 'hint artist');
			
		  } else if (bN(class_list.indexOf('pc-pause'))){
			  	var mo = clicked_node.data('mo');
				if (mo){
					mo.pause();
				}
				seesu.trackEvent('Controls', 'pause', mouseup ? 'mouseup' : '');
				 
			} 
			else if (bN(class_list.indexOf('pc-play'))){
				var mo = clicked_node.data('mo');
				if (mo){
					mo.switchPlay();
				}
			}
			else if (bN(class_list.indexOf('pc-stop')) ){
				var mo = clicked_node.data('mo');
				if (mo){
					mo.stop();
				}
				seesu.trackEvent('Controls', 'stop', mouseup ? 'mouseup' : '');
				 
			}else if ( bN(class_list.indexOf('pc-add'))){
				var mo = clicked_node.data('mo');
				if (mo && su.download_hack){
					mo.downloadLazy();
				}
			}
			else if ( bN(class_list.indexOf('pc-prev'))){
				var mo = clicked_node.data('mo');
				if (mo){

					mo.playPrev();
					
					
				}
				seesu.trackEvent('Controls', 'prev', mouseup ? 'mouseup' : '');
				
			}
			else if (bN(class_list.indexOf('pc-next'))){
				var mo = clicked_node.data('mo');
				if (mo){
					mo.playNext();
				}
				seesu.trackEvent('Controls', 'next', mouseup ? 'mouseup' : '');
				
			} 
		}  
		else if ((node.nodeName == 'INPUT' || node.nodeName == 'BUTTON')) {
			if (bN(class_list.indexOf('use-vk-code'))){
				var vk_t_raw = clicked_node.parent().find('.vk-code').val();
				if (vk_t_raw){
					var vk_token = new vkTokenAuth(su.vkappid, vk_t_raw);			
						connectApiToSeesu(vk_token, true);
				}
				
			} 

			
		}
	
	
}
