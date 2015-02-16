define(['spv', './helpers', './PvTemplate',  'jquery'], function(spv, hp, PvTemplate, $) {
'use strict';
var $v = hp.$v;
return function(StatesEmitter, main_calls_flow, views_proxies) {
var push = Array.prototype.push;
var appendSpace = function() {
	//fixme
	//$(target).append(document.createTextNode(' '));
};

var getBaseTreeSkeleton = function(array) {
	var result = new Array(array.length);
	for (var i = 0; i < array.length; i++) {
		result[i] = {
			handled: false,
			node: null,
			parent: array[i].parent && result[ array[i].parent.chunk_num ] || null,
			chunk_num: array[i].chunk_num
		};
	}
	return result;
};


var ViewLabour = function() {
	this.has_details = null;
	this._detailed = null;
	this.dettree_incomplete = null;
	this.detltree_depth = null;
	this._states_set_processing = null;
	this._collections_set_processing = null;
	this.dclrs_fpckgs_is_clonned = false;
	this.innesting_pos_current = null;
	this.innest_prev_view = null;
	this.innest_next_view = null;

	this.demensions_key_start = null;

	this.handled_expandable_dclrs = null;

	this._anchor = null;
	//this.innesting_pos_old = null;

	this.detached = null;

	this.hndTriggerTPLevents = null;

	this.marked_as_dead = null;


	this.undetailed_states = {};
	this.undetailed_children_models = {};
};
var hndExpandViewTree = function(e) {
	if (!e.value) {
		return;
	}
	this.checkExpandableTree(e.type);

};



var stackEmergency = function(fn, eventor, args) {
	return main_calls_flow.pushToFlow(fn, eventor, args);
};
var views_counter = 1;
var way_points_counter = 0;
function View() {}
StatesEmitter.extendTo(View, {
	init: function(view_otps, opts){
		this._lbr = new ViewLabour();
		
		this.req_order_field = null;
		this.tpl = null;
		this.c = null;

		this.dead = null;
		this.pv_view_node = null;
		this.dclrs_fpckgs = this.dclrs_fpckgs;
		// this.dclrs_selectors = null;
		this.base_skeleton = null;

		this.nesting_space = view_otps.nesting_space;
		this.nesting_name = view_otps.nesting_name;

		if (this.base_tree_list) {
			this.base_skeleton = getBaseTreeSkeleton(this.base_tree_list);
		}

		this.view_id = views_counter++;
		this.parent_view = null;
		if (view_otps.parent_view){
			this.parent_view = view_otps.parent_view;
		}
		this.root_view = null;
		if (view_otps.root_view){
			this.root_view = view_otps.root_view;
		}
		this.opts = null;
		if (opts){
			this.opts = opts;
		}

		this._super();
		this.children = [];
		this.children_models = {};
		this.view_parts = null;

		if (this.parent_view && !view_otps.location_name){
			throw new Error('give me location name!');
			//используется для идентификации использования одной и тойже view внутри разнородных родительских view или разных пространств внутри одного view
		}
		this.location_name = view_otps.location_name;
		if (!view_otps.mpx){
			throw new Error('give me model!');
		}
		
		this.mpx = view_otps.mpx;
		this.proxies_space = view_otps.proxies_space || null;
		
		this.way_points = [];

		this.dom_related_props = null;
		if (this.dom_rp){
			this.dom_related_props = [];
		}

		spv.cloneObj(this._lbr.undetailed_states, this.mpx.states);
		spv.cloneObj(this._lbr.undetailed_states, this.mpx.vstates);
		spv.cloneObj(this._lbr.undetailed_children_models, this.mpx.nestings);

		if (this.base_tree_expand_states) {
			for (var i = 0; i < this.base_tree_expand_states.length; i++) {

				this.on( hp.getSTEVNameDefault(this.base_tree_expand_states[i]) , hndExpandViewTree);
			}
		}
		
		this.prsStCon.connect.parent(this);
		this.prsStCon.connect.root(this);
		return this;
	},
	handleTemplateRPC: function(method) {
		if (arguments.length === 1) {
			var bwlev_view = $v.getBwlevView(this);
			var bwlev_id = bwlev_view && bwlev_view.mpx._provoda_id;
			this.RPCLegacy(method, bwlev_id);
		} else {
			this.RPCLegacy.apply(this, arguments);
		}		
	},
	requestPage: function() {
		var bwlev_view = $v.getBwlevView(this);

		var md_id = this.mpx._provoda_id;
		bwlev_view.RPCLegacy('requestPage', md_id);
	},
	tpl_events: {
		requestPage: function() {
			this.requestPage();
		},
		followTo: function() {
			var bwlev_view = $v.getBwlevView(this);

			var md_id = this.mpx._provoda_id;
			bwlev_view.RPCLegacy('followTo', md_id);
		}
	},
	onExtend: function(props, original) {
		this._super(props);
		if (props.tpl_events) {
			this.tpl_events = {};
			spv.cloneObj(this.tpl_events, original.tpl_events);
			spv.cloneObj(this.tpl_events, props.tpl_events);
		}

		if (props.tpl_r_events) {
			this.tpl_r_events = {};
			spv.cloneObj(this.tpl_r_events, original.tpl_r_events);
			spv.cloneObj(this.tpl_r_events, props.tpl_r_events);
		}
		

	},
	'stch-map_slice_view_sources': function(state) {
		if (state) {
			if (this.parent_view.parent_view == this.root_view && this.parent_view.nesting_name == 'map_slice') {
				var arr = [];
				if (state[0]) {
					arr.push(state[0]);
				}
				push.apply(arr, state[1][this.nesting_space]);
				this.updateState('view_sources', arr);
			}
			
		}
	},
	_getCallsFlow: function() {
		return this.root_view && (this.root_view._getCallsFlow != this._getCallsFlow) && this.root_view._getCallsFlow() || main_calls_flow;
	},
	getStrucRoot: function() {
		return this.root_view;
	},
	getStrucParent: function() {
		return this.parent_view;
	},
	getNesting: function(collection_name) {
		return this.children_models[collection_name];
	},
	getWindow: function() {
		return spv.getDefaultView(this.d || this.getC()[0].ownerDocument);
	},
	demensions_cache: {},
	checkDemensionsKeyStart: function() {
		if (!this._lbr.demensions_key_start){
			var arr = [];
			var cur = this;
			while (cur.parent_view) {
				arr.push(cur.location_name);

				cur = cur.parent_view;
			}
			arr.reverse();
			this._lbr.demensions_key_start = arr.join(' ');

			//this._lbr.demensions_key_start = this.location_name + '-' + (this.parent_view && this.parent_view.location_name + '-');
		}
	},
	getBoxDemensionKey: function() {
		var args = new Array(arguments.length); //optimization
		for (var i = 0; i < arguments.length; i++) {
			args[i] = arguments[i];
			
		}
		this.checkDemensionsKeyStart();
		return this._lbr.demensions_key_start.concat(args.join('-'));

	},
	getBoxDemensionByKey: function(cb, key) {
		if (typeof this.demensions_cache[key] == 'undefined'){
			this.demensions_cache[key] = cb.call(this);
		}
		return this.demensions_cache[key];
	},
	getBoxDemension: function(cb) {
		var args = new Array(arguments.length - 1);
		for (var i = 1; i < arguments.length; i++) {
			args[i-1] = arguments[i];
		}


		var key = this.getBoxDemensionKey.apply(this, args);
		return this.getBoxDemensionByKey(cb, key);
	},
	getReqsOrderField: function() {
		if (!this.req_order_field){
			this.req_order_field = ['mdata', 'v', this.view_id, 'order'];
		}
		return this.req_order_field;
	},
	getStoredMpx: function(md) {
		if (md.stream) {
			return md.mpx;
		} else {
			return views_proxies.getMPX(this.root_view.proxies_space, md);
		}
		//
		
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
	getWaypoints: function(result_array) {
		if (!result_array) {
			throw new Error('you must apply result array');
		}
		if (this.canUseWaypoints()) {
			if (this.way_points) {
				push.apply(result_array, this.way_points);
			}
			
		}
		//return this.canUseWaypoints() ? this.way_points : [];
	},
	getAllWaypoints: function(result_array) {
		if (!result_array) {
			throw new Error('you must apply result array');
		}
		this.getWaypoints(result_array);
		this.getDeepWaypoints(result_array);

	},
	getDeepWaypoints: function(result_array) {
		if (!result_array) {
			throw new Error('you must apply result array');
		}
		if (this.canUseWaypoints() && this.canUseDeepWaypoints()){
			//var views = this.getDeepChildren(exept);
			for (var i = 0; i < this.children.length; i++) {
				var cur = this.children[i];
				cur.getAllWaypoints(result_array);
			}
		}

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
	PvTemplate: PvTemplate,
	getTemplate: function(node, callCallbacks, pvTypesChange) {
		node = node[0] || node;
		return new PvTemplate({
			node: node,
			callCallbacks: callCallbacks,
			pvTypesChange: pvTypesChange,
			struc_store: this.root_view.struc_store,
			calls_flow: this._getCallsFlow(),
			getSample: this.root_view.getSampleForTemplate
		});
	},
	parseAppendedTPLPart: function(node) {
		this.tpl.parseAppended(node, this.root_view.struc_store);
		this.tpl.setStates(this.states);
	},
	createTemplate: function(ext_node) {
		var con = ext_node || this.c;
		if (!con){
			throw new Error('cant create template');
		}

		var tpl = $v.createTemplate(this, con);
		


		
		if (!ext_node) {
			this.tpl = tpl;
		}

		return tpl;
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
		if (!this.isAlive()) {
			return;
		}
		var i = 0;
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
		var udchm = this._lbr.undetailed_children_models;
		this._lbr.undetailed_children_models = null;
		this.setMdChildren(udchm);

	},
	connectStates: function() {
		var states = this._lbr.undetailed_states;
		this._lbr.undetailed_states = null;
		this._setStates(states);

	},
	useBase: function(node) {
		this.c = node;
		this.createTemplate();
		if (this.bindBase){
			this.bindBase();
		}
	},
	createDetails: function() {
		if (this.pv_view_node){
			this.useBase(this.pv_view_node);
		} else {
			if (this.base_skeleton) {
				this.checkExpandableTree();
				if (this.c) {
					this.useBase(this.c);
				}
				if (this.expandBase) {
					this.expandBase();
				}
			} else if (this.createBase){
				this.createBase();
			}
		}
	},
	requestDetailesCreating: function() {
		if (!this._lbr.has_details){
			this._lbr.has_details = true;
			this.createDetails();
		}
	},
	requestDetailes: function(){
		this.requestDetailesCreating();
		this._lbr._detailed = true;
		if (!this.manual_states_connect){
			this.connectChildrenModels();
			this.connectStates();
		}
		this.appendCon();
	},
	appendCon: function(){
		if (this.skip_anchor_appending){
			return;
		}
		var con = this.getC();
		var anchor = this._lbr._anchor;
		if (con && anchor && anchor.parentNode){
			$(anchor).after(con);
			//anchor.parentNode.insertBefore(con[0], anchor.nextSibling);
			this._lbr._anchor = null;
			$(anchor).detach();
			this.setVisState('con_appended', true);
		} else if (con && con.parent()[0]){
			this.setVisState('con_appended', true);

		}
	},

	getFreeCV: function(child_name, view_space, opts) {
		var md = this.getMdChild(child_name);
		if (md){
			var view = this.getFreeChildView({
				by_model_name: false,
				nesting_name: child_name,
				nesting_space: view_space
			}, md, opts);
			return view;
		} else {
			throw new Error('there is no ' + child_name + ' child model');
		}
	},
	getAFreeCV: function(child_name, view_space, opts) {
		var view = this.getFreeCV(child_name, view_space, opts);
		if (view){
			var anchor = view.getA();
			if (anchor){
				return anchor;
			} else {
				throw new Error('there is no anchor for view of ' + child_name + ' child model');
			}
		}
		
	},
	getAncestorByRooViCon: function(view_space, strict) { //находит родительскую вьюху соеденённую с корневой вьюхой
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
					if ( this.root_view.matchCildrenView( cur_ancestor, view_space, 'map_slice' ) ) {
						target_ancestor = cur_ancestor;
						break;
					}

				}
			}

			cur_ancestor = cur_ancestor.parent_view;
		}
		return target_ancestor;
	},
	findMpxViewInChildren: function(mpx, nesting_space, nesting_name) {
		nesting_space = nesting_space || 'main';
		var i;
		var views = mpx.getViews();


		var children = [];

		for (i = 0; i < this.children.length; i++) {
			var cur = this.children[i];
			if (cur.nesting_space != nesting_space) {
				continue;
			}
			if (nesting_name && cur.nesting_name != nesting_name) {
				continue;
			}
			children.push(cur);
		}


		for (i = 0; i < views.length; i++) {
			if (children.indexOf(views[i]) != -1) {
				return views[i];
			}
		}
	},
	matchCildrenView: function(target_view, nesting_space, nesting_name) {
		nesting_space = nesting_space || 'main';
		for (var i = 0; i < this.children.length; i++) {
			var cur = this.children[i];
			if (cur != target_view) {
				continue;
			}
			if (nesting_space && cur.nesting_space != nesting_space) {
				continue;
			}
			if (nesting_name && cur.nesting_name != nesting_name) {
				continue;
			}
			return true;
			
		}
		return false;
	},
	getFreeChildView: function(address_opts, md, opts) {
		var mpx = this.getStoredMpx(md);
		var
			child_name = address_opts.nesting_name,
			view_space = address_opts.nesting_space || 'main',
			location_id = $v.getViewLocationId(this, address_opts.nesting_name, view_space),
			view = mpx.getView(location_id);

		if (view){
			return false;
		} else {

			var ConstrObj;
			if (address_opts.by_model_name) {

				ConstrObj = this.children_views_by_mn &&
					(this.children_views_by_mn[address_opts.nesting_name][md.model_name] ||
					this.children_views_by_mn[address_opts.nesting_name]['$default']);
				
			} else {
				ConstrObj = this.children_views[address_opts.nesting_name];
			}

			
			var Constr;
			if (typeof ConstrObj == 'function' && view_space == 'main'){
				Constr = ConstrObj;
			} else if (ConstrObj) {
				Constr = ConstrObj[view_space];
			}
			if (!Constr && address_opts.sampleController){
				Constr = address_opts.sampleController;
			}
			if (!Constr) {
				throw new Error('there is no View for ' + address_opts.nesting_name);
			}

			view = new Constr();

			if (this.used_data_structure) {

				var field_path = address_opts.by_model_name ? ['children_by_mn', child_name, md.model_name, view_space] : ['children', child_name, view_space];
				//$default must be used too
				var sub_tree = this.used_data_structure.constr_children && spv.getTargetField(this.used_data_structure.constr_children, field_path);

				if (!sub_tree) {
					sub_tree = this.used_data_structure.tree_children && spv.getTargetField(this.used_data_structure.tree_children, field_path);
				}
				if (!sub_tree) {
					//debugger;
				}

				view.used_data_structure = sub_tree;
			}


			view.init({
				mpx: mpx,
				parent_view: this,
				root_view: this.root_view,
				location_name: child_name + '-' + view_space,
				nesting_space: view_space,
				nesting_name: child_name
			}, opts);
			mpx.addView(view, location_id);
			this.addChildView(view, child_name);
			return view;
		}
	},
	getRelativeRequestsGroups: function(space) {
		var all_views = [];
		var all_requests = [];
		var iterating = [this];
		var i = 0, cur = null;
		while (iterating.length){
			cur = iterating.shift();
			for (i = 0; i < cur.children.length; i++) {
				iterating.push(cur.children[i]);
				all_views.push(cur.children[i]);
			}
		}

		for (i = 0; i < all_views.length; i++) {
			var reqs = all_views[i].getModelImmediateRequests(space);
			if (reqs && reqs.length){
				all_requests.push(reqs);
			}
		}
		return all_requests;
	},
	addChildView: function(view) {
		this.children.push.call(this.children, view);
		//fixme - possible memory leak when child is dead (this.children) 
	},
	getChildViewsByMpx: function(mpx, nesting_name) {
		var result = [];
		var views = mpx.getViews();
		var i = 0;
		for (i = 0; i < this.children.length; i++) {
			var cur = this.children[i];
			if (views.indexOf(cur) != -1 && (!nesting_name || (cur.nesting_name == nesting_name))){
				result.push(cur);
			}

		}
		return result;
	},
	removeChildViewsByMd: function(mpx, nesting_name) {
		var views_to_remove = this.getChildViewsByMpx(mpx, nesting_name);
		var i = 0;
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
		var i = 0, alive = [];
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
	markAsDead: function(skip_md_call) {
		var i = 0;
		if (this.proxies_space) {
			views_proxies.removeSpaceById(this.proxies_space);
		}
		stackEmergency(this.remove, this, [this.getC(), this._lbr._anchor]);
		this.dead = true; //new DeathMarker();
		this.stopRequests();

		hp.triggerDestroy(this);
		if (!skip_md_call){
			this.mpx.removeDeadViews();
		}

		this.c = null;

		if (this.base_skeleton) {
			for (i = 0; i < this.base_skeleton.length; i++) {
				$(this.base_skeleton[i].node);
			}
			this.base_skeleton = null;
		}


		this._lbr._anchor = null;
		if (this.tpl) {
			this.tpl.destroy();
			this.tpl = null;
		}
		
		if (this.tpls){
			for (i = 0; i < this.tpls.length; i++) {
				this.tpls[i].destroy();
			}
			this.tpls = null;
		}
		this.way_points = null;

		if (this.wp_box){
			this.wp_box = null;
		}
		if (this.pv_view_node){
			this.pv_view_node = null;
		}
		

		
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
		this.view_parts = null;

		

	},
	remove: function(con, anchor) {
		if (!con){
			con = this.getC();
		}
		if (con){
			con.remove();
		}
		if (!anchor){
			anchor = this._lbr._anchor;
		}
		if (anchor){
			$(anchor).remove();
		}

	},
	die: function(opts){
		if (!this._lbr.marked_as_dead){
			$(this.getC()).remove();
			this.markAsDead(opts && opts.skip_md_call);
			this._lbr.marked_as_dead = true;
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
		return this._lbr._anchor || (this._lbr._anchor = document.createComment(''));

		//document.createTextNode('')
	},
	requestAll: function(){
		return this.requestDeepDetLevels();
	},
	__tickDetRequest: function() {
		if (!this.isAlive()){
			return;
		}
		this._lbr.dettree_incomplete = this.requestDetalizationLevel(this._lbr.detltree_depth);
		this._lbr.detltree_depth++;
		if (this._lbr.dettree_incomplete){
			this.nextLocalTick(this.__tickDetRequest);
		}
	},
	requestDeepDetLevels: function(){
		if (this._lbr._states_set_processing || this._lbr._collections_set_processing){
			return this;
		}
		//iterate TREE
		this._lbr.detltree_depth = 1;
		this._lbr.dettree_incomplete = true;



		this.nextLocalTick(this.__tickDetRequest);
		
		return this;
	},
	softRequestChildrenDetLev: function(rel_depth) {
		if (this._lbr._states_set_processing || this._lbr._collections_set_processing){
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
	requestDetalizationLevel: function(rel_depth){
		if (!this._lbr._detailed){
			this.requestDetailes();
		}
		return this.requestChildrenDetLev(rel_depth - 1);
	},
	getCNode: function(c) {
		return (c = this.getC()) && (typeof c.length != 'undefined' ? c[0] : c);
	},
	isAliveFast: function() {
		return !this.dead;
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
	_setStates: function(states){
		this._lbr._states_set_processing = true;
		//disallow chilren request untill all states will be setted

		this.states = {};
		//var _this = this;


		//var complex_states = [];


		var states_list = [];

		for (var name in states){
			states_list.push(name, states[name]);
		}

		this._updateProxy(states_list);
		this._lbr._states_set_processing = null;
		return this;
	},
	updateTemplatesStates: function(total_ch, sync_tpl) {
		var i = 0;
		//var states = this.states;

		if (this.tpl){
			this.tpl.checkChanges(total_ch, this.states, !sync_tpl, !sync_tpl && this.current_motivator);
		}
		if (this.tpls){
			for (i = 0; i < this.tpls.length; i++) {
				this.tpls[i].checkChanges(total_ch, this.states, !sync_tpl, !sync_tpl && this.current_motivator);
			}
		}
	},
	requireAllParts: function() {
		for (var a in this.parts_builder){
			this.requirePart(a);
		}
		return this;
	},
	getPart: function(part_name) {
		return this.view_parts && this.view_parts[part_name];
	},
	collectStateChangeHandlers: (function() {
		var getUnprefixed = spv.getDeprefixFunc( 'stch-' );
		var hasPrefixedProps = hp.getPropsPrefixChecker( getUnprefixed );
		return function(props) {
			var need_recalc = false, prop;
			if (this.hasOwnProperty('state_change')){
				need_recalc = true;
			} else {
				need_recalc = hasPrefixedProps(props);

			}
			if (!need_recalc){
				return;
			}
			this._has_stchs = true;

			var has_stchh = {};
			var result = [];

			this.stch_hs_list = [];
			

			for (prop in this) {

				if (getUnprefixed( prop )){
					var real_name = getUnprefixed( prop );
					has_stchh[real_name] = true;
					result.push({
						name: real_name,
						item: this[prop]
					});

					this.stch_hs_list.push(real_name);
				}
			}

			if (this.state_change){
				for (prop in this.state_change) {
					if (!has_stchh[prop]){
						has_stchh[prop] = true;
						result.push({
							name: prop,
							item: this.state_change[prop]
						});

						this.stch_hs_list.push(prop);
					}

				}
			}

			this.stch_hs = result;
		};
	})(),
	requirePart: function(part_name) {
		if (!this.isAlive()){
			return $();
		}
		if (this.view_parts && this.view_parts[part_name]){
			return this.view_parts[part_name];
		} else {
			if (!this.view_parts){
				this.view_parts = {};
			}

			var parts_builder = this.parts_builder[part_name];

			var part = typeof parts_builder == 'string' ? this.root_view.getSample(parts_builder) : parts_builder.call(this);


			this.view_parts[part_name] = part;
			if (!this.view_parts[part_name]){
				throw new Error('"return" me some build result please');
			}

			for (var i = 0; i < this.stch_hs.length; i++) {
				var cur = this.stch_hs[i];
				if (this.states.hasOwnProperty(cur.name) && typeof cur.item != 'function'){
					if (this.checkDepVP(cur.item, part_name)){
						cur.item.fn.call(this, this.states[cur.name]);
					}
				}
				
			}
			return this.view_parts[part_name];
		}
	},
	checkDepVP: function(state_changer, builded_vp_name) {
		var has_all_dependings;
		if (builded_vp_name && state_changer.dep_vp.indexOf(builded_vp_name) == -1){
			return false;
		}
		for (var i = 0; i < state_changer.dep_vp.length; i++) {
			var cur = state_changer.dep_vp[i];
			if (!this.view_parts || !this.view_parts[cur]){
				has_all_dependings = false;
				break;
			} else {
				has_all_dependings = true;
			}
		}
		return has_all_dependings;
	},
	stackReceivedChanges: function() {
		if (!this.isAlive()){
			return;
		}
		this.nextTick(this._updateProxy, arguments);
	},
	receiveStatesChanges: function(changes_list, opts) {
		if (!this.isAlive()){
			return;
		}
		this._updateProxy(changes_list, opts);
	},
	overrideStateSilently: function(name, value) {
		this._updateProxy([name, value], {skip_handler: true});
	},
	promiseStateUpdate: function(name, value) {
		this._updateProxy([name, value]);
	},
	setVisState: function(name, value) {
		this._updateProxy(['vis_' + name, value]);
	},
	checkChildrenModelsRendering: function() {
		var obj = spv.cloneObj(false, this.children_models);
		this.setMdChildren(obj);
	},
	setMdChildren: function(collections) {
		this._lbr._collections_set_processing = true;
		//вью только что создана, присоединяем подчинённые views без деталей (детали создаются позже)
		for (var i in collections) {
			this.collectionChange(i, collections[i]);
		}
		this._lbr._collections_set_processing = null;
	},
	getMdChild: function(name) {
		return this.children_models[name];
	},
	pvserv: {
		simple: {
			
		},
		bymodel: {
			
		}
	},
	checkCollchItemAgainstPvViewByModelName: (function(){
		var getFreeView = function(cur_md, node_to_use) {
			var pv_view = this.pv_v_data.index[cur_md.model_name];
			if (!pv_view){
				return;
			}

			var view = this.view.getFreeChildView({
				by_model_name: true,
				nesting_name: this.nesname,
				nesting_space: this.space_name,
				sampleController: View
			}, cur_md);

			if (view){
				if (!node_to_use){
					node_to_use = pv_view.sampler.getClone();
					//node_to_use = pv_view.original_node.cloneNode(true);
				}
				view.pv_view_node = $(node_to_use);
				//var model_name = mmm.model_name;

				pv_view.node = null;
				pv_view.views.push(view.view_id);

				pv_view.last_node = node_to_use;
				return view;
			}
		};

		var appendDirectly = function(fragt) {
			$(this.pv_v_data.comment_anchor).after(fragt);
		};

		return function(nesname, real_array, space_name, pv_v_data) {
			var filtered = [];

			for (var i = 0; i < real_array.length; i++) {
				var cur = real_array[i];
				if (cur.model_name && pv_v_data.index[cur.model_name]){
					filtered.push(cur);
				}
			}

			//var filtered = pv_view.filterFn ? pv_view.filterFn(real_array) : real_array;

			this.appendCollection(space_name, {

				view: this,
				nesname: nesname,
				pv_v_data: pv_v_data,
				space_name: space_name,
				getFreeView: getFreeView,
				appendDirectly: appendDirectly
			}, false, nesname, filtered);
		};
	})(),

	checkCollchItemAgainstPvView:(function() {
		var getView = function(cur_md, space, preffered) {
			if (this.pv_view.node){
				if (!preffered || preffered.indexOf(cur_md) != -1){
					return this.getFreeView(cur_md, this.pv_view.node);
				}
			}
		};

		var getFreeView = function(cur_md, node_to_use) {
			var pv_view = this.pv_view;
			var view = this.view.getFreeChildView({
				by_model_name: false,
				nesting_name: this.nesname,
				nesting_space: this.space_name,
				sampleController: View
			}, cur_md);

			if (view){
				if (!node_to_use){
					//node_to_use = pv_view.original_node.cloneNode(true);
					node_to_use = pv_view.sampler.getClone();
				}
				view.pv_view_node = $(node_to_use);
				//var model_name = mmm.model_name;

				pv_view.node = null;
				pv_view.views.push(view.view_id);

				pv_view.last_node = node_to_use;
				return view;
			}
		};

		var appendDirectly = function(fragt) {
			$(this.pv_view.comment_anchor).after(fragt);
		};

		return function(nesname, real_array, space_name, pv_view) {
		//	if (!pv_view.original_node){
		//		pv_view.original_node = pv_view.node.cloneNode(true);
				
		//	}
			if (!pv_view.comment_anchor){
				pv_view.comment_anchor = document.createComment('collch anchor for: ' + nesname + ", " + space_name);
				$(pv_view.node).before(pv_view.comment_anchor);
			}

			if (pv_view.node){
				$(pv_view.node).detach();
				pv_view.node = null;
			}
			
			var filtered = pv_view.filterFn ? pv_view.filterFn(real_array) : real_array;

			this.appendCollection(space_name, {
				view: this,
				pv_view: pv_view,
				nesname: nesname,
				space_name: space_name,
				getView: pv_view.node && getView,
				appendDirectly: appendDirectly,
				getFreeView: getFreeView
			}, false, nesname, filtered);

		};
	})(),
	checkCollectionChange: function(nesname) {
		if (!this.dclrs_fpckgs){
			throw new Error('there is no declarations');
		}
		if (!this.dclrs_fpckgs[ '$ondemand-' + nesname ]){
			throw new Error('there is no "$ondemand-" declaration for: ' + nesname);
		}
		if (this.dclrs_fpckgs.hasOwnProperty(nesname)){
			throw new Error('constant declaration exist for nesting named "' + nesname + '"');
		}

		if (!this._lbr.dclrs_fpckgs_is_clonned){
			this._lbr.dclrs_fpckgs_is_clonned = true;
			var new_cache = {};
			spv.cloneObj(new_cache, this.dclrs_fpckgs);
			this.dclrs_fpckgs = new_cache;
		}
		

		this.dclrs_fpckgs[nesname] = this.dclrs_fpckgs[ '$ondemand-' + nesname ];
		if (this.children_models[nesname]){

			this.collectionChange(nesname, this.children_models[nesname]);
		}
	},
	tpl_children_prefix: 'tpl.children_templates.',
	stackCollectionChange: function() {
		this.nextTick(this.collectionChange, arguments);
	},
	collectionChange: function(nesname, array, rold_value, removed) {
		if (!this.isAlive()){
			return;
		}
		if (this._lbr.undetailed_children_models){
			this._lbr.undetailed_children_models[nesname] = array;
			return this;
		}

		var old_value = this.children_models[nesname];
		this.children_models[nesname] = array;

		var pv_views_complex_index = spv.getTargetField(this, this.tpl_children_prefix + nesname);
		if (!pv_views_complex_index && this.tpls) {
			for (var i = 0; i < this.tpls.length; i++) {
				pv_views_complex_index = spv.getTargetField(this.tpls[i], ['children_templates', nesname]);
				if (pv_views_complex_index) {
					break;
				}
			}
		}
		if (pv_views_complex_index){
			var space_name;
			array = spv.toRealArray(array);
			if (removed && removed.length) {
				for (space_name in pv_views_complex_index.usual){
					this.removeViewsByMds(removed, nesname, space_name);
				}
				for (space_name in pv_views_complex_index.by_model_name){
					this.removeViewsByMds(removed, nesname, space_name);
				}
			}
			

			for (space_name in pv_views_complex_index.usual){
				this.checkCollchItemAgainstPvView(nesname, array, space_name, pv_views_complex_index.usual[space_name]);
			}
			for (space_name in pv_views_complex_index.by_model_name){
				this.checkCollchItemAgainstPvViewByModelName(nesname, array, space_name, pv_views_complex_index.by_model_name[space_name]);
			}
			/*
			for (var 
				i = 0; i < space.length; i++) {
				space[i]
			};*/


			this.requestAll();
		}


		var collch = this.dclrs_fpckgs && this.dclrs_fpckgs.hasOwnProperty(nesname) && this.dclrs_fpckgs[nesname];
		if (typeof collch == 'function') {
			this.callCollectionChangeDeclaration(collch, nesname, array, old_value, removed);
		} else {
			if (this.dclrs_selectors && this.dclrs_selectors.hasOwnProperty(nesname)) {
				if (Array.isArray(array)) {
					for (var i = 0; i < array.length; i++) {
						var cur = array[i];
						var dclr = $v.selecPoineertDeclr(this.dclrs_fpckgs, this.dclrs_selectors,
							nesname, cur.model_name, this.nesting_space);

						if (!dclr) {
							dclr = collch;
						}

						throw new Error('WHAT TO DO WITH old_value?');
						this.callCollectionChangeDeclaration(dclr, nesname, cur, old_value, removed);
					}
				} else {
					var dclr = $v.selecPoineertDeclr(this.dclrs_fpckgs, this.dclrs_selectors,
							nesname, array.model_name, this.nesting_space);

					if (!dclr) {
						dclr = collch;
					}
					this.callCollectionChangeDeclaration(dclr, nesname, array, old_value, removed);
				}
			} else {
				if (collch) {
					this.callCollectionChangeDeclaration(collch, nesname, array, old_value, removed);
				}
			}
		}

		this.checkDeadChildren();
		return this;
	},
	removeViewsByMds: function(array, nesname, space) {
		if (!array){
			return;
		}
		var location_id = $v.getViewLocationId(this, nesname, space || 'main');
		for (var i = 0; i < array.length; i++) {

			var view = this.getStoredMpx(array[i]).getView(location_id);
			if (view){
				view.die();
			} else {
				//throw 'wrong';
			}
		}
	},
	changeChildrenViewsDeclarations: function(props) {
		var nesting_name, cur;
		if (props.children_views) {
			for (nesting_name in this.children_views) {
				cur = this.children_views[nesting_name];
				if (typeof cur == 'function') {
					this.children_views[nesting_name] = {
						main: cur
					};
				}
			}
		}
		if (props.children_views_by_mn) {
			for (nesting_name in this.children_views_by_mn) {
				for (var model_name in this.children_views_by_mn[nesting_name]) {
					cur = this.children_views_by_mn[nesting_name][model_name];
					if (typeof cur == 'function') {
						this.children_views_by_mn[nesting_name][model_name] = {
							main: cur
						};
					}
				}
			}
		}

	},
	collectSelectorsOfCollchs: (function(){
		var parseCollchSel = spv.memorize(function(str) {
			var parts = str.split('/');
			var model_name = parts[1];
			var parent_space_name = parts[2];
			var prio = 0;
			if (model_name) {
				prio += 2;
			}
			if (parent_space_name) {
				prio += 1;
			}

			var key = '';
			if (model_name) {
				key += model_name;
			}
			if (parent_space_name) {
				key += '/' + parent_space_name;
			}

			return {
				nesting_name : parts[0],
				model_name: parts[1] || null,
				parent_space_name: parts[2] || null,
				prio: prio,
				key: key
			};
		});

		var getUnprefixed = spv.getDeprefixFunc( 'sel-coll-' );
		var hasPrefixedProps = hp.getPropsPrefixChecker( getUnprefixed );
		return function(props){
			var need_recalc = hasPrefixedProps( props );
			if (!need_recalc){
				return;
			}

			var prop;

			this.dclrs_selectors = {};

			for (prop in this){
				if (getUnprefixed( prop )){
					var collch = this[ prop ];
					var selector_string = getUnprefixed( prop );
					//this.dclrs_selectors[selector_string] = collch;
					var selector = parseCollchSel(selector_string);
					if (!this.dclrs_selectors.hasOwnProperty(selector.nesting_name)) {
						this.dclrs_selectors[selector.nesting_name] = {};
					}
					this.dclrs_selectors[selector.nesting_name][selector.key] = collch;

					// this.dclrs_selectors[selector.nesting_name].push({
					// 	selector: selector,
					// 	collch: collch
					// });


				}
			}
			return true;
		};
	})(),
	collectCollectionChangeDeclarations: (function() {
		var solvingOf = function(declr) {
			var by_model_name = declr.by_model_name;
			var space = declr.space != 'main' && declr.space;
			var is_wrapper_parent = declr.is_wrapper_parent;
			var needs_expand_state = declr.needs_expand_state;
			if (by_model_name || space || is_wrapper_parent || needs_expand_state) {
				return {
					by_model_name: by_model_name,
					space: space,
					is_wrapper_parent: is_wrapper_parent,
					needs_expand_state: needs_expand_state
				};
			}
		};
		var parseCollectionChangeDeclaration = function(collch) {
			if (typeof collch == 'string'){
				collch = {
					place: collch
				};
			}
			var expand_state = collch.needs_expand_state;
			if (expand_state && typeof expand_state != 'string') {
				expand_state = 'can_expand';
			}

			var is_wrapper_parent = collch.is_wrapper_parent &&  collch.is_wrapper_parent.match(/^\^+/gi);

			var declr = {
				place: collch.place,
				by_model_name: collch.by_model_name,
				space: collch.space || 'main',
				strict: collch.strict,
				is_wrapper_parent: is_wrapper_parent && is_wrapper_parent[0].length,
				opts: collch.opts,
				needs_expand_state: expand_state || null,
				not_request: collch.not_request,
				limit: collch.limit,
				solving: null
			};
			var solving = solvingOf(declr);
			if (solving) {
				declr.solving = solving;
			}
			return declr;
		};
		var getUnprefixed = spv.getDeprefixFunc(  'collch-' );
		var hasPrefixedProps = hp.getPropsPrefixChecker( getUnprefixed );
		return function(props) {
			var need_recalc = hasPrefixedProps( props );
		

			if (!need_recalc){
				return;
			}
			var prop;

			this.dclrs_fpckgs = {};

			for (prop in this){
				if (getUnprefixed( prop )){
					var collch = this[ prop ];
					var nesting_name = getUnprefixed( prop );
					if (typeof collch == 'function'){
						this.dclrs_fpckgs[ nesting_name ] = collch;
					} else {
						if (Array.isArray(collch)) {
							throw new Error('do not support arrays anymore');
						}
						this.dclrs_fpckgs[ nesting_name ] = parseCollectionChangeDeclaration(collch);
					}

				}
			}
			return true;
		};
	})(),
	callCollectionChangeDeclaration: function(dclr_fpckg, nesname, array, old_value, removed) {
		if (typeof dclr_fpckg == 'function'){
			dclr_fpckg.call(this, nesname, array, old_value, removed);
		} else {
			
			var real_array = spv.toRealArray(array);
			var array_limit;
			if (dclr_fpckg.limit){
				array_limit = Math.min(dclr_fpckg.limit, real_array.length);
			} else {
				array_limit = real_array.length;
			}
			var min_array = real_array.slice(0, array_limit);
			var declr = dclr_fpckg;
			if (typeof declr.place == 'string'){
				var place = spv.getTargetField(this, declr.place);
				if (!place){
					throw new Error('wrong place declaration: "' + declr.place + '"');
				}
			}
			var opts = declr.opts;
			this.removeViewsByMds(removed, nesname, declr.space);
			if (typeof declr.place == 'function' || !declr.place){
				this.simpleAppendNestingViews(declr, opts, nesname, min_array);
				if (!dclr_fpckg.not_request){
					this.requestAll();
				}
			} else {
				this.appendNestingViews(declr, opts, nesname, min_array, dclr_fpckg.not_request);
			}
		}
	},

	simpleAppendNestingViews: function(declr, opts, nesname, array) {
		for (var bb = 0; bb < array.length; bb++) {
			var cur = array[bb];
			var original_md;
			if (declr.is_wrapper_parent) {
				original_md = cur;
				for (var i = 0; i < declr.is_wrapper_parent; i++) {
					cur = cur.getParentMapModel();
				}
			}


			this.appendFVAncorByVN({
				md: cur,
				original_md: original_md,
				by_model_name: declr.by_model_name,
				name: nesname,
				opts: (typeof opts == 'function' ? opts.call(this, cur, original_md) : opts),
				place: declr.place,
				space: declr.space,
				strict: declr.strict
			});
		}

	},
	getPrevView: function(array, start_index, location_id, view_itself) {
		

		var i = start_index - 1;
		if (i >= array.length || i < 0){
			return;
		}
		for (; i >= 0; i--) {
			var view = this.getStoredMpx(array[i]).getView(location_id);
			var dom_hook = view && !view._lbr.detached && view.getT();
			if (dom_hook){
				if (view_itself){
					return view;
				} else {
					return dom_hook;
				}
			}

		}
	},
	getNextView: function(array, start_index, location_id, view_itself) {
		var i = start_index + 1;
		if (i >= array.length || i < 0){
			return;
		}
		for (; i < array.length; i++) {
			var view = this.getStoredMpx(array[i]).getView(location_id);
			var dom_hook = view && !view._lbr.detached && view.getT();
			if (dom_hook){
				if (view_itself){
					return view;
				} else {
					return dom_hook;
				}
			}
		}
	},
	appen_ne_vws: {
		appendDirectly: function(fragt) {
			this.place.append(fragt);
		},
		getFreeView: function(cur) {
			return this.view.getFreeChildView({
				by_model_name: this.by_model_name,
				nesting_name: this.nesname,
				nesting_space: this.space
			}, cur, (typeof this.view_opts == 'function' ? this.view_opts.call(this.view, cur) : this.view_opts));
		}
	},
	appendNestingViews: function(declr, view_opts, nesname, array, not_request){
		var place;
		if (typeof declr.place == 'string'){
			place = spv.getTargetField(this, declr.place);
		} else if (typeof declr.place == 'function'){
			//place = spv.getTargetField(this, declr.place);
		}

		array = array && array.map(function(cur) {
			for (var i = 0; i < declr.is_wrapper_parent; i++) {
				cur = cur.getParentMapModel();
			}
			return cur;
		});

		this.appendCollection(declr.space, {
			view: this,
			place: place,
			nesname: nesname,
			space: declr.space,
			by_model_name: declr.by_model_name,
			view_opts: view_opts,
			appendDirectly: this.appen_ne_vws.appendDirectly,
			getFreeView: this.appen_ne_vws.getFreeView
		}, view_opts, nesname, array, not_request);

	},
	coll_r_prio_prefix: 'coll-prio-',
	getRendOrderedNesting: function(nesname, array) {
		var getCollPriority = this[this.coll_r_prio_prefix + nesname];
		return getCollPriority && getCollPriority.call(this, array);
	},
	appendCollection: function(space, funcs, view_opts, nesname, array, not_request) {
		var location_id = $v.getViewLocationId(this, nesname, space || 'main');

		

		var ordered_rend_list = this.getRendOrderedNesting(nesname, array);
		if (ordered_rend_list){
			this.appendOrderedCollection(space, funcs, view_opts, array, not_request, ordered_rend_list);
		} else {
			this.appendOrderedCollection(space, funcs, view_opts, array, not_request);
		}



		//исправляем порядковый номер вьюхи в нэстинге
		var counter = 0;
		for (var i = 0; i < array.length; i++) {
			var view = this.getStoredMpx(array[i]).getView(location_id);
			if (view) {
				view._lbr.innesting_pos_current = counter;

				var $first = counter === 0;
				var $last = counter === (array.length - 1);

				view.updateState('$index', counter);
				view.updateState('$first', $first);
				view.updateState('$last', $last);
				view.updateState('$middle', !($first || $last));

				counter++;
			}
		}
	},
	createDOMComplect: function(complects, ordered_complects, view, type) {
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
	},
	appendOrderedCollection: function(space, funcs, view_opts, array, not_request, ordered_rend_list) {
		if (!this.isAlive()){
			return;
		}
		var cur = null, view = null, i = 0, prev_view = null, next_view = null;

		var location_id = $v.getViewLocationId(this, funcs.nesname, space || 'main');
		var detached = [];
		var ordered_part;

		while (!ordered_part && ordered_rend_list && ordered_rend_list.length){
			ordered_part = ordered_rend_list && ordered_rend_list.shift();
			if (ordered_part && ordered_part.length == array && array.length){
				ordered_part = null;
			}
			if (ordered_part) {
				//если у всех приоритезированных моделей уже есть вьюхи, то не не используем преоритезацию
				var has_any_nonviewed = false;
				for (i = 0; i < ordered_part.length; i++) {
					if (this.getStoredMpx(ordered_part[i]).getView(location_id)){
						has_any_nonviewed = true;
					}
				}
				if (!has_any_nonviewed){
					ordered_part = null;
				}
			}
		}

		//если сосед имевший меньший номер теперь имеет номер больше значит нас сместили в начало
		//если сосед имел больший, а теперь меньше, нас сместили в конец


		for (i = 0; i < array.length; i++) {
			cur = array[i];
			view = this.getStoredMpx(cur).getView(location_id);
			if (view){
				prev_view = this.getPrevView(array, i, location_id, true);
				if (prev_view){
					var current_node = view.getT();
					var prev_node = prev_view.getT();
					if (!current_node.prev().is(prev_node)){
						var parent_node = current_node[0] && current_node[0].parentNode;
						if (parent_node){
							parent_node.removeChild(current_node[0]);
						}
						view.setVisState('con_appended', false);

						view._lbr.detached = true;
						detached.push(view);
					}
				}
			}
		}
		var append_list = [];
		var ordered_complects = [];
		var complects = {};
		//view_id + 'after'

		//создать контроллеры, которые уже имеют DOM в документе, но ещё не соединены с ним
		//следующий итератор получит эти views через getChildView
		if (funcs.getView){
			for (i = 0; i < array.length; i++) {
				funcs.getView( array[i], space, ordered_part);
			}
		}


		for (i = 0; i < array.length; i++) {
			cur = array[i];
			view = this.getStoredMpx(cur).getView(location_id);
			if (view && !view._lbr.detached){
				continue;
			}
			if (!view && ordered_part && ordered_part.indexOf(cur) == -1){
				continue;
			}
			prev_view = this.getPrevView(array, i, location_id, true);

			if (prev_view && prev_view.state('vis_con_appended')) {
				append_list.push(cur, this.createDOMComplect(complects, ordered_complects, prev_view, 'after'));
			} else {
				next_view = this.getNextView(array, i, location_id, true);
				if (next_view && next_view.state('vis_con_appended')){
					append_list.push(cur, this.createDOMComplect(complects, ordered_complects, next_view, 'before'));
				} else {
					append_list.push(cur, this.createDOMComplect(complects, ordered_complects, false, 'direct'));
				}
			}
			//cur.append_list = append_list;
		}
		var apd_views = new Array(append_list.length/2);
		for (i = 0; i < append_list.length; i+=2) {
			cur = append_list[ i ];
			var complect = append_list[ i + 1 ];

			view = this.getStoredMpx(cur).getView(location_id);
			if (!view){
				view = funcs.getFreeView(cur);
			}
			apd_views[i/2] = view;
			//append_data.view = view;
			view.skip_anchor_appending = true;
			var fragt = $(complect.fragt);
			fragt.append(view.getT());
			appendSpace(fragt);
			//append_data.complect.fragt.appendChild(view.getT()[0]);
			//$(.fragt).append();
		}
		if (!this._lbr._collections_set_processing){
			for (i = array.length - 1; i >= 0; i--) {
				view = this.getStoredMpx(array[i]).getView(location_id);
				if (view){
					view.requestDetailesCreating();
				}
			}
			if (!not_request){
				//this._lbr._collections_set_processing
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
				funcs.appendDirectly(complect.fragt);
			}
		}
		for (i = 0; i < detached.length; i++) {
			detached[i]._lbr.detached = null;
		}
		if (ordered_part && ordered_part.length){
			this.nextLocalTick(this.appendOrderedCollection, [space, funcs, view_opts, array, not_request, ordered_rend_list]);
			//fixme can be bug (если nesting изменён, то измнения могут конфликтовать)
		}


		for (i = 0; i < array.length; i++) {
			view = this.getStoredMpx(array[i]).getView(location_id);
			if (view){
				view._lbr.innest_prev_view = this.getPrevView(array, i, location_id, true);
				view._lbr.innest_next_view = this.getNextView(array, i, location_id, true);
				
			}
			
		}

		for (i = 0; i < apd_views.length; i++) {
			cur = apd_views[i];
			cur.skip_anchor_appending = null;
			cur.appendCon();
		}
		return complects;
		//1 открепить неправильно прикреплённых
		//1 выявить соседей
		//отсортировать существующее
		//сгруппировать новое
		//присоединить новое
	},
	appendFVAncorByVN: function(opts) {
		var view = this.getFreeChildView({
			by_model_name: opts.by_model_name,
			nesting_name: opts.name,
			nesting_space: opts.space
		}, opts.md, opts.opts);
		var place = opts.place;
		if (place && typeof opts.place == 'function'){
			if ((opts.strict || view) && place){
				place = opts.place.call(this, opts.md, view, opts.original_md);
				if (!place && typeof place != 'boolean'){
					throw new Error('give me place');
				} else {
					place.append(view.getA());
					appendSpace(place);
				}
			}

		}
	},
	parts_builder: {}
});

return View;
};
});