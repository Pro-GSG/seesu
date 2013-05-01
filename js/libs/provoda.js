(function(window){
"use strict";
var provoda;
var sync_sender = {
	root_model: null,
	sockets: {},
	sockets_m_index: {},
	setRootModel: function(md) {
		this.root_model = md;
	},
	postTree: function(struc, has_root) {
		window.postMessage({
			protocol: 'provoda',
			action: 'buildtree',
			message: {
				has_root: has_root,
				value: struc
			}
		}, window.location.origin);
	},
	postNesting: function(md, name, value) {
		var result = value;
		if (value){
			if (value._provoda_id){
				result = value._provoda_id;
			} else {
				result = [];
				for (var i = 0; i < value.length; i++) {
					result.push(value[i]._provoda_id);
				}
			}
		}
		window.postMessage({
			protocol: 'provoda',
			action: 'update_nesting',
			message: {
				_provoda_id: md._provoda_id,
				name: name,
				value: result
			}
		}, window.location.origin);
	},
	postStates: function(id, states) {
		var converted_states = [];
		for (var i = 0; i < states.length; i++) {

			//states[i]
		}

	},
	connectSockect: function(api, socket_id) {
		this.sockets_m_index[socket_id] = {};
		this.sockets[socket_id] = api;
		var struc = this.root_model.toSimpleStructure(this.sockets_m_index[socket_id]);
		this.postTree(struc, true);
		
	},
	checkModels: function(array, index) {
		var big_result = [];
		for (var i = 0; i < array.length; i++) {
			var cur = array[i];
			if (!index[cur._provoda_id]){
				index[cur._provoda_id] = true;
				cur.toSimpleStructure(index, big_result);
			}
			
		}
		if (big_result.length){
			this.postTree(big_result);
		}
	},
	pushNesting: function(md, name, value) {
		var struc;
		for (var socket_id in this.sockets) {
			var index = this.sockets_m_index[socket_id];
			if (!this.sockets_m_index[socket_id][md._provoda_id]){
				if (!struc){
					struc = md.toSimpleStructure(index);
				}
				this.postTree(struc);
			} else {
				if (value){
					if (value._provoda_id){
						this.checkModels([value], index);
					} else {
						this.checkModels(value, index);
					}
				}
				this.postNesting(md, name, value);
			}
		}
	},
	pushStates: function(md, states) {
		var struc;
		for (var socket_id in this.sockets) {
			if (!this.sockets_m_index[socket_id][md._provoda_id]){
				if (!struc){
					struc = md.toSimpleStructure(this.sockets_m_index[socket_id]);
				}
				this.postTree(struc);
			} else {
				this.postStates(md, states);
			}
		}
	}
};


var MDProxy = function() {};
MDProxy.prototype = {
	init: function(_provoda_id, states, children_models, md) {
		this._provoda_id = _provoda_id;
		this.views = [];
		this.views_index = {};
		this.states = states;
		this.children_models = children_models;
		this.md = md;
	},
	RPCLegacy: function() {
		this.md.RPCLegacy.apply(this.md, arguments);
	},
	setStates: function() {},
	updateStates: function() {},
	updateNesting: function() {},
	removeView: function(view){
		var views = [];
		for (var i = 0; i < this.views.length; i++) {
			if (views[i] !== view){
				views.push(views[i]);
			}
		}
		if (views.length != this.views.length){
			this.views = views;
		}
	},
	sendCollectionChange: function(collection_name, array) {
		for (var i = 0; i < this.views.length; i++) {
			this.views[i].collectionChange(collection_name, array);
		}
	},
	sendStatesToView: function(view, states_list) {
		view.recieveStatesChanges(states_list);
	},
	sendStatesToViews: function(states_list) {
		for (var i = 0; i < this.views.length; i++) {
			this.sendStatesToView(this.views[i], states_list);
		}
	},
	removeDeadViews: function(hard_deads_check){
		var i;
		if (hard_deads_check){
			for (i = 0; i < this.views.length; i++) {
				if (this.views[i].isAlive){
					this.views[i].isAlive();
				}
			}
		}
		var dead = [], alive = [];
		for (i = 0; i < this.views.length; i++) {
			if (this.views[i].dead){
				dead.push(this.views[i]);
			} else {
				alive.push(this.views[i]);
			}
		}

		if (alive.length != this.views.length){
			this.views = alive;
		}
		if (dead.length){
			for (var a in this.views_index){
				this.views_index[a] = spv.arrayExclude(this.views_index[a], dead);
			}
		}

		return this;
	},
	die: function() {
		this.killViews();
	},
	killViews: function() {
		//this.views[i] can be changed in proccess, so cache it!
		var views = this.views;
		for (var i = 0; i < views.length; i++) {
			views[i].die({skip_md_call: true});
		}
		this.removeDeadViews();
		return this;
	},
	collectViewsGarbadge: function() {
		for (var i = 0; i < this.views.length; i++) {
			this.views[i].checkDeadChildren();
		}
	},
	getViews: function(name, hard_deads_check) {
		this.removeDeadViews(hard_deads_check);
		if (name){
			return this.views_index[name];
		} else {
			return this.views;
		}
	},
	getView: function(complex_id){
		this.removeDeadViews(true);
		complex_id = complex_id || 'main';
		return this.views_index[complex_id] && this.views_index[complex_id][0];
	},
	addView: function(v, complex_id) {
		this.removeDeadViews(true);
		this.views.push( v );
		complex_id = complex_id || 'main';
		(this.views_index[complex_id] = this.views_index[complex_id] || []).push(v);
		return this;
	},
	getRooConPresentation: function(mplev_view, get_ancestor, only_by_ancestor) {
		var views = this.getViews();
		var cur;
		if (!only_by_ancestor){
			for (var i = 0; i < views.length; i++) {
				cur = views[i];
				var target = cur.root_view.getChildView(this, 'main');
				if (target == cur){
					return cur;
				}
			}
		}
		for (var jj = 0; jj < views.length; jj++) {
			cur = views[jj];
			var ancestor;
			if (mplev_view){
				ancestor = cur.getAncestorByRooViCon('all-sufficient-details', only_by_ancestor);
			} else {
				ancestor = cur.getAncestorByRooViCon('main', only_by_ancestor);
			}
			if (ancestor){
				if (get_ancestor){
					return ancestor;
				} else {
					return cur;
				}
			}
		}
	}
};

window.big_index = {};
var big_index = window.big_index;

var sync_reciever = {
	md_proxs_index: {},
	actions: {
		buildtree: function(message) {
			for (var i = 0; i < message.value.length; i++) {
				var cur = message.value[i];
				if (!this.md_proxs_index[cur._provoda_id]){
					this.md_proxs_index[cur._provoda_id] = new MDProxy();
				}
				big_index[cur._provoda_id] = true;

			}
		},
		update_states: function(message) {
			this.md_proxs_index[message._provoda_id].updateStates(message.states);
		},
		update_nesting: function(message) {
			this.md_proxs_index[message._provoda_id].updateNesting(message.name, message.value);
		}
	},

	connectAppRoot: function() {
		//window.postMessage({});
		var _this = this;
		provoda.sync_s.connectSockect({}, Math.random());

		spv.addEvent(window, 'message', function(e) {
			var data  = e.data;
			if (data && data.protocol == 'provoda'){
				if (_this.actions[data.action]){
					_this.actions[data.action].call(_this, data.message);
				}
			}
		});
		//window.postMessage
	}
};

provoda = {
	prototypes: {},
	sync_s: sync_sender,
	sync_r: sync_reciever,
	Eventor: function(){},
	StatesEmitter: function(){},
	Model: function(){},
	HModel: function() {},
	View: function(){},
	ItemsEvents: function(){},
	StatesArchiver: function(){},
	addPrototype: function(name, obj){
		if (!this.prototypes[name]){
			this.prototypes[name] = obj;
		} else{
			throw new Error('Already has such prototype');
		}
	},
	extendFromTo: function(name, base, fn){
		if (!this.prototypes[name]){
			throw new Error('there is no prototype ' + name + ' in my store');
		}
		base.extendTo(fn, this.prototypes[name]);
		return fn;
	}
};
provoda.Controller = provoda.View;

Class.extendTo(provoda.ItemsEvents, {
	init: function(event_name, eventCallback, soft_reg) {
		this.controls_list = [];
		this.event_name = event_name;
		this.eventCallback = eventCallback;
		this.soft_reg = soft_reg;
	},
	unsubcribeOld: function() {
		if (this.controls_list.length){
			for (var i = 0; i < this.controls_list.length; i++) {
				this.controls_list[i].unsubcribe();
			}
		}
	},
	setItems: function(items_list) {
		this.unsubcribeOld();
		this.items_list = items_list;
		this.controls_list = [];
		for (var i = 0; i < items_list.length; i++) {
			this.controls_list.push(
				items_list[i].on(this.event_name, this.eventCallback, {
					easy_bind_control: true,
					soft_reg: this.soft_reg
				})
			);
		}
	}

});

provoda.ItemsEvents.extendTo(provoda.StatesArchiver, {
	init: function(state_name, opts) {
		var _this = this;
		this.checkFunc = function(e) {
			var item = this;
			_this.getItemsValues(item);
		};
		this.state_name = state_name;
		this._super('state-change.' + this.state_name, this.checkFunc, true);

		this.returnResult = opts.returnResult;
		var calcR = opts.calculateResult;
		if (calcR){
			if (typeof calcR == 'function'){
				this.calculateResult = calcR;
			} else {
				if (calcR == 'some'){
					this.calculateResult = this.some;
				} else if (calcR == 'every'){
					this.calculateResult = this.every;
				}
			}

		} else {
			this.calculateResult = this.some;
		}
	},
	calculateResult: null,
	every: function(values_array) {
		for (var i = 0; i < values_array.length; i++) {
			var cur = values_array[i];
			if (!cur){
				return false;
			}
		}
		return true;
	},
	some: function(values_array, fn) {
		for (var i = 0; i < values_array.length; i++) {
			var cur = values_array[i];
			if (cur){
				return true;
			}
		}
		return false;
	},
	getItemsValues: function(item) {
		var values_list = [];
		for (var i = 0; i < this.items_list.length; i++) {
			values_list.push(this.items_list[i].state(this.state_name));
		}

		this.returnResult.call(this, this.calculateResult.call(this, values_list));
		return values_list;
	},
	unsubcribeOld: function() {
		if (this.controls_list.length){
			for (var i = 0; i < this.controls_list.length; i++) {
				this.controls_list[i].unsubcribe();
			}
		}
	},
	setItems: function(items_list) {
		this._super(items_list);
		this.checkFunc();
	}
});

var BindControl = function() {};
Class.extendTo(BindControl, {
	init: function(eventor, opts) {
		this.ev = eventor;
		this.opts = opts;
	},
	subscribe: function() {
		this.unsubcribe();
		this.ev._pushCallbackToStack(this.opts);
	},
	unsubcribe: function() {
		this.ev.off(this.opts.namespace, this.opts.cb);
	}
});

var ev_na_cache = {};

Class.extendTo(provoda.Eventor, {
	init: function(){
		this.subscribes = {};
		this.subscribes_cache = {};
		this.reg_fires = {};
		this.requests = {};
		return this;
	},
	_pushCallbackToStack: function(opts) {
		if (!this.subscribes[opts.short_name]){
			this.subscribes[opts.short_name] = [];
		}
		this.subscribes[opts.short_name].push({
			namespace: opts.namespace,
			cb: opts.cb,
			once: opts.once,
			immediately: opts.immediately
		});
		this.resetSubscribesCache(opts.namespace);
	},
	getPossibleRegfires: function(namespace) {
		var parts = namespace.split('.');
		var funcs = [];
		for (var i = parts.length - 1; i > -1; i--) {
			var posb_namespace = parts.slice(0, i + 1).join('.');
			if (this.reg_fires[posb_namespace]){
				funcs.push(this.reg_fires[posb_namespace]);
			}
		}
		return funcs;
	},
	_addEventHandler: function(namespace, cb, opts, once){
		if (this.convertEventName){
			namespace = this.convertEventName(name);
		}

		var
			fired,
			_this = this,
			name_parts = namespace.split('.'),
			short_name = name_parts[0];

		if (opts && opts.exlusive){
			this.off(namespace);
		}
		if (!opts || !opts.skip_reg){
			var reg_fires = this.getPossibleRegfires(namespace);
			if (reg_fires.length){
				reg_fires[0].call(this, function() {
					fired = true;
					var args = arguments;
					if (opts && opts.soft_reg){
						setTimeout(function() {
							cb.apply(_this, args);
						}, 0);
					} else {
						cb.apply(_this, args);
					}
				}, namespace, opts, name_parts);
			}
		}

		/*if (this.reg_fires[short_name]){
			this.reg_fires[short_name]
			
		}*/
		var subscr_opts = {
			short_name: short_name,
			namespace: namespace,
			cb: cb,
			once: once,
			immediately: opts && opts.immediately
		};

		if (!(once && fired)){
			this._pushCallbackToStack(subscr_opts);
		}
		if (opts && opts.easy_bind_control){
			var bind_control = new BindControl();
			bind_control.init(this, subscr_opts);
			return bind_control;
		} else {
			return this;
		}

	},
	once: function(namespace, cb, opts){
		return this._addEventHandler(namespace, cb, opts, true);
	},
	on: function(namespace, cb, opts){
		return this._addEventHandler(namespace, cb, opts);
	},
	off: function(namespace, cb, obj){
		if (this.convertEventName){
			namespace = this.convertEventName(name);
		}
		var
			clean = [],
			short_name = namespace.split('.')[0],
			queried = this.getMatchedCallbacks(namespace);

		if (this.subscribes[short_name]){
			if (cb || obj){
				for (var i = 0; i < queried.matched.length; i++) {
					var cur = queried.matched[i];
					if (obj ? (obj !== cur) : (cur.cb !== cb)){
						clean.push(queried.matched[i]);
					}
				}
			}
			clean.push.apply(clean, queried.not_matched);
			if (clean.length != this.subscribes[short_name].length){
				this.subscribes[short_name] = clean;
				this.resetSubscribesCache(namespace);
			}
		}

		return this;
	},
	resetSubscribesCache: function(namespace) {
		for (var cur_namespace in this.subscribes_cache){
			if (!this.subscribes_cache[cur_namespace]){
				continue;
			}
			var last_char = cur_namespace.charAt(namespace.length);
			if ((!last_char || last_char == '.') && cur_namespace.indexOf(namespace) == 0){
				this.subscribes_cache[cur_namespace] = null;
			}
		}
	},
	getMatchedCallbacks: function(namespace){
		var
			r, short_name = namespace.split('.')[0];

		var cb_cs = this.subscribes[short_name];
		if (cb_cs){
			var cached_r = this.subscribes_cache[namespace];
			if (cached_r){
				return cached_r;
			} else {
				var matched = [], not_matched = [];
				var cac_space = ev_na_cache[namespace] = (ev_na_cache[namespace] || {});
				for (var i = 0; i < cb_cs.length; i++) {
					var curn = cb_cs[i].namespace;
					var canbe_matched = cac_space[curn];
					if (typeof canbe_matched =='undefined') {
						var last_char = curn.charAt(namespace.length);
						canbe_matched = (!last_char || last_char == '.') && curn.indexOf(namespace) == 0;
						cac_space[curn] = canbe_matched;
					}
					if (canbe_matched){
						matched.push(cb_cs[i]);
					} else {
						not_matched.push(cb_cs[i]);
					}
				}
				this.subscribes_cache[namespace] = r = {matched: matched, not_matched: not_matched};
			}

		} else {
			return {
				matched: [],
				not_matched: []
			};
		}

		return r;
	},
	onRegistration: function(name, cb) {
		if (name){
			this.reg_fires[name] = cb;
		}
		return this;
	},
	callEventCallback: function(cur, args) {
		var _this = this;
		if (cur.immediately){
			cur.cb.apply(_this, args);
		} else {
			setTimeout(function() {
				cur.cb.apply(_this, args);
			},1);
		}
	},
	trigger: function(){
		var args = Array.prototype.slice.call(arguments);
		var name = args.shift();
		if (this.convertEventName){
			name = this.convertEventName(name);
		}

		var cb_cs = this.getMatchedCallbacks(name).matched;

		if (cb_cs){
			var collect = [];
			var _this = this;
			for (var i = 0; i < cb_cs.length; i++) {
				var cur = cb_cs[i];
				if (cur.immediately){
					this.callEventCallback(cur, args);
				} else {
					collect.push(cur);
				}
				
				if (cur.once){
					this.off(name, false, cur);
				}
			}
			setTimeout(function() {
				for (var i = 0; i < collect.length; i++) {
					_this.callEventCallback(collect[i], args);
				}
			},1);
		}
		return this;
	},
	getRequests: function(space) {
		space = space || 'common';
		return this.requests[space] || [];
	},
	addRequest: function(rq, opts){
		opts = opts || {};
		//space, depend
		var space = opts.space || 'common';
		if (opts.order){
			rq.order = opts.order;
		}
		if (!this.requests[space]){
			this.requests[space] = [];
		}
		var target_arr = this.requests[space];
		var _this = this;



		if (target_arr.indexOf(rq) == -1){
			if (opts.depend){
				if (rq){
					rq.addDepend(this);
				}
			}
		//	console.group(target_arr);
			target_arr.push(rq);
			this.sortRequests(target_arr, space);
		//	console.group(target_arr);
		//	console.groupEnd()
			this.trigger('request', rq, space);
		}
		rq.always(function() {
			_this.requests[space] = spv.arrayExclude(_this.requests[space], rq);
		});
		return this;

	},
	sortRequests: function(requests, space) {
		return requests.sort(function(a,b ){return spv.sortByRules(a, b, ['order']);});
	},
	getAllRequests: function() {
		var all_requests = [];
		for (var space in this.requests){
			all_requests = all_requests.concat(this.requests[space]);
		}
		return all_requests;
	},
	stopRequests: function(){

		var all_requests = this.getAllRequests();

		while (all_requests.length) {
			var rq = all_requests.pop();
			if (rq) {
				if (rq.softAbort){
					rq.softAbort(this);
				} else if (rq.abort){
					rq.abort(this);
				}
			}
		}
		this.requests = {};
		return this;
	},
	getQueued: function(space) {
		var requests = this.getRequests(space);
		return spv.filter(requests, 'queued');
	},
	setPrio: function(type, space) {
		var queued = this.getQueued(space);
		for (var i = 0; i < queued.length; i++) {
			queued[i].setPrio(type);
		}
		return this;
	}
});

var compx_names_cache = {};

var statesEmmiter = provoda.StatesEmitter;
provoda.Eventor.extendTo(provoda.StatesEmitter, {
	init: function(){
		this._super();
		this.states = {};
		this.complex_states_index = {};
		this.complex_states_watchers = [];
		this.states_changing_stack = [];
		this.onRegistration('vip-state-change', function(cb, namespace, opts, name_parts) {
			var state_name = name_parts[1];
			cb({
				value: this.state(state_name)
			});
		});

		this.onRegistration('state-change', function(cb, namespace, opts, name_parts) {
			var state_name = name_parts[1];
			cb({
				value: this.state(state_name)
			});
		});
		//this.collectCompxs();

		return this;
	},
	onExtend: function() {
		this.collectCompxs();

	},
	getCompxName: function(original_name) {
		if (typeof compx_names_cache[original_name] != 'undefined'){
			return compx_names_cache[original_name];
		}
		var name = original_name.replace(this.compx_name_test, '');
		if (original_name != name){
			compx_names_cache[original_name] = name;
			return name;
		} else {
			compx_names_cache[original_name] = null;
		}
	},
	compx_name_test: /^compx\-/,
	collectCompxs1part: function(compx_check) {
		for (var comlx_name in this){
			var name = this.getCompxName(comlx_name);
			if (name){
				compx_check[name] = true;
				this.full_comlxs_list.push({
					name: name,
					obj: this[comlx_name]
				});
			}
		}
	},
	collectCompxs2part: function(compx_check) {
		for (var comlx_name in this.complex_states){
			if (!compx_check[comlx_name]){
				this.full_comlxs_list.push({
					name: comlx_name,
					obj: this.complex_states[comlx_name]
				});
			}
		}
	},
	collectCompxs:function() {
		var compx_check = {};
		this.full_comlxs_list = [];
	//	var comlx_name;
		this.collectCompxs1part(compx_check);
		this.collectCompxs2part(compx_check);
	},
	state: function(name){
		return this.states[name];
	},
	compressStatesChanges: function(changes_list) {
		var result_changes = {};
		var result_changes_list = [];

		for (var i = 0; i < changes_list.length; i++) {
			var cur = changes_list[i];
			if (!result_changes[cur.name]){
				var obj = {name: cur.name};
				result_changes[cur.name] = obj;
				result_changes_list.push(obj);
			}
			result_changes[cur.name].value = cur.value;
		}
		return result_changes_list;
	},
	_replaceState: function(name, value, skip_handler) {
		if (name){
			var obj_to_change	= this.states,
				old_value		= obj_to_change && obj_to_change[name],
				method;

			var stateChanger = !skip_handler && (this['stch-' + name] || (this.state_change && this.state_change[name]));
			if (stateChanger){
				if (typeof stateChanger == 'function'){
					method = stateChanger;
				} else if (this.checkDepVP){
					if (this.checkDepVP(stateChanger)){
						method = stateChanger.fn;
					}
				}
			}
			//
			//value = value || false;
			//less calculations? (since false and "" and null and undefined now os equeal and do not triggering changes)
			//

			if (old_value != value){

				obj_to_change[name] = value;

				if (method){
					method.call(this, value, old_value);
				}

				return [old_value];
			}
		}
	},
	emmitStateChange: function(cur, original_state) {
		var _this = this;
		setTimeout(function() {
			_this.trigger('state-change.' + cur.name, {
				type: cur.name,
				value: cur.value,
				old_value: original_state
			});
		},1);
	},
	_updateProxy: function(changes_list, opts) {
		var i, cur;
		if (this.undetailed_states){
			for (i = 0; i < changes_list.length; i++) {
				cur = changes_list[i];
				this.undetailed_states[cur.name] = cur.value;

			}
			return this;
		}
		this.states_changing_stack.push({
			list: changes_list,
			opts: opts
		});

		if (this.collecting_states_changing){
			return this;
		}
		this.collecting_states_changing = true;

		var total_all_states_ch = [];

		//пораждать события изменившихся состояний (в передлах одного стэка/вызова)
		//для пользователя пока пользователь не перестанет изменять новые состояния
		while (this.states_changing_stack.length){
			var all_i_cg = [];
			var original_states = cloneObj({}, this.states);
			var cur_changes = this.states_changing_stack.shift();

			//получить изменения для состояний, которые изменил пользователь через публичный метод
			var changed_states = this.getChanges(cur_changes.list, cur_changes.opts);

			var all_ch_compxs = [];
			//проверить комплексные состояния
			var first_compxs_chs = this.getComplexChanges(changed_states);
			if (first_compxs_chs.length){
				all_ch_compxs = all_ch_compxs.concat(first_compxs_chs);
			}

			var current_compx_chs = first_compxs_chs;

			//довести изменения комплексных состояний до самого конца
			while (current_compx_chs.length){
				var cascade_part = this.getComplexChanges(current_compx_chs);
				current_compx_chs = cascade_part;
				if (cascade_part.length){
					all_ch_compxs = all_ch_compxs.concat(cascade_part);
				}

			}

			//собираем все группы изменений
			all_i_cg = all_i_cg.concat(changed_states, all_ch_compxs);

			//устраняем измененное дважды и более
			var result_changes_list = this.compressStatesChanges(all_i_cg);




			var called_watchers = [];
			for (i = 0; i < result_changes_list.length; i++) {
				cur = result_changes_list[i];

				//вызов внутреннего для самого объекта события
				this.trigger('vip-state-change.' + cur.name, {
					type: cur.name,
					value: cur.value,
					old_value: original_states[cur.name]
				});

				//вызов стандартного события
				this.emmitStateChange(cur, original_states[cur.name]);



				//вызов комплексного наблюдателя
				var watchers = this.complex_states_index[cur.name];
				if (watchers){
					for (var jj = 0; jj < watchers.length; jj++) {
						var watcher = watchers[jj];
						if (called_watchers.indexOf(watcher) == -1){
							this.callCSWatcher(watcher);
							called_watchers.push(watcher);
						}
					}
				}
			}
			total_all_states_ch = total_all_states_ch.concat(result_changes_list);
		}
		//устраняем измененное дважды и более
		var total_result_changes = this.compressStatesChanges(total_all_states_ch);

		if (this.sendStatesToViews){
			this.sendStatesToViews(total_result_changes);
		}


		this.collecting_states_changing = false;
		return this;
	},
	getComplexChanges: function(changes_list) {
		return this.getChanges(this.checkComplexStates(changes_list));
	},
	getChanges: function(changes_list, opts) {
		var changed_states = [];
		var i;
		for (i = 0; i < changes_list.length; i++) {
			var cur = changes_list[i];

			var old_value = this._replaceState(cur.name, cur.value, opts && opts.skip_handler);
			if (old_value){
				changed_states.push({
					name: cur.name,
					old_value: old_value[0],
					value: cur.value
				});
			}
		}
		if (changes_list.length){
			if (this.tpl){
				this.tpl.setStates(this.states);
			}
			if (this.tpls){
				for (i = 0; i < this.tpls.length; i++) {
					this.tpls[i].setStates(this.states);
				}
			}
		}
		return changed_states;
	},
	checkComplexStates: function(changed_states) {
		var list = [];
		for (var i = 0; i < changed_states.length; i++) {
			list.push(changed_states[i].name);
		}
		var co_sts = this.getTargetComplexStates(list);
		return co_sts;
	},
	getTargetComplexStates: function(state) {
		var states = spv.toRealArray(state);
		if (!state){
			throw new Error('something wrong');
		}

		var result_array = [];
		var comlx_name;



		for (var i = 0; i < this.full_comlxs_list.length; i++) {
			var cur = this.full_comlxs_list[i];
			if (states.length != spv.arrayExclude(states, cur.obj.depends_on).length ){
				cur.value = this.compoundComplexState(cur);
				result_array.push(cur);
			}
		}

		return result_array;
	},
	compoundComplexState: function(temp_comx) {
		var values = [];
		for (var i = 0; i < temp_comx.obj.depends_on.length; i++) {
			values.push(this.state(temp_comx.obj.depends_on[i]));
		}
		return temp_comx.obj.fn.apply(this, values);
	},
	iterateCSWatchers: function(state_name) {
		if (this.complex_states_index[state_name]){
			for (var i = 0; i < this.complex_states_index[state_name].length; i++) {
				this.callCSWatcher(this.complex_states_index[state_name][i]);
			}
		}
		return this;
	},
	callCSWatcher: function(watcher) {
		var args = [];
		for (var i = 0; i < watcher.states_list.length; i++) {
			args.push(this.states[watcher.states_list[i]]);
		}
		watcher.func.apply(this, args);
	},
	checkCSWatcher: function(watcher) {
		var match;
		for (var a in this.states) {
			if (watcher.states_list.indexOf(a)){
				match = true;
				break;
			}
		}
		return match;
	},
	watchStates: function(states_list, cb) {
		var watcher = {
			states_list: states_list,
			func: cb
		};

		for (var i = 0; i < states_list.length; i++) {
			var cur = states_list[i];
			if (!this.complex_states_index[cur]){
				this.complex_states_index[cur] = [];
			}
			this.complex_states_index[cur].push(watcher);

		}
		this.complex_states_watchers.push(watcher);
		if (this.checkCSWatcher(watcher)){
			this.callCSWatcher(watcher);
		}
		return this;
	}
});

var models_counters = 0;
provoda.StatesEmitter.extendTo(provoda.Model, {
	init: function(){

		this._super();

		this.onRegistration('child-change', function(cb, namespace, opts, name_parts) {
			var child_name = name_parts[1];
			var child = this.getNesting(child_name);
			if (child){
				cb({
					value: child
				});
			}
		});

		this._provoda_id = models_counters++;
		this.states = {};
		
		this.children_models = {};
		this.postStatesChanges = function(states) {
			return;
			sync_sender.pushStates(this, states);
		};
		this.postNestingChange = function(nesting_name, value) {
			return;
			sync_sender.pushNesting(this, nesting_name, value);
		};
	//	var _this = this;
		this.MDReplace = function(){};
		this.MDReplace.prototype = {
			md: this,
			getMD: function(){
				return this.md;
			}
		};
		this.md_replacer = new this.MDReplace();
		this.md_replacer._provoda_id = this._provoda_id;

		this.mpx = new MDProxy();
		this.mpx.init(this._provoda_id, this.states, this.children_models, this);
		return this;
	},
	getMDReplacer: function() {
		return this.md_replacer;
	},
	RPCLegacy: function() {
		var args = Array.prototype.slice.call(arguments);
		var method_name = args.shift();
		if (this.rpc_legacy && this.rpc_legacy[method_name]){
			this.rpc_legacy[method_name].apply(this, args);
		} else {
			this[method_name].apply(this, args);

		}
	},
	die: function(){
		this.stopRequests();
		this.mpx.die();
		this.trigger('die');
		return this;
	},
	watchChildrenStates: function(collection_name, state_name, callback) {
		//
		var _this = this;
		var items_events = new provoda.ItemsEvents();
		items_events.init('state-change.' + state_name, function() {
			callback.call(_this, {
				item: this,
				value: arguments && arguments[0] && arguments[0].value,
				args: arguments,
				items: items_events.items_list
			});
		}, true);
		this.on('child-change.' + collection_name, function(e) {
			items_events.setItems(e.value);
		});
	},
	archivateChildrenStates: function(collection_name, collection_state, statesCalcFunc, result_state_name) {
		var _this = this;
		var archiver = new provoda.StatesArchiver();
		archiver.init(collection_state, {
			returnResult: function(value) {
				_this.updateState(result_state_name || collection_state, value);
			},
			calculateResult: statesCalcFunc
		});
		this.on('child-change.' + collection_name, function(e) {
			archiver.setItems(e.value);
		});
	},
	getNesting: function(collection_name) {
		return this.children_models[collection_name];
	},
	updateNesting: function(collection_name, array, opts) {
		if (collection_name.indexOf('.') != -1){
			throw new Error('remove "." (dot) from name');
		}
		this.children_models[collection_name] = array;
		//[].concat() !?


		var event_obj = {};
		if (typeof opts == 'object'){
			cloneObj(event_obj, opts);
		}
		opts = opts || {};
		event_obj.value = array;
		this.trigger('child-change.' + collection_name, event_obj);

		if (!opts.skip_report){
			this.sendCollectionChange(collection_name, array);
		}

		return this;
	},
	sendCollectionChange: function(collection_name, array) {
		//this.removeDeadViews();
		if (this.postNestingChange){
			this.postNestingChange(collection_name, array);
		}
		this.mpx.sendCollectionChange(collection_name, array);
	},
	hasComplexStateFn: function(state_name) {
		if (this.complex_states && this.complex_states[name]){
			return true;
		}
		if (this['compx-' + state_name]){
			return true;
		}
	},

	sendStatesToViews: function(states_list) {
		//this.removeDeadViews();
		if (this.postStatesChanges){
			this.postStatesChanges(states_list);
		}

		this.mpx.sendStatesToViews(states_list);
	},
	updateManyStates: function(obj) {
		var changes_list = [];
		for (var i in obj) {
			changes_list.push({
				name: i,
				value: obj[i]
			});
		}
		this._updateProxy(changes_list);
	},
	updateState: function(name, value){
		if (name.indexOf('-') != -1 && console.warn){
			console.warn('fix prop name: ' + name);
		}
		if (this.hasComplexStateFn(name)){
			throw new Error("you can't change complex state in this way");
		}
		return this._updateProxy([{
			name: name,
			value: value
		}]);
	},
	toSimpleStructure: function(models_index, big_result) {
		models_index = models_index || {};
		var all_for_parse = [this];
		big_result = big_result || [];

		var checkModel = function(md) {
			var cur_id = md._provoda_id;
			if (!models_index[cur_id]){
				models_index[cur_id] = true;
				all_for_parse.push(md);
			}
			return cur_id;
		};

		while (all_for_parse.length) {
			var cur_md = all_for_parse.shift();
			var result = {
				_provoda_id: cur_md._provoda_id,
				name: cur_md.model_name,
				states: cloneObj({}, cur_md.states),
				map_parent: cur_md.map_parent && checkModel(cur_md.map_parent),
				children_models: {},
				map_level_num: cur_md.map_level_num
			};
			for (var state_name in result.states){
				var state = result.states[state_name];
				if (state && state._provoda_id){
					result.states[state_name] = {
						_provoda_id: checkModel(state)
					};
				}
			}

			for (var nesting_name in cur_md.children_models){
				var cur = cur_md.children_models[nesting_name];
				if (cur){
					if (cur._provoda_id){
						result.children_models = checkModel(cur);
					} else {
						var array = [];
						for (var i = 0; i < cur.length; i++) {
							array.push(checkModel(cur[i]));
						}
						result.children_models[nesting_name] = array;
					}
				}
			}
			big_result.push(result);
		}


		return big_result.reverse();
	}
});
provoda.Model.extendTo(provoda.HModel, {
	init: function(opts) {
		this._super();
		opts = opts || {};
		if (opts.app){
			this.app = opts.app;
		}
		if (!this.skip_map_init){
			this.sub_pages = {};
			if (!this.init_states){
				this.init_states = {};
			}
			if (opts.map_parent){
				this.map_parent = opts.map_parent;
			} else {
				if (!this.zero_map_level){
					throw new Error('who is your map parent model?');
				}
			}
		}
	},
	initOnce: function() {
		if (this.init_opts){
			this.init.apply(this, this.init_opts);
			this.init_opts = null;
		}
		return this;
	},
	initStates: function() {
		this.updateManyStates(this.init_states);
		this.init_states = null;
	},
	setPmdSwitcher: function(pmd) {
		this.pmd_switch = pmd;
		var _this = this;
		pmd.on('state-change.vswitched', function(e) {
			_this.checkPMDSwiched(e.value);
		}, {immediately: true});
	},
	switchPmd: function(toggle) {
		var new_state;
		if (typeof toggle == 'boolean')	{
			new_state = toggle;
		} else {
			new_state = !this.state('pmd_vswitched');
		}
		if (new_state){
			if (!this.state('pmd_vswitched')){
				this.pmd_switch.updateState('vswitched', this._provoda_id);
			}
		} else {
			if (this.state('pmd_vswitched')){
				this.pmd_switch.updateState('vswitched', false);
			}
		}
	},
	checkPMDSwiched: function(value) {
		this.updateState('pmd_vswitched', value == this._provoda_id);
	}
});

var
	requestAnimationFrame,
	cancelAnimationFrame;

(function() {
	var
		raf,
		caf,
		lastTime = 0,
		vendors = ['ms', 'moz', 'webkit', 'o'];

	if (window.requestAnimationFrame){
		raf = window.requestAnimationFrame;
		caf = window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
	} else {
		for(var x = 0; x < vendors.length && !raf; ++x) {
			raf = window[vendors[x]+'RequestAnimationFrame'];
			caf = caf ||
				window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
		}
	}

	if (!raf) {
		raf = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = 0;
			var id = window.setTimeout(function() { callback(currTime + timeToCall); },
				timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
		caf = function(id) {
			clearTimeout(id);
		};
	}
	if (!caf){
		caf = function() {};
	}
	requestAnimationFrame = raf;
	cancelAnimationFrame = caf;
}());


var Template = function() {};
var angbo = window.angbo;

Class.extendTo(Template, {
	init: function(opts) {
		this.root_node = opts.node;
		if (opts.pv_repeat_context){
			this.pv_repeat_context = opts.pv_repeat_context;
		}
		if (opts.scope){
			this.scope = opts.scope;
		}
		if (opts.spec_states){
			this.spec_states = opts.spec_states;
		}
		if (opts.callCallbacks){
			this.sendCallback = opts.callCallbacks;
		}
		this.pvTypesChange = opts.pvTypesChange;
		this.ancs = {};
		this.pv_views = [];
		this.pv_repeats = {};
		this.children_templates = {};
		this.directives_names_list = [];
		this.scope_g_list = [];

		this.states_watchers = [];
		this.stwat_index = {};
		this.pv_types = [];
		this.pv_repeats_data = [];


		var directive_name;
		for (directive_name in this.directives){
			//порядок директив важен, по идее
			//должен в результате быть таким каким он задекларирован
			this.directives_names_list.push(directive_name);
		}
		for (directive_name in this.scope_generators){
			//порядок директив важен, по идее
			//должен в результате быть таким каким он задекларирован
			this.scope_g_list.push(directive_name);
		}

		this.getPvDirectives(this.root_node);
		if (!window.angbo || !window.angbo.interpolateExpressions){
			console.log('cant parse statements');
		}
		if (this.scope){
			this.setStates(this.scope);
		}
	},
	_pvTypesChange: function() {
		if (this.pv_types_collecting){
			return;
		} else {
			if (this.pvTypesChange){
				this.pvTypesChange.call(this, this.getTypedNodes());
			}
		}
	},
	getTypedNodes: function() {
		var result = [];
		var objs = [this];
		while (objs.length){
			var cur = objs.shift();
			if (cur.pv_types.length){
				result.push(cur.pv_types);
			}

			for (var i = 0; i < cur.pv_repeats_data.length; i++) {
				if (cur.pv_repeats_data[i].array){
					objs = objs.concat(cur.pv_repeats_data[i].array);
				}
				
			}
		}
		return result;
	},
	getFieldsTreesBases: function(all_vs) {
		var sfy_values = [];
		for (var i = 0; i < all_vs.length; i++) {
			var parts = all_vs[i].split('.');
			var main_part = parts[0];
			sfy_values.push(main_part);
		}
		return sfy_values;
	},
	scope_generators:{
		'pv-view': function(node, full_declaration) {
			var attr_value = full_declaration;

			var filter_parts = attr_value.split('|');

			var filterFn;
			if (filter_parts[1]){
				var calculator = angbo.parseExpression('obj |' + filter_parts[1]);
				filterFn = function(array) {
					return calculator({obj: array});
				};
			}

			var parts = filter_parts[0].split(/\s+/gi);
			var for_model,
				coll_name,
				space;

			for (var i = 0; i < parts.length; i++) {

				var cur_part = parts[i];
				if (cur_part.indexOf('for_model:') == 0){
					for_model = cur_part.replace('for_model:', '');
				} else {
					var space_parts = cur_part.split(':');
					coll_name = space_parts[0];
					space = space_parts[1] || '';
				}

			}

			//coll_name for_model filter
			if (typeof coll_name == 'string'){
				this.pv_views.push({
					node: node,
					for_model: for_model,
					view_name: coll_name,
					space: space,
					filterFn: filterFn
				});
			}
		},
		'pv-repeat': function(node, full_declaration) {
			if (node == this.root_node){
				return;
			}
			var repeat_data = {
				array: null
			};
			this.pv_repeats_data.push(repeat_data);

			//start of angular.js code
			var expression = full_declaration;//attr.ngRepeat;
			var match = expression.match(/^\s*(.+)\s+in\s+(.*)\s*$/),
				lhs, rhs, valueIdent, keyIdent;
			if (! match) {
				throw new Error("Expected ngRepeat in form of '_item_ in _collection_' but got '" +
				expression + "'.");
			}
			lhs = match[1];
			rhs = match[2];
			match = lhs.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);
			if (!match) {
				throw new Error("'item' in 'item in collection' should be identifier or (key, value) but got '" +
				lhs + "'.");
			}
			valueIdent = match[3] || match[1];
			keyIdent = match[2];
			//end of angular.js code


			var comment_anchor = document.createComment('pv-repeat anchor for: ' + expression);
			$(node).after(comment_anchor).remove();

			var _this = this;
			var calculator = angbo.parseExpression(rhs);

			var simplifyValue;
			var setValue;

			var all_values = calculator.propsToWatch;
			var sfy_values = this.getFieldsTreesBases(all_values);
			var field_name = sfy_values[0];

			var original_fv;
			var old_nodes = [];

			this.states_watchers.push({
				values: calculator.propsToWatch,
				sfy_values: sfy_values,
				checkFunc: function(states) {
					var new_fv = spv.getTargetField(states, field_name);



					/*var new_value = calculator(states);
					if (simplifyValue){
						new_value = simplifyValue.call(_this, new_value);
					}*/
					if (original_fv != new_fv){
						var repeats_array = [];
						repeat_data.array = [];
						_this.pv_types_collecting = true;

						$(old_nodes).remove();
						old_nodes = [];

						original_fv = new_fv;
						var collection = calculator(states);

						var prev_node;

						var full_pv_context = '';
						if (_this.pv_repeat_context){
							full_pv_context = _this.pv_repeat_context + '.$.';
						}
						full_pv_context += field_name;
						
						var fragt = document.createDocumentFragment();

						for (var i = 0; i < collection.length; i++) {
							var scope = {};
							scope[valueIdent] = collection[i];
							if (keyIdent) {scope[keyIdent] = i;}
							scope.$index = i;

							scope.$first = (i === 0);
							scope.$last = (i === (collection.length - 1));
							scope.$middle = !(scope.$first || scope.$last);

							var cur_node = node.cloneNode(true);
							var template = new Template();


							template.init({
								node: cur_node,
								pv_repeat_context: full_pv_context,
								scope: scope,
								callCallbacks: _this.sendCallback
							});
							old_nodes.push(cur_node);
							$(fragt).append(cur_node);
							prev_node = cur_node;
							repeats_array.push(template);
							repeat_data.array.push(template);
						}
						$(comment_anchor).after(fragt);
						_this.pv_repeats[full_pv_context] = repeats_array;
						_this.pv_types_collecting = false;
						_this._pvTypesChange();

					//	setValue.call(_this, node, attr_obj, new_value, original_value);
					//	original_value = new_value;
					}
				}
			});
		}
	},
	directives: {
		'pv-text': function(node, full_declaration){
			this.bindStandartChange(node, {
				complex_statement: full_declaration,
				getValue: this.dom_helpres.getTextValue,
				setValue: this.dom_helpres.setTextValue
			});

		},
		'pv-class': function(node, full_declaration) {
			this.bindStandartChange(node, {
				complex_statement: full_declaration,
				getValue: this.dom_helpres.getClassName,
				setValue: this.dom_helpres.setClassName,
				simplifyValue: function(value) {
					if (!value){
						return value;
					}
					return value.replace(/\s+/gi,' ').replace(/^\s|\s$/gi,'');
				}
			});
		},
		'pv-props': function(node, full_declaration) {
			var complex_value = full_declaration;
			var complects = complex_value.match(/\S[\S\s]*?\:[\S\s]*?\{\{[\S\s]*?\}\}/gi);
			for (var i = 0; i < complects.length; i++) {
				complects[i] = complects[i].replace(/^\s*|s*?$/,'').split(/\s*\:\s*?(?=\{\{)/);
				var prop = complects[i][0];
				var statement = complects[i][1] && complects[i][1].replace(/(^\{\{)|(\}\}$)/gi,'');
				
				if (!prop || !statement){
					throw new Error('wrong declaration: ' + complex_value);
					//return;
				}
				this.bindPropChange(node, prop, statement);
			}
			//sample
			//"style.width: {{play_progress}} title: {{full_name}} style.background-image: {{album_cover_url}}"

		},
		'pv-anchor': function(node, full_declaration) {
			var anchor_name = full_declaration;
			//if (typeof anchor_name)

			if (this.ancs[anchor_name]){
				throw new Error('anchors exists');
			} else {
				this.ancs[anchor_name] = $(node);
			}

			/*
			.getAttribute('pv-anchor');

			if (typeof anchor_name == 'string'){
				
			}
			*/

		},
		'pv-type': function(node, full_declaration) {
			if (!full_declaration){
				return;
			}
			var pv_type_data = {node: node, marks: null};
			this.pv_types.push(pv_type_data);
			this.bindStandartChange(node, {
				complex_statement: full_declaration,
				getValue: function(){return '';},
				setValue: function(node, new_value, old_value){
					var types = new_value.split(/\s+/gi);
					pv_type_data.marks = {};
					for (var i = 0; i < types.length; i++) {
						if (types[i]){
							pv_type_data.marks[types[i]] = true;
						}
					}
					this._pvTypesChange();
				},
				simplifyValue: function(value) {
					if (!value){
						return value;
					}
					return value.replace(/\s+/gi,' ').replace(/^\s|\s$/gi,'');
				},
				direct_check: true
			});

			//
		},
		'pv-events': function(node, full_declaration) {
			/*
			click:Callback
			mousemove|(sp,pd):MovePoints
			*/
			var declarations = full_declaration.split(/\s+/gi);
			for (var i = 0; i < declarations.length; i++) {
				var cur = declarations[i].split(':');
				var dom_event = cur.shift();

				this.bindEvents(node, dom_event, cur);
			}
		}
	},
	dom_helpres: {
		getTextValue: function(node) {
			return $(node).text();
		},
		setTextValue: function(node, new_value, old_value) {
			$(node).text(new_value);
		},
		getClassName: function(node) {
			return node.className;
		},
		setClassName: function(node, new_value, old_value) {
			node.className = new_value;
		}
	},
	convertFieldname: function(prop_name) {
		var parts = prop_name.replace(/^-/, '').split('-');
		if (parts.length > 1){
			for (var i = 1; i < parts.length; i++) {
				parts[i] = spv.capitalize(parts[i]);
			}
		}
		return parts.join('');
	},
	bindPropChange: function(node, prop, statement) {
		var parts = prop.split('.');
		for (var i = 0; i < parts.length; i++) {
			parts[i] = this.convertFieldname(parts[i]);
		}
		prop = parts.join('.');

		this.bindStandartChange(node, {
			statement: statement,
			getValue: function(node) {
				return spv.getTargetField(node, prop);
			},
			setValue: function(node, value) {
				return spv.setTargetField(node, prop, value || '');
			}
		});
	},
	bindStandartChange: function(node, opts) {
		var calculator = opts.calculator;
		var all_vs;
		if (!calculator){
			if (opts.complex_statement){
				calculator = angbo.interpolateExpressions(opts.complex_statement);
				var all_values = spv.filter(calculator.parts,'propsToWatch');
				all_vs = [];
				all_vs = all_vs.concat.apply(all_vs, all_values);
			} else if (opts.statement){
				calculator = angbo.parseExpression(opts.statement);
				all_vs = calculator.propsToWatch;
			}
		}
		if (calculator){
			var original_value = opts.getValue.call(this, node);
			if (opts.simplifyValue){
				original_value = opts.simplifyValue.call(this, original_value);
			}

			var sfy_values = this.getFieldsTreesBases(all_vs);
			var _this = this;

			var checkFunc = function(states) {
				var new_value = calculator(states);
				if (opts.simplifyValue){
					new_value = opts.simplifyValue.call(_this, new_value);
				}
				if (original_value != new_value){
					opts.setValue.call(_this, node, new_value, original_value);
					original_value = new_value;
				}
			};

			this.states_watchers.push({
				values: all_vs,
				sfy_values: sfy_values,
				checkFunc: checkFunc
			});
			if (opts.direct_check){
				checkFunc({});
			}
		}
	},
	bindEvents: function(node, event_name, data) {
		var _this = this;
		if (!this.sendCallback){
			throw new Error('provide the events callback handler to the Template init func');
		}
		$(node).on(event_name, function(e) {
			_this.callEventCallback(e, data);
		});
	},
	callEventCallback: function(e, data) {
		this.sendCallback({
			event: e,
			callback_name: data[0],
			callback_data: data,
			pv_repeat_context: this.pv_repeat_context,
			scope: this.scope
		});
	},
	setStates: function(states) {
		var states_summ;
		if (this.spec_states){
			states_summ = {};
			if (states){
				spv.cloneObj(states_summ, states);
			}
			spv.cloneObj(states_summ, this.spec_states);

		} else {
			states_summ = states;
		}
		for (var i = 0; i < this.states_watchers.length; i++) {
			this.states_watchers[i].checkFunc(states_summ);
		}
	},
	/*
	checkValues: function(array, all_states) {
		var checked = [];

		for (var i = 0; i < array.length; i++) {
			array[i]
		}
	},*/
	handleDirective: function(directive_name, node, full_declaration, result_cache) {
		this.directives[directive_name].call(this, node, full_declaration, result_cache);
	},
	getPvViews: function(array) {
		var result = this.children_templates;
		for (var i = 0; i < array.length; i++) {
			var cur = array[i];
			var real_name = cur.view_name;
			var space = cur.space || 'main';

			if (!result[real_name]){
				result[real_name] = {};
			}
			if (!result[real_name][space]){
				result[real_name][space] = [];
			}

			result[real_name][space] = cur;
			cur.views = [];
		}
		return result;
	},

	getPvDirectives: function(vroot_node) {
		var match_stack =[];

		//var anchors = [];

		vroot_node = vroot_node && vroot_node[0] || vroot_node;
		match_stack.push(vroot_node);

		while (match_stack.length){
			var cur_node = match_stack.shift();
			if (cur_node.nodeType != 1){
				continue;
			}
			var
				i, attr_name, directive_name, attributes = cur_node.attributes,
				new_scope_generator = false, current_data = {node: cur_node};

			var attributes_list = [];
			for (i = 0; i < attributes.length; i++) {
				//создаём кэш, список "pv-*" атрибутов
				attr_name = attributes[i].name;
				if (attr_name.indexOf('pv-') == 0){
					attributes_list.push({
						name: attr_name,
						node: attributes[i]
					});
				}

			}
			//создаём индекс по имени
			var attrs_by_names = spv.makeIndexByField(attributes_list, 'name');


			if (vroot_node !== cur_node){
				//проверяем есть ли среди атрибутов директивы создающие новую область видимости
				for (i = 0; i < this.scope_g_list.length; i++) {
					directive_name = this.scope_g_list[i];
					if (attrs_by_names[directive_name] && attrs_by_names[directive_name].length){
						this.scope_generators[directive_name].call(this, cur_node, attrs_by_names[directive_name][0].node.value);
						new_scope_generator = true;
						break;
					}
				}
			}
			if (!new_scope_generator){
				for (i = 0; i < this.directives_names_list.length; i++) {
					directive_name = this.directives_names_list[i];
					if (attrs_by_names[directive_name] && attrs_by_names[directive_name].length){
						this.handleDirective(directive_name, cur_node, attrs_by_names[directive_name][0].node.value);
					}
				}

				for (i = 0; i < cur_node.childNodes.length; i++) {
					match_stack.push(cur_node.childNodes[i]);
				}
			}

		}
		this.getPvViews(this.pv_views);
		this.stwat_index = spv.makeIndexByField(this.states_watchers, 'sfy_values');
	}
});

var views_counter = 0;
var way_points_counter = 0;
provoda.StatesEmitter.extendTo(provoda.View, {
	init: function(view_otps, opts){
		this.view_id = views_counter++;
		if (view_otps.parent_view){
			this.parent_view = view_otps.parent_view;
		}
		if (view_otps.root_view){
			this.root_view = view_otps.root_view;
		}
		if (opts){
			this.opts = opts;
		}

		this._super();
		this.children = [];
		this.children_models = {};
		this.view_parts = {};
		if (!view_otps.mpx){
			throw new Error('give me model!');
		}
		this.mpx = view_otps.mpx;
		this.undetailed_states = {};
		this.undetailed_children_models = {};
		this.way_points = [];
		if (this.dom_rp){
			this.dom_related_props = [];
		}

		cloneObj(this.undetailed_states, this.mpx.states);
		cloneObj(this.undetailed_children_models, this.mpx.children_models);

		var _this = this;
		this.triggerTPLevents = function(e) {
			if (!e.pv_repeat_context){
				if (e.callback_data[1]){
					_this.RPCLegacy(e.callback_data[1]);
				} else {
					_this.tpl_events[e.callback_name].call(_this, e.event);
				}
			} else {
				_this.tpl_r_events[e.pv_repeat_context][e.callback_name].call(_this, e.event, e.scope);
			}
		};
		return this;
	},
	RPCLegacy: function() {
		this.mpx.RPCLegacy.apply(this.mpx, arguments);
	},
	children_views: {},
	canUseWaypoints: function() {
		return true;
	},
	canUseDeepWaypoints: function() {
		return true;
	},
	getWaypoints: function() {
		return this.canUseWaypoints() ? this.way_points : [];
	},
	getAllWaypoints: function(exept) {
		var  all = [];
		all = all.concat(this.getWaypoints());
		all = all.concat(this.getDeepWaypoints());
		return all;
	},
	getDeepWaypoints: function(exept) {
		var all = [];
		if (this.canUseWaypoints() && this.canUseDeepWaypoints()){
			//var views = this.getDeepChildren(exept);
			for (var i = 0; i < this.children.length; i++) {
				var cur = this.children[i];
				all = all.concat(cur.getAllWaypoints());
			}
		}

		return all;
	},
	addWayPoint: function(point, opts) {
		var obj = {
			node: point,
			canUse: opts && opts.canUse,
			simple_check: opts && opts.simple_check,
			view: this,
			wpid: ++way_points_counter
		};
		if (!opts || (!opts.simple_check && !opts.canUse)){
			//throw new Error('give me check tool!');
		}
		this.way_points.push(obj);
		return obj;
	},
	hasWaypoint: function(point) {
		var arr = spv.filter(this.way_points, 'node');
		return arr.indexOf(point) != -1;
	},
	removeWaypoint: function(point) {
		var stay = [];
		for (var i = 0; i < this.way_points.length; i++) {
			var cur = this.way_points[i];
			if (cur.node != point){
				stay.push(cur);
			} else {
				cur.removed = true;
			}
		}
		this.way_points = stay;
	},
	buildTemplate: function() {
		return new Template();
	},
	getTemplate: function(node, callCallbacks, pvTypesChange) {
		node = node[0] || node;
		var template = new Template();
		template.init({node: node, callCallbacks: callCallbacks, pvTypesChange: pvTypesChange});

		return template;
	},
	createTemplate: function() {
		if (!this.c){
			throw new Error('cant create template');
		}
		var _this = this;
		this.tpl = this.getTemplate(this.c, this.triggerTPLevents, function(arr_arr) {
			//pvTypesChange
			var old_waypoints = this.waypoints;
			var total = [];
			var i;
			for (i = 0; i < arr_arr.length; i++) {
				total = total.concat(arr_arr[i]);
			}
			var matched = [];
			for (i = 0; i < total.length; i++) {
				var cur = total[i];
				if (!cur.marks){
					continue;
				}
				if (cur.marks['hard-way-point'] || cur.marks['way-point']){
					matched.push(cur);
				}
			}
			var to_remove = old_waypoints && spv.arrayExclude(old_waypoints, matched);
			this.waypoints = matched;
			_this.updateTemplatedWaypoints(matched, to_remove);
		});
	},
	addTemplatedWaypoint: function(wp_wrap) {
		if (!this.hasWaypoint(wp_wrap.node)){
			//может быть баг! fixme!?
			//не учитывается возможность при которой wp изменил свой mark
			//он должен быть удалён и добавлен заново с новыми параметрами
			var type;
			if (wp_wrap.marks['hard-way-point']){
				type = 'hard-way-point';
			} else if (wp_wrap.marks['way-point']){
				type = 'way-point';
			}
			this.addWayPoint(wp_wrap.node, {
				canUse: function() {
					return !!(wp_wrap.marks && wp_wrap.marks[type]);
				},
				simple_check: type == 'hard-way-point'
			});
		}
	},
	updateTemplatedWaypoints: function(add, remove) {
		var i;
		if (remove){
			var nodes_to_remove = spv.filter(remove, 'node');
			for (i = 0; i < nodes_to_remove.length; i++) {
				this.removeWaypoint(nodes_to_remove[i]);
			}
		}
		for (i = 0; i < add.length; i++) {
			this.addTemplatedWaypoint(add[i]);
		}
		if (add.length){
			//console.log(add);
		}
	},
	connectChildrenModels: function() {
		var udchm = this.undetailed_children_models;
		delete this.undetailed_children_models;
		this.setMdChildren(udchm);

	},
	connectStates: function() {
		var states = this.undetailed_states;
		delete this.undetailed_states;
		this._setStates(states);

	},
	useBase: function(node) {
		this.c = node;
		this.createTemplate();
		if (this.bindBase){
			this.bindBase();
		}
	},
	createDetailes: function() {
		if (this.pv_view_node){
			this.useBase(this.pv_view_node);
		} else if (this.createBase){
			this.createBase();
		}
	},
	requestDetailesCreating: function() {
		if (!this.has_details){
			this.has_details = true;
			this.createDetailes();
		}
	},
	requestDetailes: function(){
		this.requestDetailesCreating();
		this._detailed = true;
		if (!this.manual_states_connect){
			this.connectChildrenModels();
			this.connectStates();
		}
		this.appendCon();
	},
	appendCon: function(){
		var con = this.getC();
		var anchor = this._anchor;
		if (con && anchor && anchor.parentNode){
			$(anchor).after(con);
			//anchor.parentNode.insertBefore(con[0], anchor.nextSibling);
			delete this._anchor;
			$(anchor).remove();
			this.setVisState('con-appended', true);
		} else if (con && con.parent()){
			this.setVisState('con-appended', true);
		}
	},

	getFreeCV: function(child_name, view_space, opts) {
		var md = this.getMdChild(child_name);
		if (md){
			var view = this.getFreeChildView({name: child_name, space: view_space}, md, opts);
			return view;
		} else {
			throw new Error('there is no ' + child_name + ' child model');
		}
	},
	getAFreeCV: function(child_name, view_space, opts) {
		var view = this.getFreeCV(child_name, view_space, opts);
		var anchor = view.getA();
		if (anchor){
			return anchor;
		} else {
			throw new Error('there is no anchor for view of ' + child_name + ' child model');
		}
	},
	getAncestorByRooViCon: function(view_space, strict) {
		//by root view connection
		var target_ancestor;
		var cur_ancestor = this;
		if (strict){
			cur_ancestor = cur_ancestor.parent_view;
		}
		while (!target_ancestor && cur_ancestor){
			if (cur_ancestor == this.root_view){
				break;
			} else {
				if (cur_ancestor.parent_view == this.root_view){
					if (cur_ancestor == this.root_view.getChildView(cur_ancestor.mpx, view_space)){
						target_ancestor = cur_ancestor;
						break;
					}
				}
			}

			cur_ancestor = cur_ancestor.parent_view;
		}
		return target_ancestor;
	},
	getChildView: function(mpx, view_space) {
		var complex_id = this.view_id  + '_' + view_space;
		return mpx.getView(complex_id, true);
	},
	getFreeChildView: function(address_opts, md, opts) {
		var mpx = md.mpx;
		var
			child_name = address_opts.name,
			view_space = address_opts.space || 'main',
			complex_id = this.view_id  + '_' + view_space,
			view = mpx.getView(complex_id, true);

		if (view){
			return false;
		} else {
			var ConstrObj = this.children_views[child_name];
			
			var Constr;
			if (typeof ConstrObj == 'function' && view_space == 'main'){
				Constr = ConstrObj;
			} else {
				Constr = ConstrObj[view_space];
			}
			if (!Constr && address_opts.sampleController){
				Constr = address_opts.sampleController;
			}

			view = new Constr();
			view.init({
				mpx: mpx,
				parent_view: this,
				root_view: this.root_view
			}, opts);
			mpx.addView(view, complex_id);
			this.addChildView(view, child_name);
			return view;
		}
	},
	addChildView: function(view, child_name) {
		this.children.push.call(this.children, view);
	},
	addChild: function(view, child_name) {
		if (this.children.indexOf(view) == -1){
			this.children.push.call(this.children, view);
		}
	},
	removeChildViewsByMd: function(mpx) {
		var views_to_remove = [];
		var views = mpx.getViews();
		var i;
		for (i = 0; i < this.children.length; i++) {
			var cur = this.children[i];
			if (views.indexOf(cur) != -1){
				views_to_remove.push(cur);
			}

		}
		for (i = 0; i < views_to_remove.length; i++) {
			views_to_remove[i].die();
		}
		this.children = spv.arrayExclude(this.children, views_to_remove);

	},
	getDeepChildren: function(exept) {
		var all = [];
		var big_tree = [];
		exept = spv.toRealArray(exept);

		big_tree.push(this);
		//var cursor = this;
		while (big_tree.length){
			var cursor = big_tree.shift();

			for (var i = 0; i < cursor.children.length; i++) {
				var cur = cursor.children[i];
				if (all.indexOf(cur) == -1 && exept.indexOf(cur) == -1){
					big_tree.push(cur);
					all.push(cur);
				}
			}

		}
		return all;
	},

	checkDeadChildren: function() {
		var i, alive = [];
		for (i = 0; i < this.children.length; i++) {
			if (this.children[i].dead){
				//dead.push(this.children[i]);
			} else {
				alive.push(this.children[i]);
			}
		}
		if (alive.length != this.children.length){
			this.children = alive;
		}

	},
	onDie: function(cb) {
		this.on('die', cb);
	},
	markAsDead: function(skip_md_call) {
		this.dead = true;

		this.trigger('die');
		if (!skip_md_call){
			this.mpx.removeDeadViews();
		}

		this.c = null;
		this._anchor = null;
		this.tpl = null;
		this.way_points = null;


		var i;
		if (this.dom_related_props){
			for (i = 0; i < this.dom_related_props.length; i++) {
				this[this.dom_related_props[i]] = null;
			}
		}
		var children = this.children;
		this.children = [];
		for (i = 0; i < children.length; i++) {
			children[i].markAsDead();
		}
		//debugger?
		this.view_parts = {};

	},
	remove: function() {
		var c = this.getC();
		if (c){
			c.remove();
		}
		if (this._anchor){
			$(this._anchor).remove();
		}

	},
	die: function(opts){
		if (!this.marked_as_dead){
			this.remove();
			this.markAsDead(opts && opts.skip_md_call);
			this.marked_as_dead = true;
		}
		return this;
	},
	getT: function(){
		return this.c || this.pv_view_node || $(this.getA());
	},
	getC: function(){
		return this.c;
	},
	getA: function(){
		return this._anchor || (this._anchor = document.createComment(''));

		//document.createTextNode('')
	},
	requestAll: function(){
		return this.requestDeepDetLevels();
	},
	requestDeepDetLevels: function(){
		if (this._states_set_processing || this._collections_set_processing){
			return this;
		}
		//iterate TREE
		var depth = 1;
		var incomplete = true;
		while (incomplete) {
			incomplete = this.requestDetalizationLevel(depth);
			depth++;
		}
		return this;
	},
	softRequestChildrenDetLev: function(rel_depth) {
		if (this._states_set_processing || this._collections_set_processing){
			return this;
		}
		this.requestChildrenDetLev(rel_depth);
	},
	requestChildrenDetLev: function(rel_depth){
		var incomplete = false;
		if (this.children.length && rel_depth === 0){
			return true;
		} else {
			for (var i = 0; i < this.children.length; i++) {
				var cur_incomplete = this.children[i].requestDetalizationLevel(rel_depth);
				incomplete = incomplete || cur_incomplete;
			}
			return incomplete;
		}
	},
	requestDetalizationLevel: function(rel_depth, last_request){
		if (!this._detailed){
			this.requestDetailes();
		}
		return this.requestChildrenDetLev(rel_depth - 1);
	},
	getCNode: function(c) {
		return (c = this.getC()) && (typeof length != 'undefined' ? c[0] : c);
	},
	isAlive: function(dead_doc) {
		if (this.dead){
			return false;
		} else {
			if (this.getC()){
				var c = this.getCNode();
				if (!c || (dead_doc && dead_doc === c.ownerDocument) || !spv.getDefaultView(c.ownerDocument)){
					this.markAsDead();
					return false;
				} else {
					return true;
				}
			} else {
				return true;
			}
		}
	},
	requestAnimationFrame: function(cb, el, w) {
		var c = this.getC() && (this.getC()[0] || this.getC());
		requestAnimationFrame.call(w || spv.getDefaultView(c.ownerDocument), cb);
	},
	_setStates: function(states){
		this._states_set_processing = true;
		//disallow chilren request untill all states will be setted

		this.states = {};
		var _this = this;


		var complex_states = [];


		var states_list = [];

		for (var name in states){
			states_list.push({
				name: name,
				value: states[name]
			});
		}

		this._updateProxy(states_list);
		this._states_set_processing = false;
		return this;
	},
	requireAllParts: function() {
		for (var a in this.parts_builder){
			this.requirePart(a);
		}
		return this;
	},
	getPart: function(name) {
		return this.view_parts[name];
	},
	getStateChangeHandlers: function(){
		var r = {};
		var i;
		for (i in this) {
			if (i.indexOf('stch-') == 0){
				r[i.replace('stch-','')] = this[i];
			}
		}
		if (this.state_change){
			for (i in this.state_change) {
				if (!r[i]){
					r[i] = this.state_change[i];
				}

			}
		}
		return r;
	},
	requirePart: function(name) {
		if (this.view_parts[name]){
			return this.view_parts[name];
		} else {
			this.view_parts[name] = this.parts_builder[name].call(this);
			if (!this.view_parts[name]){
				throw new Error('"return" me some build result please');
			}
			var stch_hands = this.getStateChangeHandlers();
			for (var i in stch_hands){
				if (i in this.states && typeof stch_hands[i] != 'function'){
					if (this.checkDepVP(stch_hands[i], name)){
						stch_hands[i].fn.call(this, this.states[i]);
					}
				}
			}
			return this.view_parts[name];
		}
	},
	checkDepVP: function(state_changer, builded_vp_name) {
		var has_all_dependings;
		if (builded_vp_name && state_changer.dep_vp.indexOf(builded_vp_name) == -1){
			return false;
		}
		for (var i = 0; i < state_changer.dep_vp.length; i++) {
			var cur = state_changer.dep_vp[i];
			if (!this.view_parts[cur]){
				has_all_dependings = false;
				break;
			} else {
				has_all_dependings = true;
			}
		}
		return has_all_dependings;
	},
	recieveStatesChanges: function(changes_list) {
		if (this.dead){
			return;
		}
		this._updateProxy(changes_list);
	},
	overrideStateSilently: function(name, value) {
		this._updateProxy([{
			name: name,
			value: value
		}], {skip_handler: true});
	},
	promiseStateUpdate: function(name, value) {
		this._updateProxy([{
			name: name,
			value: value
		}]);
	},
	setVisState: function(name, value) {
		this._updateProxy([{
			name: 'vis_' + name,
			value: value
		}]);
	},
	setMdChildren: function(collections) {
		this._collections_set_processing = true;
		for (var i in collections) {
			this.collectionChange(i, collections[i]);
		}
		this._collections_set_processing = false;
	},
	getMdChild: function(name, one_thing) {
		return this.children_models[name];
	},
	checkCollchItemAgainstPvView: function(name, real_array, space_name, pv_view) {
		if (!pv_view.original_node){
			pv_view.original_node = pv_view.node.cloneNode(true);
		}
		if (!pv_view.comment_anchor){
			pv_view.comment_anchor = document.createComment('collch anchor for: ' + name + ", " + space_name);
			$(pv_view.node).before(pv_view.comment_anchor);
		}

		var filtered = pv_view.filterFn ? pv_view.filterFn(real_array) : real_array;
		var _this = this;
		var getFreeView = function(cur_md, node_to_use) {
			var view = this.getFreeChildView({
				name: name,
				space: space_name,
				sampleController: provoda.Controller
			}, cur_md);

			if (view){
				if (!node_to_use){
					node_to_use = pv_view.original_node.cloneNode(true);
				}
				view.pv_view_node = $(node_to_use);
				//var model_name = mmm.model_name;

				pv_view.node = null;
				pv_view.views.push(view.view_id);

				pv_view.last_node = node_to_use;
				return view;
			}
		};

		this.appendCollection(space_name, {
			getView: pv_view.node && function(cur_md, space, preffered) {
				if (pv_view.node){
					if (!preffered || preffered.indexOf(cur_md) != -1){
						return getFreeView.call(this, cur_md, pv_view.node);
					}
					
				}
			},
			appendDirectly: function(fragt) {
				$(pv_view.comment_anchor).after(fragt);
			},
			getFreeView: function(cur) {
				return getFreeView.call(this, cur);
			}
		}, false, name, filtered);
		/*
		for (var mmm = 0; mmm < filtered.length; mmm++) {
			var cur_md = filtered[mmm];
			var view = this.getFreeChildView({
				name: name,
				space: space_name,
				sampleController: provoda.Controller
			}, cur_md);
			if (view){
				var node_to_use = pv_view.node ? pv_view.node : pv_view.original_node.cloneNode(true);
				view.pv_view_node = $(node_to_use);
				//var model_name = mmm.model_name;

				pv_view.node = null;
				pv_view.views.push(view.view_id);
				if (pv_view.last_node){
					$(pv_view.last_node).after(node_to_use);
				}
				pv_view.last_node = node_to_use;
			}
		}*/
	},
	checkCollectionChange: function(name) {
		if (this.children_models[name]){
			this.collectionChange(name, this.children_models[name]);
		}
	},
	collectionChange: function(name, array) {
		if (this.dead){
			return;
		}
		if (this.undetailed_children_models){
			this.undetailed_children_models[name] = array;
			return this;
		}

		var old_value = this.children_models[name];
		this.children_models[name] = array;

		var pv_views = spv.getTargetField(this, 'tpl.children_templates.' + name);
		if (pv_views){
			for (var space_name in pv_views){
				this.checkCollchItemAgainstPvView(name, spv.toRealArray(array), space_name, pv_views[space_name]);
			}
			this.requestAll();
		}


		var collch = this['collch-' + name];//collectionChanger
		if (collch){
			this.callCollectionChangeDeclaration(collch, name, array, old_value);
		}
		return this;
	},
	callCollectionChangeDeclaration: function(collch, name, array, old_value) {
		if (typeof collch == 'function'){
			collch.call(this, name, array, old_value);
		} else {
			var not_request, collchs;
			var collchs_limit;
			if (typeof collch == 'object'){
				not_request = collch.not_request;
				collchs = collch.spaces;
				collchs_limit = collch.limit;
			}

			collchs = collchs || spv.toRealArray(collch);

			var declarations = [];
			for (var i = 0; i < collchs.length; i++) {
				declarations.push(this.parseCollectionChangeDeclaration(collchs[i]));
			}
			var real_array = spv.toRealArray(array);
			var array_limit;
			if (collchs_limit){
				array_limit = Math.min(collchs_limit, real_array.length);
			} else {
				array_limit = real_array.length;
			}
			var min_array = real_array.slice(0, array_limit);
			for (var jj = 0; jj < declarations.length; jj++) {
				var declr = declarations[jj];
				var opts = declr.opts;
				if (typeof declr.place == 'function' || !declr.place){
					this.simpleAppendNestingViews(declr, opts, name, min_array);
					if (!not_request){
						this.requestAll();
					}
				} else {
					this.appendNestingViews(declr, opts, name, min_array, not_request);
				}
				
			}
			
		}
	},
	parseCollectionChangeDeclaration: function(collch) {
		if (typeof collch == 'string'){
			collch = {
				place: collch
			};
		}
		var place;
		/*
		{
			place: 'c',
			by_model_name: true,
			space: 'nav'
		}*/
		if (typeof collch.place == 'string'){
			place = spv.getTargetField(this, collch.place);
			if (!place){
				throw new Error('wrong place declaration: "' + collch.place + '"');
			}
		} else if (typeof collch.place == 'function') {
			place = collch.place;
		}


		return {
			place: place,
			by_model_name: collch.by_model_name,
			space: collch.space || 'main',
			strict: collch.strict,
			opts: collch.opts
		};
	},
	simpleAppendNestingViews: function(declr, opts, name, array) {
		for (var bb = 0; bb < array.length; bb++) {
			var cur = array[bb];
			this.appendFVAncorByVN({
				md: cur,
				name: (declr.by_model_name ? cur.model_name : name),
				opts: (typeof opts == 'function' ? opts.call(this, cur) : opts),
				place: declr.place,
				space: declr.space,
				strict: declr.strict
			});
		}

	},
	getPrevView: function(array, start_index, view_space, view_itself) {
		view_space = view_space || 'main';
		var complex_id = this.view_id  + '_' + view_space;

		var i = start_index - 1;
		if (i >= array.length || i < 0){
			return;
		}
		for (; i >= 0; i--) {
			var view = array[i].mpx.getView(complex_id);
			var dom_hook = view && !view.detached && view.getT();
			if (dom_hook){
				if (view_itself){
					return view;
				} else {
					return dom_hook;
				}
				
			}

		}
	},
	getNextView: function(array, start_index, view_space, view_itself) {
		view_space = view_space || 'main';
		var complex_id = this.view_id  + '_' + view_space;

		var i = start_index + 1;
		if (i >= array.length || i < 0){
			return;
		}
		for (; i < array.length; i++) {
			var view = array[i].mpx.getView(complex_id);
			var dom_hook = view && !view.detached && view.getT();
			if (dom_hook){
				if (view_itself){
					return view;
				} else {
					return dom_hook;
				}
			}
		}
	},
	appendNestingViews: function(declr, view_opts, name, array, not_request){
		this.appendCollection(declr.space, {
			appendDirectly: function(fragt) {
				declr.place.append(fragt);
			},
			getFreeView: function(cur) {
				return this.getFreeChildView({
					name: (declr.by_model_name ? cur.model_name : name),
					space: declr.space
				}, cur, (typeof view_opts == 'function' ? view_opts.call(this, cur) : view_opts));
			}
		}, view_opts, name, array, not_request);

	},
	appendCollection: function(space, funcs, view_opts, name, array, not_request) {
		var getCollPriority = this['coll-prio-' + name];
		var ordered_rend_list = getCollPriority && getCollPriority.call(this, array);
		if (ordered_rend_list){
			this.appendOrderedCollection(space, funcs, view_opts, name, array, not_request, ordered_rend_list);
		} else {
			this.appendOrderedCollection(space, funcs, view_opts, name, array, not_request);
		}
	},
	appendOrderedCollection: function(space, funcs, view_opts, name, array, not_request, ordered_rend_list) {
		var cur, view, i, prev_view, next_view;
		var detached = [];
		var ordered_part = ordered_rend_list && ordered_rend_list.shift();
		for (i = 0; i < array.length; i++) {
			cur = array[i];
			view = this.getChildView(cur.mpx, space);
			if (view){
				prev_view = this.getPrevView(array, i, space, true);
				if (prev_view){
					var current_node = view.getT();
					var prev_node = prev_view.getT();
					if (!current_node.prev().is(prev_node)){
						var parent_node = current_node[0] && current_node[0].parentNode;
						if (parent_node){
							parent_node.removeChild(current_node[0]);
						}

						view.detached = true;
						detached.push(view);
					}
				}
			}
		}
		var append_list = [];
		var ordered_complects = [];
		var complects = {};
		var createComplect = function(view, type) {
			var comt_id = view.view_id + '_' + type;
			if (!complects[comt_id]){
				var complect = {
					fragt: document.createDocumentFragment(),
					view: view,
					type: type
				};
				complects[comt_id] = complect;
				ordered_complects.push(comt_id);
			}
			return complects[comt_id];
		};
		//view_id + 'after'

		//создать контроллеры, которые уже имеют DOM в документе, но ещё не соединены с ним
		//следующий итератор получит эти views через getChildView
		if (funcs.getView){
			for (i = 0; i < array.length; i++) {
				funcs.getView.call(this, array[i], space, ordered_part);
			}
		}


		for (i = 0; i < array.length; i++) {
			cur = array[i];
			view = this.getChildView(cur.mpx, space);
			if (view && !view.detached){
				continue;
			}
			if (!view && ordered_part && ordered_part.indexOf(cur) == -1){
				continue;
			}
			prev_view = this.getPrevView(array, i, space, true);
			if (prev_view) {
				append_list.push({
					md: cur,
					complect: createComplect(prev_view, 'after')
				});
			} else {
				next_view = this.getNextView(array, i, space, true);
				if (next_view){
					append_list.push({
						md: cur,
						complect: createComplect(next_view, 'before')
					});
				} else {
					append_list.push({
						md: cur,
						complect: createComplect(false, 'direct')
					});
				}
			}
			cur.append_list = append_list;
		}
		for (i = 0; i < append_list.length; i++) {
			var append_data = append_list[i];
			cur = append_data.md;
			
			view = this.getChildView(cur.mpx, space);
			if (!view){
				view = funcs.getFreeView.call(this, cur);
				//
				//

			}
			$(append_data.complect.fragt).append(view.getT());
			//append_data.complect.fragt.appendChild(view.getT()[0]);
			//$(.fragt).append();
		}
		if (!this._collections_set_processing){
			for (i = array.length - 1; i >= 0; i--) {
				view = this.getChildView(array[i].mpx, space);
				if (view){
					view.requestDetailesCreating();
				}
			}
			
			if (!not_request){
				//this._collections_set_processing
				this.requestAll();
			}
		}
		
		for (i = 0; i < ordered_complects.length; i++) {
			var complect = complects[ordered_complects[i]];
			if (complect.type == 'after'){
				complect.view.getT().after(complect.fragt);
			} else if (complect.type == 'before'){
				complect.view.getT().before(complect.fragt);
			} else if (complect.type =='direct'){
				funcs.appendDirectly.call(this, complect.fragt);
			}
		}
		for (i = 0; i < detached.length; i++) {
			detached[i].detached = null;
		}
		if (ordered_rend_list && ordered_rend_list.length){
			var _this = this;
			setTimeout(function() {
				_this.appendOrderedCollection(space, funcs, view_opts, name, array, not_request, ordered_rend_list);
			},1);
		}
		return complects;
		//1 открепить неправильно прикреплённых
		//1 выявить соседей
		//отсортировать существующее
		//сгруппировать новое
		//присоединить новое
		//view: this.getChildView(opts.md.mpx, opts.space)
	},
	appendFVAncorByVN: function(opts) {
		var view = this.getFreeChildView({name: opts.name, space: opts.space}, opts.md, opts.opts);
		var place = opts.place;
		if (place && typeof opts.place == 'function'){
			if ((opts.strict || view) && place){
				place = opts.place.call(this, opts.md, view);
				if (!place && typeof place != 'boolean'){
					throw new Error('give me place');
				} else {
					place.append(view.getA());
				}
			}
			
		}
		
	},
	parts_builder: {}
});
if ( typeof module === "object" && typeof module.exports === "object" ) {
	module.exports = provoda;
} else {
	if ( typeof define === "function" && define.amd ) {
		define( "provoda", ['angbo'], function (angbo) { return provoda; } );
	}
}

if ( typeof window === "object" && typeof window.document === "object" ) {
	window.provoda = provoda;
}
})(window);