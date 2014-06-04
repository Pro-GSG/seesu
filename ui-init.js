(function() {
"use strict";
//var d = window.document;
var cbp;
var chrome = window.chrome;
var opera = window.opera;
if (window.chrome && chrome.extension){
	cbp = chrome.extension.getBackgroundPage();
} else if (window.opera && opera.extension && opera.extension.bgProcess){
	cbp = opera.extension.bgProcess;
}
cbp.big_timer.setN('popup-start');
var need_ui = true;
if (need_ui){
	cbp.require(['spv', 'app_serv'], function(spv, app_serv) {
		if (!window){
			return;
		}
		app_serv.handleDocument(window.document);
	});
}
if (need_ui){
	cbp.require(['su', 'js/views/AppView', 'angbo', 'provoda'], function(su, AppView, angbo, provoda) {
		if (!window){
			return;
		}
		var can_die = true;
		var md = su;

		var views_proxies = provoda.views_proxies;
		var proxies_space = Date.now();
		views_proxies.addSpaceById(proxies_space, md);
		var mpx = views_proxies.getMPX(proxies_space, md);

		
		
		md.updateLVTime();

		
		(function() {
			var view = new AppView();
			mpx.addView(view, 'root');

			view.init({
				mpx: mpx,
				proxies_space: proxies_space
			}, {d: window.document, allow_url_history: true, can_die: can_die, angbo: angbo});
			view.onDie(function() {
				//views_proxies.removeSpaceById(proxies_space);
				view = null;
			});
			view.requestAll();
		})();
		
		//provoda.sync_r.connectAppRoot();
	});
}

})();

/*



cbp.jsLoadComplete({
	test: function() {
		return cbp.app_env
	},
	fn: function() {
		cbp.handleDocument(window.document, {category: 'popup-init', start_time: 'popup-start'});
		//cbp.handleDocument(d);
	}
});
cbp.jsLoadComplete({
	test: function() {
		return cbp.appTelegrapher
	},
	fn: function() {

		var app_tph = new cbp.appTelegrapher();
		app_tph.init(window, {category: 'popup-init', start_time: 'popup-start'}, true);
		//
		cbp.app_view = app_tph.app_view;
	}
});*/