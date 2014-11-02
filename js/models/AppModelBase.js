define(['pv', 'spv', '../libs/BrowseMap'], function(pv, spv, BrowseMap) {
"use strict";
var binded_models = {};
var AppModelBase = function() {};
pv.Model.extendTo(AppModelBase, {
	init: function() {
		this._super();
		this.navigation = [];
		this.map = new BrowseMap();
		this.current_mp_md = null;
		this.on('child_change-current_mp_md', function(e) {
			if (e.target){
				this.resortQueue();
			}

		});
		this.views_strucs = {};
	},
	initMapTree: function(start_page, needs_url_history, navi) {
			
		pv.updateNesting(this, 'navigation', [start_page]);
		pv.updateNesting(this, 'start_page', start_page);
		this.map
			.init(this.start_page)
			
			.on('changes', function(changes, tree, residents) {
				//console.log(changes);
				this.animateMapChanges(changes, tree, residents);
			}, this.getContextOptsI())
			.on('map-tree-change', function(nav_tree) {
				this.changeNavTree(nav_tree);
			}, this.getContextOptsI())

			.on('title-change', function(title) {
				this.setDocTitle(title);

			}, this.getContextOptsI())
			.on('url-change', function(nu, ou, data, replace) {
				if (needs_url_history){
					if (replace){
						navi.replace(ou, nu, data.resident);
					} else {
						navi.set(nu, data.resident);
					}
				}
			}, this.getContextOptsI());
		
		return this.map;
	},
	setDocTitle: function(title) {
		pv.update(this, 'doc_title', title);
	},
	getBMapTravelFunc: function(func, context) {
		return function() {
			return context.collectChanges(func, arguments);
		};
	},
	changeNavTree: function(nav_tree) {
		this.nav_tree = spv.filter(nav_tree, 'resident');
		if (this.matchNav){
			this.matchNav();
		}
		
	},
	restoreFreezed: function(transit){
		this.map.restoreFreezed(transit);
	},
	showStartPage: function(){
		//mainaly for hash url games
		this.map.startNewBrowse();
	},
	'mapch-handlers': {
		"zoom-in": function(array) {
			var target;
			for (var i = array.length - 1; i >= 0; i--) {
				var cur = array[i];
				if (cur.type == 'move-view' && cur.value){
					target = cur.target.getMD();
					break;
				}

			}
			return target;
		},
		"zoom-out": function(array) {
			var target;
			for (var i = array.length - 1; i >= 0; i--) {
				var cur = array[i];
				if (cur.type == 'zoom-out' || cur.type == 'move-view'){//&& cur.value
					target = cur.target.getMD();
					break;
				}

			}
			return target;
		}
	},
	'model-mapch': {
		'move-view': function(change) {
			var parent = change.target.getMD().getParentMapModel();
			if (parent){
				pv.update(parent, 'mp_has_focus', false);
			}
			pv.update(change.target.getMD(), 'mp_show', change.value);
		},
		'zoom-out': function(change) {
			pv.update(change.target.getMD(), 'mp_show', false);
		},
		'destroy': function(change) {
			var md = change.target.getMD();
			md.mlmDie();
			pv.update(md, 'mp_show', false);
		}
	},
	animationMark: function(models, mark) {
		for (var i = 0; i < models.length; i++) {
			pv.update(models[i].getMD(), 'map_animating', mark);
		}
	},
	animateMapChanges: function(changes, tree, residents) {
		var
			i,
			target_md,
			all_changhes = spv.filter(changes.array, 'changes');

		all_changhes = Array.prototype.concat.apply(Array.prototype, all_changhes);
		//var models = spv.filter(all_changhes, 'target');
		//this.animationMark(models, changes.changes_number);

		for (i = 0; i < all_changhes.length; i++) {
			var change = all_changhes[i];
		//	change.changes_number = changes.changes_number;
			var handler = this['model-mapch'][change.type];
			if (handler){
				handler.call(this, change);
			}
		}

		for (i = changes.array.length - 1; i >= 0; i--) {
			//вычисление модели, которая станет главной на экране
			var cur = changes.array[i];
			if (this['mapch-handlers'][cur.name]){
				target_md = this['mapch-handlers'][cur.name].call(this, cur.changes);
				break;
			}
		}
		/*
			подсветить/заменить текущий источник
			проскроллить к источнику при отдалении
			просроллить к источнику при приближении
		*/
		

		if (tree){
			pv.updateNesting(this, 'navigation', tree);
		}

		
		if (target_md){
			if (this.current_mp_md) {
				pv.update(this.current_mp_md, 'mp_has_focus', false);
			}
			this.current_mp_md = target_md;
			pv.update(target_md, 'mp_has_focus', true);

			pv.update(this, 'show_search_form', !!target_md.state('needs_search_from'));
			pv.update(this, 'full_page_need', !!target_md.full_page_need);
		//	pv.update(this, 'current_mp_md', target_md._provoda_id);
			pv.updateNesting(this, 'current_mp_md', target_md);
			//pv.update(target_md, 'mp-highlight', false);


		}


		
		if (target_md){
			changes.target = target_md && target_md.getMDReplacer();
		}

		var mp_show_wrap;
		if (residents){
			mp_show_wrap = {
				items: residents,
				mp_show_states: []
			};
			for (i = 0; i < residents.length; i++) {
				mp_show_wrap.mp_show_states.push(residents[i].state('mp_show'));
			}
		}

		pv.updateNesting(this, 'map_slice', {
			residents_struc: mp_show_wrap,
			transaction: changes
		});
	
		
	},
	bindMMapStateChanges: function(md) {
		if (binded_models[md._provoda_id]) {
			return;
		}
		binded_models[md._provoda_id] = true;
		md.on('mpl-attach', function() {
			pv.update(md, 'mpl_attached', true);

		}, {immediately: true});
		md.on('mpl-detach', function(){
			pv.update(md, 'mpl_attached', false);
		}, {immediately: true});
		this.pushVDS(md);

	},
	showMOnMap: function(model) {

		var aycocha = this.map.isCollectingChanges();
		if (!aycocha){
			this.map.startChangesCollecting();
		}

		if (!model.lev || !model.lev.canUse()){
			//если модель не прикреплена к карте прежде чем что-то делать - отображаем "родительску" модель
			this.showMOnMap(model.map_parent);
		}
		if (model.lev && model.lev.canUse()){//если модель прикреплена к карте

			if (model.lev.closed){
				//если замарожены - удаляем "незамороженное" и углубляемся до нужного уровня
				this.map.restoreFreezedLev(model.lev);
			}
			//отсекаем всё более глубокое
			model.lev.sliceTillMe();
		} else {
			if (!model.model_name){
				throw new Error('model must have model_name prop');
			}
			this.bindMMapStateChanges(model, model.model_name);
			this.map.goDeeper(model);

		}

		if (!aycocha){
			this.map.finishChangesCollecting();
		}

		return model;
		//
	},
	collectChanges: function(fn, args, opts) {
		var aycocha = this.map.isCollectingChanges();
		if (!aycocha){
			this.map.startChangesCollecting(opts);
		}

		var result = fn.apply(this, args);

		if (!aycocha){
			this.map.finishChangesCollecting();
		}
		return result;
	},
	resortQueue: function(queue) {
		if (queue){
			queue.removePrioMarks();
		} else {
			for (var i = 0; i < this.all_queues.length; i++) {
				this.all_queues[i].removePrioMarks();
			}
		}
		var md = this.getNesting('current_mp_md');
		if (md){
			if (md.checkRequestsPriority){
				md.checkRequestsPriority();
			} else if (md.setPrio){
				md.setPrio();
			}
		}
		
		this.checkActingRequestsPriority();
	},
	routePathByModels: function(pth_string, start_md, need_constr) {
		return BrowseMap.routePathByModels(start_md || this.start_page, pth_string, need_constr);
	
	},
	pushVDS: function(md) {
		if (!this.used_data_structure) {
			return;
		}
		var default_struc = this.used_data_structure.m_children.children_by_mn.map_slice[ '$default' ];
		var model_name = md.model_name;

		var struc = this.used_data_structure.m_children.children_by_mn.map_slice[ model_name ] || default_struc;

		//cur.handleViewingDataStructure(struc);
		md.handleViewingDataStructure(struc);
	},
	knowViewingDataStructure: function(constr_id, used_data_structure) {
		if (!this.used_data_structure) {
			this.used_data_structure = used_data_structure;
		}
		
		for (var i = 0; i < this.map.residents.length; i++) {
			var cur = this.map.residents[i];
			this.pushVDS(cur);
			
		}
		
		
		//console.log(1313)
	}
});


return AppModelBase;
});
