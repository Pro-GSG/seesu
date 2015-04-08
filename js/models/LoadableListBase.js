define(['js/libs/BrowseMap', 'spv', 'pv'], function(BrowseMap, spv, pv) {
"use strict";
var LoadableListBase = function() {};
BrowseMap.Model.extendTo(LoadableListBase, {
	hndSPlOnFocus: function(e) {
		if (e.value){
			this.preloadStart();
		}
	},
	hndSPlOnLoadAllowing: function(e) {
		if (e.value && this.state('mp_has_focus')){
			this.preloadStart();
		}
	},
	hndCheckPreviews: function(e) {
		if (!e.skip_report){
			pv.updateNesting(this, this.preview_mlist_name, e.value);
		}
	},
	bindStaCons: function() {
		this.wch(this, 'mp_has_focus', this.hndSPlOnFocus);
		this.on('state_change-more_load_available', this.hndSPlOnLoadAllowing);
		if (!this.manual_previews){
			this.on('child_change-' + this.main_list_name, this.hndCheckPreviews);
		}
	},
	init: function(opts, data, params) {
		this._super.apply(this, arguments);

		this.excess_data_items = null;
		this.loaded_nestings_items = null;
		this.loadable_lists = null;
		//this.loadable_lists[ this.main_list_name ] = [];
		pv.updateNesting(this,  this.main_list_name, []);

		var has_loader = !!this[ 'nest_req-' + this.main_list_name];
		if (has_loader){
			pv.update(this, "has_data_loader", true);
		}

		this.bindStaCons();

		if (params && params.subitems) {
			if (params.subitems[this.main_list_name]) {
				this.nextTick(this.insertDataAsSubitems, [
					this,
					this.main_list_name,
					params.subitems[this.main_list_name],
					null,
					params.subitems_source_name && params.subitems_source_name[this.main_list_name]], true);
			}
		}
	},
	'compx-list_loading': {
		depends_on: ['main_list_loading', 'preview_loading', 'id_searching'],
		fn: function(main_list_loading, prevw_loading, id_searching) {
			return main_list_loading || prevw_loading || id_searching;
		}
	},
	'compx-can_load_data': [
		['has_data_loader', 'loader_disallowed', 'has_no_access'],
		function(has_data_loader, loader_disallowed, has_no_access) {
			return has_data_loader && !loader_disallowed  && !has_no_access;
		}
	],
	'compx-can_load_more': [
		['can_load_data', 'all_data_loaded'],
		function(can_load_data, all_data_loaded) {
			return can_load_data && !all_data_loaded;
		}
	],
	'compx-more_load_available': {
		depends_on: ['can_load_more', "list_loading"],
		fn: function(can_load_more, list_loading) {
			return can_load_more && !list_loading;
		}
	},
	handleNetworkSideData: function(target, source_name, ns, data) {
		target.app.handleNetworkSideData(source_name, ns, data, target);
	},
	main_list_name: 'lists_list',
	preview_mlist_name: 'preview_list',
	preview_nesting_source: null,
	getMainListChangeOpts: function() {},
	page_limit: 30,
	getPagingInfo: function(nesting_name) {
		var page_limit = this.page_limit || this.map_parent.page_limit;
		var length = this.getLength(nesting_name);
		var has_pages = Math.floor(length/page_limit);
		var remainder = length % page_limit;
		var next_page = has_pages + 1;

		return {
			current_length: length,
			has_pages: has_pages,
			page_limit: page_limit,
			remainder: remainder,
			next_page: next_page
		};
	},
	preloadStart: function() {
		this.loadStart();
	},
	getLength: function(nesting_name) {
		nesting_name = nesting_name || this.main_list_name;
		return (this.loaded_nestings_items && this.loaded_nestings_items[ nesting_name ]) || 0;
	},
	loadStart: function() {
		if (this.state('more_load_available') && !this.getLength()){
			this.requestMoreData();
		}
	},
	requestMoreData: function(nesting_name) {
		nesting_name = nesting_name || this.main_list_name;
		if (this[ 'nest_req-' + nesting_name ]) {
			this.requestNesting( this[ 'nest_req-' + nesting_name ], nesting_name );
		}
	},

	insertDataAsSubitems: function(target, nesting_name, data_list, opts, source_name) {
		var items_list = [];
		if (data_list && data_list.length){
			var mlc_opts = target.getMainListChangeOpts();


			var splitItemData = target['nest_rq_split-' + nesting_name];
			for (var i = 0; i < data_list.length; i++) {
				


				var splited_data = splitItemData && splitItemData(data_list[i], target.getNestingSource(nesting_name, target.app));
				var cur_data = splited_data ? splited_data[0] : data_list[i],
					cur_params = splited_data && splited_data[1];

				if (target.isDataItemValid && !target.isDataItemValid(cur_data)) {
					continue;
				}
				var item = target.addItemToDatalist(cur_data, true, cur_params, nesting_name);
				if (source_name && item && item._network_source === null) {
					item._network_source = source_name;
				}
				items_list.push(item);
			}
			target.dataListChange(mlc_opts, items_list, nesting_name);
		}
	},
	getRelativeRequestsGroups: function(space) {
		var main_models = this.getNesting(this.main_list_name);
		if (!main_models || !main_models.length){
			return;
		} else {
			main_models = main_models.slice();
			var more_models = this._super(space, true);
			if (more_models){
				main_models = main_models.concat(more_models);
			}
			var clean_array = spv.getArrayNoDubs(main_models);
			var groups = [];
			for (var i = 0; i < clean_array.length; i++) {
				var reqs = clean_array[i].getModelImmediateRequests(space);
				if (reqs && reqs.length){
					groups.push(reqs);
				}
			}
			return groups;
		}
	},
	dataListChange: function(mlc_opts, items, nesting_name) {
		nesting_name = nesting_name || this.main_list_name;
		var array = this.loadable_lists && this.loadable_lists[nesting_name];
		if (this.beforeReportChange){

			array = this.beforeReportChange(array, items);
			if (!this.loadable_lists) {
				this.loadable_lists = {};
			}
			this.loadable_lists[nesting_name] = array;
		}
		pv.updateNesting(this, nesting_name, array, mlc_opts);
	},
	compareItemWithObj: function(item, data) {
		if (!this.items_comparing_props) {
			return;
		}
		for (var i = 0; i < this.items_comparing_props.length; i++) {
			var cur = this.items_comparing_props[i];
			var item_value = spv.getTargetField(item, cur[0]);
			var data_value = spv.getTargetField(data, cur[1]);
			if (item_value !== data_value) {
				return false;
			}
		}
		return true;
	},
	compareItemsWithObj: function(array, omo, soft) {
		for (var i = 0; i < array.length; i++) {
			if (this.compareItemWithObj(array[i], omo, soft)){
				return array[i];
			}
		}
	},
	addItemToDatalist: function(obj, silent, item_params, nesting_name) {
		return this.addDataItem(obj, silent, nesting_name, item_params);
	},
	addDataItem: function(obj, skip_changes, nesting_name, item_params) {
		nesting_name = nesting_name || this.main_list_name;
		if (!this.loadable_lists) {
			this.loadable_lists = {};
		}
		if (!this.loadable_lists[ nesting_name ]) {
			this.loadable_lists[ nesting_name ] = [];
		}
		var
			item,
			work_array = this.loadable_lists[ nesting_name ],
			ml_ch_opts = !skip_changes && this.getMainListChangeOpts();

		var excess_items = this.excess_data_items && this.excess_data_items[ nesting_name ];

		if (excess_items && excess_items.length){
			var matched = this.compareItemsWithObj(excess_items, obj);
			/*
			задача этого кода - сделать так, что бы при вставке новых данных всё что лежит в массиве
			"излишек" должно оставаться в конце массива
			*/
			//excess_items = this.excess_data_items[ nesting_name ];
			if (matched){
				item = matched;
				/*если совпадает с предполагаемыми объектом, то ставим наш элемент в конец рабочего массива
				и удаляем из массива "излишков", а сами излишки в самый конец */
				work_array = spv.arrayExclude(work_array, excess_items);
				excess_items = spv.arrayExclude(excess_items, matched);
				work_array.push(matched);
				work_array = work_array.concat(excess_items);

			} else {
				/* если объект не совпадает ни с одним элементом, то извлекаем все излишки,
				вставляем объект, вставляем элементы обратно */
				work_array = spv.arrayExclude(work_array, excess_items);
				work_array.push(item = this.makeItemByData(obj, item_params, nesting_name));
				work_array = work_array.concat(excess_items);


			}
			this.excess_data_items[ nesting_name ] = excess_items;
		} else {
			work_array.push(item = this.makeItemByData(obj, item_params, nesting_name));
		}
		this.loadable_lists[ nesting_name ] = work_array;
		if (!skip_changes){
			if (this.beforeReportChange){
				work_array = this.beforeReportChange( work_array, [item] );
				this.loadable_lists[ nesting_name ] = work_array;
			}
			pv.updateNesting(this, nesting_name, work_array, ml_ch_opts );
		}
		return item;
	},
	getMainlist: function() {
		if (!this.loadable_lists) {
			this.loadable_lists = {};
		}
		if (!this.loadable_lists[ this.main_list_name ]) {
			this.loadable_lists[ this.main_list_name ] = [];
		}
		return this.loadable_lists[ this.main_list_name ];
	},
	makeItemByData: function(data, item_params, nesting_name) {
		var best_constr = this['nest_rqc-' + nesting_name];
		if (best_constr) {
			/*
				['type', {
					'number': NumberConstr,
					'text': TextConstr
				}]
			*/

			if (Array.isArray(best_constr)) {
				var field = best_constr[0];
				var field_value = spv.getTargetField( data, field );
				best_constr = best_constr[1][field_value];
			}
			var netdata_as_states = best_constr.prototype.netdata_as_states;
			var network_data_as_states = best_constr.prototype.network_data_as_states;

			var data_po_pass;
			if (network_data_as_states) {
				if (netdata_as_states) {
					data_po_pass = {
						network_states: netdata_as_states(data)
					};
				} else {
					data_po_pass = {
						network_states: data
					};
				}
				
			} else {
				data_po_pass = data;
			}

			return this.initSi(best_constr, data_po_pass, item_params);

		} else if (this.subitemConstr){
			var item = new this.subitemConstr();
			item.init({
				map_parent: this,
				app: this.app
			}, data, item_params);
			return item;
		} else if (this.makeDataItem){
			return this.makeDataItem(data, item_params);
		} else {
			throw new Error('cant make item');
		}
	},
	findMustBePresentDataItem: function(obj, nesting_name) {
		nesting_name = nesting_name || this.main_list_name;
		var matched = this.compareItemsWithObj(this.getNesting( nesting_name ), obj);
		return matched || this.injectExcessDataItem(obj, nesting_name);
	},
	injectExcessDataItem: function(obj, nesting_name) {
		nesting_name = nesting_name || this.main_list_name;
		if (this.isDataInjValid && !this.isDataInjValid(obj)){
			return;
		}
		var
			work_array = (this.loadable_lists && this.loadable_lists[ nesting_name ]) || [],
			ml_ch_opts = this.getMainListChangeOpts(),
			item = this.makeItemByData(obj, false, nesting_name);

		if (!this.cant_find_dli_pos){
			if (!this.excess_data_items){
				this.excess_data_items = {};
			}
			if (!this.excess_data_items[ nesting_name ]) {
				this.excess_data_items[ nesting_name ] = [];
			}
			this.excess_data_items[ nesting_name ].push(item);
			work_array.push(item);
		} else {
			work_array.unshift(item);
		}
		if (this.beforeReportChange){
			work_array = this.beforeReportChange(work_array, [item]);

		}
		if (!this.loadable_lists) {
			this.loadable_lists = {};
		}
		this.loadable_lists[ nesting_name ] = work_array;

		pv.updateNesting(this, nesting_name, work_array, ml_ch_opts);
		return item;
	},

	//auth things:

	authInit: function() {
		var _this = this;
		if (this.map_parent){
			this.switchPmd(false);
			this.map_parent.on('state_change-mp_has_focus', function(e) {
				if (!e.value){
					_this.switchPmd(false);
				}
			});
		}
	},
	authSwitching: function(auth, AuthConstr, data) {
		var _this = this;
		var auth_rqb = this.initSi(AuthConstr, data, {auth: auth, pmd: this});


		auth_rqb.on('state_change-has_session', function(e) {
			pv.update(_this, 'has_no_auth', !e.value);
			_this.switchPmd(false);
		});

		pv.updateNesting(this, 'auth_part', auth_rqb);

		this.setPmdSwitcher(this.map_parent);

	},
	requestPage: function() {
		if (!this.state('has_no_access')){
			this.loadStart();
			this.showOnMap();
		} else {
			this.map_parent.zoomOut();
			this.switchPmd();
		}
	}


	// :auth things

});

return LoadableListBase;
});