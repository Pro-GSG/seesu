define(function(require) {
'use strict';

var spv = require('spv');
var hex_md5 = require('hex_md5');
var hp = require('./helpers');
var morph_helpers = require('js/libs/morph_helpers');
var Promise = require('Promise');
var toBigPromise = require('js/modules/extendPromise').toBigPromise;

var clean_obj = {};

var EventSubscribingOpts = function(ev_name, cb, once, context, immediately, wrapper) {
	this.ev_name = ev_name;
	this.cb = cb;
	this.once = once;
	this.context = context;
	this.immediately = immediately;
	this.wrapper = wrapper || null;
};


var findErrorByList = function(data, errors_selectors) {
	var i, cur, has_error;
	for (i = 0; i < errors_selectors.length; i++) {
		cur = errors_selectors[i];
		has_error = spv.getTargetField(data, cur);
		if (has_error){
			break;
		}
	}
	return has_error;
};

var usualRequest = function (send_declr, sputnik, opts, network_api_opts) {
	var api_name = send_declr.api_name;
	var api_method = send_declr.api_method_name;
	var api_args = send_declr.getArgs.call(sputnik, opts);
	var manual_nocache = api_args[2] && api_args[2].nocache;

	var non_standart_api_opts = send_declr.non_standart_api_opts;

	if (!non_standart_api_opts) {
		api_args[2] = api_args[2] || network_api_opts;
	}

	var cache_key;
	if (!non_standart_api_opts && !manual_nocache) {
		var big_string = JSON.stringify([
			'usual', api_name, send_declr.api_resource_path, api_method, api_args
		]);
		cache_key = hex_md5(big_string);
	}


	return {
		cache_key: cache_key,
		data: api_args
	};
};

var manualRequest = function (send_declr, sputnik, opts) {
	var declr = send_declr.manual;
	var api_name = send_declr.api_name;

	var args = new Array(declr.dependencies + 2);

	args[0] = null;
	args[1] = opts;

	for (var i = 0; i < declr.dependencies.length; i++) {
		args[i+2] = sputnik.state(declr.dependencies[i]);
	}

	var cache_key = hex_md5(JSON.stringify([
		'manual', api_name, send_declr.api_resource_path, opts, declr.fn_body, args
	]));

	return {
		cache_key: cache_key,
		data: args
	};
};

var idsRequest = function (send_declr, sputnik) {
	var declr = send_declr.ids_declr;
	var api_name = send_declr.api_name;

	var ids = [sputnik.state(declr.arrayof)];

	var cache_key = hex_md5(JSON.stringify([
		'ids', api_name, send_declr.api_resource_path, declr.fn_body, ids
	]));

	return {
		cache_key: cache_key,
		data: ids
	};

	// var states = new Array();
	// arrayof: 'user_id',
	// indexBy: '_id',
	// req: function(api, ids) {
	// 	return api.find({_id: {'$in': ids}}).limit(ids.length);
	// }
}

var oneFromList = function(array) {
	return array && array[0];
};

var getRequestByDeclr = function(send_declr, sputnik, opts, network_api_opts) {
	if (!sputnik._highway.requests_by_declarations) {
		sputnik._highway.requests_by_declarations = {};
	}
	var requests_by_declarations = sputnik._highway.requests_by_declarations;

	var api_name = send_declr.api_name;
	var network_api = hp.getNetApiByDeclr(send_declr, sputnik);
	var api_part = !send_declr.api_resource_path
		? network_api
		: spv.getTargetField(network_api, send_declr.api_resource_path);


	if (!network_api.source_name) {
		throw new Error('network_api must have source_name!');
	}

	if (!network_api.errors_fields && !network_api.checkResponse) {
		throw new Error('provide a way to detect errors!');
	}

	if (typeof api_name != 'string') {
		api_name = network_api.api_name;
	}

	if (typeof api_name != 'string') {
		throw new Error('network_api must have api_name!');
	}

	var request_data;
	if (send_declr.api_method_name) {
		request_data = usualRequest(send_declr, sputnik, opts, network_api_opts);
	} else if (send_declr.manual) {
		request_data = manualRequest(send_declr, sputnik, opts);
	} else if (send_declr.ids_declr) {
		request_data = idsRequest(send_declr, sputnik);
	}

	var cache_key = request_data.cache_key;
	if (cache_key && !opts.has_error && requests_by_declarations[cache_key]) {
		return requests_by_declarations[cache_key];
	}


	var request;
	if (send_declr.api_method_name) {
		request = api_part[ send_declr.api_method_name ].apply(network_api, request_data.data);
	} else if (send_declr.manual) {
		request_data.data[0] = api_part;
		request = send_declr.manual.fn.apply(null, request_data.data);
	} else if (send_declr.ids_declr) {
		request = send_declr.ids_declr.req.call(null, api_part, request_data.data)
			.then(oneFromList);
		//  idsRequest(send_declr, sputnik, opts);
	}

	var result_request = checkRequest(request);
	result_request.network_api = network_api;
	if (cache_key) {
		requests_by_declarations[cache_key] = result_request;
		result_request.then(anyway, anyway);
	}

	return result_request;

	function anyway() {
		if (requests_by_declarations[cache_key] == request) {
			delete requests_by_declarations[cache_key];
		}
	}
};

function checkRequest(request) {
	if (!request.catch) {
		if (!request.abort && !request.db) {
			throw new Error('request must have `abort` method');
		}
		return toBigPromise(request);
	}
	return request;
}


var iterateSubsCache = function(func) {
	return function(bhv, listener_name, obj) {
		if (!bhv.subscribes_cache) {
			return;
		}
		for (var trigger_name in bhv.subscribes_cache){
			if (!bhv.subscribes_cache[trigger_name]){
				continue;
			}
			if (listener_name == trigger_name){
				bhv.subscribes_cache[trigger_name] = func(bhv.subscribes_cache[trigger_name], obj, listener_name);
			}
		}
		return bhv.subscribes_cache;
	};
};


var addToSubscribesCache = iterateSubsCache(function(matched, obj) {
	var result = matched;
	result.push(obj);
	return result;
});

var removeFromSubscribesCache = iterateSubsCache(function(matched, obj) {
	var pos = matched.indexOf(obj);
	if (pos != -1) {
		return spv.removeItem(matched, pos);
	}
});

var resetSubscribesCache = iterateSubsCache(function() {
	//fixme - bug for "state_change-workarea_width.song_file_progress" ( "state_change-workarea_width" stays valid, but must be invalid)
	return null;
});

var getNsName = function(convertEventName, ev_name_raw) {
	if (!convertEventName) {
		return ev_name_raw;
	} else {
		return convertEventName(ev_name_raw);
	}
};

var FastEventor = function(context) {
	this.sputnik = context;
	this.subscribes = null;
	this.subscribes_cache = null;
	this.reg_fires = null;
	if (context.reg_fires){
		this.reg_fires = context.reg_fires;
	}
	this.requests = null;
	this._requestsSortFunc = null;
	this.mapped_reqs = null;//this.sputnik.req_map ? {} : null;
	this.nesting_requests = null;//this.sputnik.has_reqnest_decls ? {} : null;
};
FastEventor.prototype = spv.coe(function(add) {

add({
	_pushCallbackToStack: function(ev_name, opts) {
		if (!this.subscribes) {
			this.subscribes = {};
		}

		if (!this.subscribes[ev_name]){
			this.subscribes[ev_name] = [];
		}
		this.subscribes[ev_name].push(opts);
		// resetSubscribesCache(this, opts.ev_name);
		addToSubscribesCache(this, opts.ev_name, opts);
	},
	getPossibleRegfires: function(ev_name) {
		if (!this.reg_fires){
			return;
		}
		if (this.reg_fires.cache && this.reg_fires.cache[ev_name]){
			return this.reg_fires.cache[ev_name];
		}

		var funcs = [];
		var i = 0;
		if (this.reg_fires.by_namespace){
			if (this.reg_fires.by_namespace[ev_name]){
				funcs.push(this.reg_fires.by_namespace[ev_name]);
			}
		}
		if (this.reg_fires.by_test){
			for (i = 0; i < this.reg_fires.by_test.length; i++) {
				if (this.reg_fires.by_test[i].test.call(this.sputnik, ev_name)){
					funcs.push(this.reg_fires.by_test[i]);
				}
			}
		}

		if (!this.reg_fires.cache){
			this.reg_fires.cache = {};
		}
		this.reg_fires.cache[ev_name] = funcs;
		return funcs;
	},

	hndUsualEvCallbacksWrapper: function(motivator, fn, context, args, arg) {
		if (motivator.p_space) {
			this.zdsv.removeFlowStep(motivator.p_space, motivator.p_index_key, motivator);
		}
		if (args){
			fn.apply(context, args);
		} else {
			fn.call(context, arg);
		}
	},
	_addEventHandler: function(ev_name_raw, cb, context, immediately, exlusive, skip_reg, soft_reg, once, easy_bind_control){
		//common opts allowed

		var ev_name = getNsName(this.sputnik.convertEventName, ev_name_raw);

		var
			fired = false,
			_this = this;

		if (exlusive){
			this.off(ev_name);
		}

		var reg_args = null, one_reg_arg = null;

		var callbacks_wrapper = this.hndUsualEvCallbacksWrapper;

		var reg_fires = this.getPossibleRegfires(ev_name);
		if (reg_fires && reg_fires.length){
			reg_args = reg_fires[0].fn.call(this.sputnik, ev_name);
			if (typeof reg_args != 'undefined') {
				fired = true;
				if (!Array.isArray(reg_args)) {
					one_reg_arg = reg_args;
					reg_args = null;
				}
			}

		}
		if (fired){
			if (reg_fires[0].getWrapper){
				callbacks_wrapper = reg_fires[0].getWrapper.call(this.sputnik);
			}
			if (!skip_reg){
				var mo_context = context || _this.sputnik;
				if (soft_reg === false){
					if (one_reg_arg) {
						cb.call(mo_context, one_reg_arg);
					} else {
						cb.apply(mo_context, reg_args);
					}

				} else {
					var flow_step = this.sputnik._getCallsFlow().pushToFlow(cb, mo_context, reg_args, one_reg_arg, callbacks_wrapper, this.sputnik, this.sputnik.current_motivator);
					if (reg_fires[0].handleFlowStep) {

						reg_fires[0].handleFlowStep.call(this.sputnik, flow_step, reg_fires[0].getFSNamespace(ev_name));
					}
				}
			}
		}


		var subscr_opts = new EventSubscribingOpts(ev_name, cb, once, context, immediately, callbacks_wrapper);

		if (!(once && fired)){
			this._pushCallbackToStack(ev_name, subscr_opts);
		}
		if (easy_bind_control){
			return subscr_opts;
		} else {
			return this.sputnik;
		}
	},
	once: function(ev_name, cb, opts, context){
		return this._addEventHandler(
			ev_name,
			cb,
			opts && opts.context || context,
			opts && opts.immediately,
			opts && opts.exlusive,
			opts && opts.skip_reg,
			opts && opts.soft_reg,
			true,
			opts && opts.easy_bind_control);
	},
	on: function(ev_name, cb, opts, context){
		return this._addEventHandler(
			ev_name,
			cb,
			opts && opts.context || context,
			opts && opts.immediately,
			opts && opts.exlusive,
			opts && opts.skip_reg,
			opts && opts.soft_reg,
			false,
			opts && opts.easy_bind_control);
	},
	off: function(event_name, cb, obj, context){
		var ev_name = getNsName(this.sputnik.convertEventName, event_name);

		var items = this.subscribes && this.subscribes[ev_name];

		if (items){
			if (obj) {
				var pos = items.indexOf(obj);
				if (pos != -1) {
					this.subscribes[ev_name] = spv.removeItem(items, pos);
					removeFromSubscribesCache(this, obj.ev_name, obj);
					// resetSubscribesCache(this, obj.ev_name);
				}
			} else {
				var clean = [];
				if (cb){
					for (var i = 0; i < items.length; i++) {
						var cur = items[i];
						if (cur.cb == cb && cur.ev_name == ev_name){
							if (!context || cur.context == context){
								continue;
							}
						}
						clean.push(items[i]);
					}
				} else {
					for (var i = 0; i < items.length; i++) {
						var cur = items[i];
						if (cur.ev_name == ev_name){
							if (!context || cur.context == context){
								continue;
							}
						}
						clean.push(items[i]);
					}
				}

				// losing `order by subscriging time` here
				// clean.push.apply(clean, queried.not_matched);

				if (clean.length != this.subscribes[ev_name].length){
					this.subscribes[ev_name] = clean;
					resetSubscribesCache(this, ev_name);
				}
			}

		}

		return this.sputnik;
	},
	getMatchedCallbacks: (function() {

		var _empty_callbacks_package = [];

		var find = function(ev_name, cb_cs) {
			var matched = [];
			for (var i = 0; i < cb_cs.length; i++) {
				if (cb_cs[i].ev_name == ev_name){
					matched.push(cb_cs[i]);
				}
			}
			return matched;
		};

		var getName = getNsName;

		var setCache = function(self, ev_name, value) {
			if (!self.subscribes_cache) {
				self.subscribes_cache = {};
			}
			self.subscribes_cache[ev_name] = value;
			return value;
		};

		return function(ev_name_raw){
			var ev_name = getName(this.sputnik.convertEventName, ev_name_raw);

			var cb_cs = this.subscribes && this.subscribes[ev_name];

			if (!cb_cs){
				return _empty_callbacks_package;
			} else {
				var cached_r = this.subscribes_cache && this.subscribes_cache[ev_name];
				if (cached_r){
					return cached_r;
				} else {
					var value = find(ev_name, cb_cs);

					setCache(this, ev_name, value);
					return value;
				}
			}
		};
	})(),
	callEventCallback: function(cur, args, opts, arg) {
	//	var _this = this;
		if (cur.immediately && (!opts || !opts.force_async)){
			if (args){
				cur.cb.apply(cur.context || this.sputnik, args);
			} else {
				cur.cb.call(cur.context || this.sputnik, arg);
			}

		} else {
			var callback_context = cur.context || this.sputnik;
			var wrapper_context = this.sputnik;

			var calls_flow = (opts && opts.emergency) ? this.sputnik._calls_flow : this.sputnik._getCallsFlow();
			return calls_flow.pushToFlow(cur.cb, callback_context, args, arg, cur.wrapper, wrapper_context, this.sputnik.current_motivator);
			/*
			setTimeout(function() {
				cur.cb.apply(_this, args);
			},1);*/
		}
	},
	cleanOnceEvents: function(event_name) {
		// this.off(ev_name, false, cur);

		var ev_name = getNsName(this.sputnik.convertEventName, event_name);

		var items = this.subscribes && this.subscribes[ev_name];
		if (items) {
			var clean = [];

			for (var i = 0; i < items.length; i++) {
				var cur = items[i];
				if (!cur.cb){
					continue;
				}
				clean.push(items[i]);
			}

			if (clean.length != this.subscribes[ev_name].length){
				this.subscribes[ev_name] = clean;
				resetSubscribesCache(this, ev_name);
			}
		}

	},
	triggerCallbacks: function(cb_cs, args, opts, ev_name, arg, flow_steps_array){
		var need_cleanup = false;
		for (var i = 0; i < cb_cs.length; i++) {
			var cur = cb_cs[i];
			if (!cur.cb) {
				continue;
			}
			var flow_step = this.callEventCallback(cur, args, opts, arg);
			if (flow_step && flow_steps_array) {
				flow_steps_array.push(flow_step);
			}
			if (cur.once){
				need_cleanup = true;
				cur.cb = null;
			}
		}

		if (need_cleanup) {
			this.cleanOnceEvents(ev_name);
		}
	},
	trigger: function(ev_name){
		var need_cleanup = false;
		var cb_cs = this.getMatchedCallbacks(ev_name);
		if (cb_cs){
			var i = 0;
			var args = new Array(arguments.length - 1);
			for (i = 1; i < arguments.length; i++) {
				args[ i - 1 ]= arguments[i];
			}

			for (i = 0; i < cb_cs.length; i++) {
				var cur = cb_cs[i];
				if (!cur.cb) {
					continue;
				}
				this.callEventCallback(cur, args, (args && args[ args.length -1 ]));
				if (cur.once){
					need_cleanup = true;
					cur.cb = null;
				}
			}
		}
		if (need_cleanup) {
			this.cleanOnceEvents(ev_name);
		}
		return this;
	}
});

var ReqExt = function() {
	this.xhr = null;
	this.deps = null;

};

function addDependence(req, md) {
	if (!req.pv_ext) {
		req.pv_ext = new ReqExt();
	}
	if (!req.pv_ext.deps) {
		req.pv_ext.deps = {};
	}

	var store = req.pv_ext.deps;
	var key = md._provoda_id;
	store[key] = true;

}

function softAbort(req, md) {
	if (!req.pv_ext || !req.pv_ext.deps) {
		return null;
	}

	var store = req.pv_ext.deps;
	var key = md._provoda_id;
	store[key] = false;

	if (!spv.countKeys(store, true)) {
		req.abort(md);
		// req.pv_ext.xhr.abort();
	}
}

add({
	default_requests_space: 'nav',
	getRequests: function(space) {
		space = space || this.default_requests_space;
		return this.requests && this.requests[space];
	},
	getQueued: function(space) {
		//must return new array;
		var requests = this.getRequests(space);
		return requests && spv.filter(requests, 'queued');
	},
	addRequest: function(rq, opts){
		this.addRequests([rq], opts);
		return this.sputnik;
	},
	addRequests: function(array, opts) {
		//opts = opts || {};
		//space, depend
		var _highway = this.sputnik._highway;

		var space = (opts && opts.space) || this.default_requests_space;
		var i = 0, req = null;

		if (opts && opts.order){
			for (i = 0; i < array.length; i++) {
				req = array[i];
				spv.setTargetField(req, this.sputnik.getReqsOrderField(), opts.order);
				req.order = opts.order;
			}
		}
		if (!this.requests) {
			this.requests = {};
		}

		if (!this.requests[space]){
			this.requests[space] = [];
		}

		var target_arr = this.requests[space];

		var bindRemove = function(_this, req) {
			req.then(anyway, anyway);

			function anyway() {
				if (_this.requests && _this.requests[space]){
					_this.requests[space] = spv.findAndRemoveItem(_this.requests[space], req);
				}

				var _highway = _this.sputnik._highway;
				if (_highway.requests) {
					_highway.requests = spv.findAndRemoveItem(_highway.requests, req);
				}

			}
		};
		var added = [];
		for (i = 0; i < array.length; i++) {
			req = array[i];

			if (_highway.requests && _highway.requests.indexOf(req) == -1) {
				_highway.requests.push(req);
			}

			/*if (req.queued){
				spv.setTargetField(req.queued, 'mdata.' + this._provoda_id, this);
			}*/
			if (target_arr.indexOf(req) != -1){
				continue;
			}
			if (opts && opts.depend){
				if (req){
					addDependence(req, this.sputnik);
				}
			}
			target_arr.push(req);
			bindRemove(this, req);
			added.push(req);
		}
		if (added.length){
			if (!opts || !opts.skip_sort){
				this.sortRequests(space);
			}

			this.trigger('requests', added, space);
		}


	},
	_getRequestsSortFunc: function() {
		// used to sort localy, in model
		if (!this._requestsSortFunc) {
			var field_name = this.sputnik.getReqsOrderField();
			// if it has view/model mark that it should be first in view/model
			// that sort by mark value
			this._requestsSortFunc = spv.getSortFunc([
				function(el){
					if (typeof spv.getTargetField(el, field_name) == 'number'){
						return false;
					} else {
						return true;
					}
				},
				field_name
			]);

		}
		return this._requestsSortFunc;
	},

	sortRequests: function(space) {
		var requests = this.requests && this.requests[space || this.default_requests_space];
		if (!this.requests || !this.requests.length) {
			return;
		}
		return requests.sort(this._getRequestsSortFunc());
	},
	getAllRequests: function() {
		var all_requests;
		if (!this.requests) {
			return all_requests;
		}
		for (var space in this.requests){
			if (this.requests[space].length){
				if (!all_requests) {
					all_requests = [];
				}
				all_requests.push.apply(all_requests, this.requests[space]);
			}
		}
		return all_requests;
	},
	stopRequests: function(){

		var all_requests = this.getAllRequests();

		while (all_requests && all_requests.length) {
			var rq = all_requests.pop();
			if (rq) {
				if (softAbort(rq, this.sputnik) === null) {
					rq.abort(this.sputnik);
				}
			}
		}
		hp.wipeObj(this.requests);
		return this;
	},
	getModelImmediateRequests: function(space) {
		var reqs = this.getRequests(space);
		if (!reqs) {
			return [];
		}
		var queued = reqs.slice();
		if (queued){
			queued.reverse();
		}

		return queued;
	},
	setPrio: function(space) {
		var groups = [];
		var immediate = this.getModelImmediateRequests(space);
		if (immediate){
			groups.push(immediate);
		}
		var relative = this.sputnik.getRelativeRequestsGroups(space);
		if (relative && relative.length){
			groups.push.apply(groups, relative);
		}
		var setPrio = function(el) {
			if (el.queued) {
				el.queued.setPrio();
				return;
			}
			if (el.setPrio) {
				el.setPrio();
			}

		};
		groups.reverse();
		for (var i = 0; i < groups.length; i++) {
			groups[i].forEach(setPrio);
		}
		return this.sputnik;
	}
});

add({
	requestState: (function(){

		function failed(err) {
			return Promise.reject(err);
		}

		function bindRequest(request, selected_map, store, self) {
			var network_api = hp.getNetApiByDeclr(selected_map.send_declr, self.sputnik);


			var states_list = selected_map.states_list;
			var parse = selected_map.parse;

			function anyway() {
				store.process = false;
				self.sputnik.updateManyStates(self.makeLoadingMarks(states_list, false));
			}

			request.then(anyway, anyway);

			onPromiseFail(request, function(){
				store.error = true;
			});

			return request.then(function(r) {
				var has_error = network_api.errors_fields ? findErrorByList(r, network_api.errors_fields) : network_api.checkResponse(r);
				if (!has_error) {
					var result = parse.call(self.sputnik, r, null, morph_helpers);
					if (result) {
						return result;
					}
				}

				return failed(new Error(has_error || 'no Result'));
			}).then(function(result){
				var i;
				var result_states;

				if (Array.isArray(result)) {
					if (result.length != states_list.length) {
						throw new Error('values array does not match states array');
					}

					result_states = {};
					for (i = 0; i < states_list.length; i++) {
						result_states[ states_list[i] ] = result[ i ];
					}

				} else if (typeof result == 'object') {
					for (i = 0; i < states_list.length; i++) {
						if (!result.hasOwnProperty(states_list[i])) {
							throw new Error('object must have all props:' + states_list + ', but does not have ' + states_list[i]);
						}
					}
					result_states = result;
				}

				for (var i = 0; i < states_list.length; i++) {
					result_states[states_list[i] + '__$complete'] = true;
				}

				self.sputnik.updateManyStates( result_states );


				store.error = false;
				store.done = true;
			});
		}

		function sendRequest(selected_map, store, self) {
			var request = getRequestByDeclr(selected_map.send_declr, self.sputnik,
				{has_error: store.error},
				{nocache: store.error});

			self.addRequest(request);
			return request;

		}

		function checkDependencies(selected_map, store, self) {
			var not_ok;
			for (var i = 0; i < selected_map.dependencies.length; i++) {
				if (!self.sputnik.state(selected_map.dependencies[i])) {
					not_ok = selected_map.dependencies[i];
					break;
				}
			}

			if (not_ok) {
				return failed(new Error('missing ' + not_ok));
			}

			return sendRequest(selected_map, store, self);
		}

		var resolved = Promise.resolve();

		function requestDependencies(self, dependencies, soft) {
			var reqs_list = [];
			for (var i = 0; i < dependencies.length; i++) {
				var cur = dependencies[i];
				var compx = self.sputnik.compx_check[cur];
				if (compx) {
					if (self.sputnik.state(cur)) {
						continue;
					}
					reqs_list.push(requestDependencies(self, compx.depends_on, true));
					continue;
				}

				if (soft) {
					var maps_for_state = self.sputnik._states_reqs_index && self.sputnik._states_reqs_index[cur];
					if (!maps_for_state) {
						continue;
					}
				}

				var dep_req = self.requestState(dependencies[i]);
				if (dep_req) {
					reqs_list.push(dep_req);
				}
			}

			var req = !reqs_list.length
				? resolved
				: Promise.all(reqs_list);

			return req;
		}

		return function(state_name) {
			var current_value = this.sputnik.state(state_name);
			if (current_value) {
				return;
			}

			var i, cur, states_list;
			var maps_for_state = this.sputnik._states_reqs_index && this.sputnik._states_reqs_index[state_name];

			var cant_request;
			if (this.mapped_reqs) {
				for (i = 0; i < maps_for_state.length; i++) {
					cur = this.mapped_reqs[maps_for_state[i].num];
					if (cur && (cur.done || cur.process)) {
						cant_request = true;
						break;
					}
				}
			}

			if (cant_request) {
				return;
			}

			var selected_map = maps_for_state[0]; //take first
			var selected_map_num = selected_map.num;
			if (!this.mapped_reqs) {
				this.mapped_reqs = {};
			}


			if ( !this.mapped_reqs[selected_map_num] ) {
				this.mapped_reqs[selected_map_num] = {
					done: false,
					error: false,
					process: false
				};
			}

			var store = this.mapped_reqs[selected_map_num];

			store.process = true;

			states_list = selected_map.states_list;
			this.sputnik.updateManyStates(this.makeLoadingMarks(states_list, true));

			if (!selected_map.dependencies) {
				return bindRequest(sendRequest(selected_map, store, this), selected_map, store, this);
			}

			var self = this;

			var req = requestDependencies(self, selected_map.dependencies).then(function () {
				return checkDependencies(selected_map, store, self);
			});

			return bindRequest(req, selected_map, store, self);

		};
	})(),
	makeLoadingMarks: function(states_list, value) {
		var loading_marks = {};
		for (var i = 0; i < states_list.length; i++) {

			loading_marks[ states_list[i] + '__loading'] = value;

		}
		return loading_marks;
	},
	requestNesting: function(dclt, nesting_name) {
		if (!dclt) {
			return;
		}
		if (!this.nesting_requests) {
			this.nesting_requests = {};
		}

		if (!this.nesting_requests[ nesting_name ]) {
			this.nesting_requests[ nesting_name ] = {
				//has_items: false,
				has_all_items: false,
				last_page: 0,
				error: false,
				process: false
			};
		}

		var store = this.nesting_requests[ nesting_name ];
		if (store.process || store.has_all_items) {
			return;
		}

		var is_main_list = nesting_name == this.sputnik.main_list_name;

		this.sputnik.updateState('loading_nesting_' + nesting_name, true);
		if (is_main_list) {
			this.sputnik.updateState('main_list_loading', true);
		}

		var parse_items = dclt.parse_items;
		var parse_serv = dclt.parse_serv;
		var side_data_parsers = dclt.side_data_parsers;
		var send_declr = dclt.send_declr;
		var supports_paging = !!parse_serv;
		var paging_opts = this.sputnik.getPagingInfo(nesting_name);

		var network_api_opts = {
			nocache: store.error
		};

		if (supports_paging) {
			network_api_opts.paging = paging_opts;
		}




		var request = getRequestByDeclr(send_declr, this.sputnik,
			{has_error: store.error, paging: paging_opts},
			network_api_opts);
		var network_api = request.network_api;
		var source_name = network_api.source_name;

		store.process = true;
		var _this = this;

		function anyway() {
			store.process = false;
			_this.sputnik.updateState('loading_nesting_' + nesting_name, false);
			if (is_main_list) {
				_this.sputnik.updateState('main_list_loading', false);
			}
		}

		request.then(anyway, anyway);

		onPromiseFail(request, function(){
			store.error = true;
		});

		request.then(function(r){
					var sputnik = _this.sputnik;
					var has_error = network_api.errors_fields ? findErrorByList(r, network_api.errors_fields) : network_api.checkResponse(r);

					if (has_error){
						store.error = true;
					} else {
						var items = parse_items.call(sputnik, r, sputnik.head_props || clean_obj, morph_helpers);
						var serv_data = typeof parse_serv == 'function' && parse_serv.call(sputnik, r, paging_opts, morph_helpers);



						if (!supports_paging) {
							store.has_all_items = true;

							sputnik.updateState("all_data_loaded", true);
						} else {
							var has_more_data;
							if (serv_data === true) {
								has_more_data = true;
							} else if (serv_data && ((serv_data.hasOwnProperty('total_pages_num') && serv_data.hasOwnProperty('page_num')) || serv_data.hasOwnProperty('total'))) {
								if (!isNaN(serv_data.total)) {
									if ( (paging_opts.current_length + items.length) < serv_data.total && serv_data.total > paging_opts.page_limit) {
										has_more_data = true;
									}
								} else {
									if (serv_data.page_num < serv_data.total_pages_num) {
										has_more_data = true;
									}
								}

							} else {
								has_more_data = items.length == sputnik.page_limit;
							}



							if (!has_more_data) {
								store.has_all_items = true;
								sputnik.updateState("all_data_loaded", true);
							}
						}
						items = paging_opts.remainder ? items.slice( paging_opts.remainder ) : items;

						sputnik.nextTick(sputnik.insertDataAsSubitems, [sputnik, nesting_name, items, serv_data, source_name], true);

						if (!sputnik.loaded_nestings_items) {
							sputnik.loaded_nestings_items = {};
						}

						if (!sputnik.loaded_nestings_items[nesting_name]) {
							sputnik.loaded_nestings_items[nesting_name] = 0;
						}
						var has_data_holes = serv_data === true || (serv_data && serv_data.has_data_holes === true);

						sputnik.loaded_nestings_items[nesting_name] +=
							has_data_holes ? paging_opts.page_limit : (items ? items.length : 0);
						//special logic where server send us page without few items. but it can be more pages available
						//so serv_data in this case is answer for question "Is more data available?"

						if (side_data_parsers) {
							for (var i = 0; i < side_data_parsers.length; i++) {
								sputnik.nextTick(
									sputnik.handleNetworkSideData, [
										sputnik,
										source_name,
										side_data_parsers[i][0],
										side_data_parsers[i][1].call(sputnik, r, paging_opts, morph_helpers)
									], true);

							}

						}




						//сделать выводы о завершенности всех данных
					}
				});

		this.addRequest(request);
		return request;

		/*
		есть ли декларация
		все ли возможные данные получены
		в процессе запроса (пока можно запрашивать в один поток)


		маркировка ошибок с прошлых запросов не участвует в принятиях решений, но используется для отказа от кеша при новых запросах


		*/
	}


});

});


function onPromiseFail(promise, cb) {
	if (promise.fail) {
		return promise.fail(cb);
	} else {
		return promise.catch(cb);
	}
}

return FastEventor;
});
