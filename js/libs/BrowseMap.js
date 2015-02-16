define(['pv', 'spv'], function(pv, spv) {
"use strict";

/*
исправить публичный freeze - нужен чтобы понимать что не нужно удалять а просто прятать из рендеринга
поправить навигацию
проверить работу истории
поправить остатки wantSong

генерируемые плейлисты

*/
var BrowseMap = function (){};

var limits = {
	same_model_matches: 1,
	big_steps: 4
};

var isBigStep = function(cur, cur_child) {
	return cur.map_parent && cur.map_parent.getNesting('pioneer') != cur_child.map_parent;
};

var getNavGroups = function(bwlev) {
	var cur_group = [];
	var groups = [cur_group];
	
	var cur = bwlev;
	var cur_child = cur.getNesting('pioneer');
	while (cur) {
		cur_group.push(cur_child);

		if (isBigStep(cur, cur_child)) {
			cur_group = [];
			groups.push(cur_group);
		}

		cur = cur.map_parent;
		cur_child = cur && cur.getNesting('pioneer');
	}
	return groups;
};


var getEdgeSimilarModelPos = function(bwlev, model_name, limit) {
	var edge_group_num = -1;
	var groups_of_similar = 0;
	var groups_count = 0;
	var cur = bwlev;
	var cur_child = cur.getNesting('pioneer');
	while (cur) {
		if (cur_child.model_name == model_name) {
			if (edge_group_num != groups_count) {
				edge_group_num = groups_count;
				groups_of_similar++;
				if (groups_of_similar == limit) {
					break;
				}
			}
		}

		if (isBigStep(cur, cur_child)) {
			groups_count++;
		}

		cur = cur.map_parent;
		cur_child = cur && cur.getNesting('pioneer');
	}
	return groups_of_similar == limit ? edge_group_num : -1;
};


var countGroups = function(bwlev) {
	var groups_count = 1;
	var cur = bwlev;
	var cur_child = cur.getNesting('pioneer');
	while (cur) {

		if (isBigStep(cur, cur_child)) {
			groups_count++;
		}

		cur = cur.map_parent;
		cur_child = cur && cur.getNesting('pioneer');
	}
	return groups_count;
};


function interestPart(group){
	return {
		md: group[0],
		distance: group.length
	};
}

var getLimitedParent = function(parent_bwlev, end_md){
	var pioneer = parent_bwlev.getNesting('pioneer');
	// var pre_mn = pioneer.model_name == end_md.model_name;
	var pre_group = pioneer != end_md.map_parent;


	// var cur = parent_bwlev;
	// var cur_child = end_md;
	// var counter = 0;

	// var big_steps = 0;
	// var same_model_matches = 0;

	// var last_ok;

	// var cut = false;

	
	var groups_count = countGroups(parent_bwlev);
	var all_groups_count = groups_count + (pre_group ? 1 : 0);

	
	var similar_model_edge = getEdgeSimilarModelPos(parent_bwlev, end_md.model_name, 3);

	if (all_groups_count > 3 || similar_model_edge != -1) {

		var count_slice = 3 + ( pre_group ? -1 : 0 );
		var sm_slice = similar_model_edge == -1 ? Infinity : similar_model_edge + 1;
		var slice = Math.min(count_slice, sm_slice);
		var groups = getNavGroups(parent_bwlev);
		var sliced = groups.slice(0, slice);

		return sliced.map(interestPart).reverse();
	}

	return false;
};

var followFromTo = function(map, parent_bwlev, end_md) {
	var aycocha = map.isCollectingChanges();

	if (!aycocha){
		map.startChangesCollecting();
	}

	var cutted_parents = getLimitedParent(parent_bwlev, end_md);

	if (cutted_parents) {
		map.startNewBrowse();
		var last_cutted_parentbw = BrowseMap.showInterest(map, cutted_parents);
		map._goDeeper(end_md, last_cutted_parentbw);

	} else {
		// parent_bwlev.showOnMap();

		var bwlev = getBwlevFromParentBwlev(parent_bwlev, end_md);

		if (ba_canReuse(bwlev)) {
			showMOnMap(map, end_md, bwlev);
		} else {
			showMOnMap(map, parent_bwlev.getNesting('pioneer'), parent_bwlev);
			map._goDeeper(end_md, parent_bwlev);
		}


	}

	if (!aycocha){
		map.finishChangesCollecting();
	}

};

var showMOnMap = function(map, model, bwlev, skip_detach) {

	if (model.map_level_num == -1) {
		bwlev = map.getLevel(-1);
	}

	var aycocha = map.isCollectingChanges();
	if (!aycocha){
		map.startChangesCollecting();
	}

	var bwlev_parent = false;

	if (!bwlev || !ba_inUse(bwlev)){
		// если модель не прикреплена к карте,
		// то прежде чем что-то делать - находим и отображаем "родительску" модель
		var parent_md;
		if (bwlev) {
			parent_md = bwlev.map_parent.getNesting('pioneer');
		} else {
			parent_md = model.map_parent;
		}

		bwlev_parent = showMOnMap(map, parent_md, bwlev && bwlev.map_parent, true);
	}

	var result = null;

	if (bwlev_parent || bwlev_parent === false) {

		if (bwlev_parent) {
			if (!bwlev) {
				bwlev = getBwlevFromParentBwlev(bwlev_parent, model);
			}
			if (!bwlev || !ba_inUse(bwlev)) {
				ba_sliceTillMe(bwlev_parent);
			}
		}


		if (model.state('has_no_access')) {
			model.switchPmd();
		} else if (ba_canReuse(bwlev)){//если модель прикреплена к карте

			if (!skip_detach) {
				// отсекаем всё более глубокое
				// отсекать можно когда не будет отсетечно, что потом придётся прикреплять
				ba_sliceTillMe(bwlev);
			}

			if (!ba_isOpened(bwlev)){
				// если заморожены - удаляем "незамороженное" и углубляемся до нужного уровня
				ba_unfreeze(map, bwlev);
			}
			result = bwlev;
		} else {
			if (!model.model_name){
				throw new Error('model must have model_name prop');
			}
			// this.bindMMapStateChanges(model, model.model_name);
			result = map._goDeeper(model, bwlev && bwlev.map_parent);
		}
	}

	if (!aycocha){
		map.finishChangesCollecting();
	}

	return result;
	//
};

var getBwlevFromParentBwlev = function(parent_bwlev, md) {
	return parent_bwlev.children_bwlevs[md._provoda_id];
};

var getBwlevInParentBwlev = function(md, map) {
	if (!md.map_parent) {
		if (map.mainLevelResident != md) {
			throw new Error('root map_parent must be `map.mainLevelResident`');
		}
		return map.levels[-1].free;
	}

	var parent_bwlev = getBwlevInParentBwlev(md.map_parent, map);
	return getBwlevFromParentBwlev(parent_bwlev, md);
};

var getCommonBwlevParent = function(bwlev, md) {
	var cur_bwlev = bwlev;
	while (cur_bwlev) {
		var pioneer = cur_bwlev.getNesting('pioneer');

		var cur_md = md;
		while (cur_md) {
			if (pioneer == cur_md) {
				return cur_bwlev;
			}
			cur_md = md.map_parent;
		}

		cur_bwlev = cur_bwlev.map_parent;
	}
};

var getPathToBwlevParent = function(bwlev, md) {
	var pioneer = bwlev.getNesting('pioneer');
	var matched;
	var result = [];
	var cur = md;
	while (cur) {

		if (pioneer == cur) {
			matched = true;
			break;
		}

		result.push(cur);

		cur = cur.map_parent;
	}

	if (!matched) {
		throw new Error('trying to get path for unconnected parts');
	}
	return result.reverse();

};


BrowseMap.getConnectedBwlev = function(bwlev, md) {
	var common_bwlev = getCommonBwlevParent(bwlev, md);
	var path = getPathToBwlevParent(common_bwlev, md);
	var cur = common_bwlev;
	for (var i = 0; i < path.length; i++) {
		cur = getBwlevFromParentBwlev(common_bwlev, md);
	}
	return cur;
};

BrowseMap.getBwlevFromParentBwlev = getBwlevFromParentBwlev;

function BrowseLevel() {}
pv.Model.extendTo(BrowseLevel, {
	init: function(opts, data, params, nestings, states) {
		this._super.apply(this, arguments);
		this.children_bwlevs = {};
		this.model_name = states['model_name'];

		if (!this.model_name) {
			throw new Error('must have model name');
		}

		this.ptree = [this];
		this.rtree = [states['pioneer']];

		if (this.map_parent) {
			this.ptree = this.ptree.concat(this.map_parent.ptree);
			this.rtree = this.rtree.concat(this.map_parent.rtree);
		}
	},
	getParentMapModel: function() {
		return this.map_parent;
	},
	showOnMap: function() {
		showMOnMap(this.map, this.getNesting('pioneer'), this);
	},
	requestPage: function(id) {
		var md = pv.getModelById(id);
		var pioneer = this.getNesting('pioneer');

		var target_is_deep_child;

		var cur = md;
		var bwlev_children = [];

		while (cur.map_parent) {
			bwlev_children.push(cur);

			if (cur.map_parent == pioneer) {
				target_is_deep_child = true;
				break;
			}
			cur = cur.map_parent;
		}

		bwlev_children = bwlev_children.reverse();

		if (!target_is_deep_child) {
			md.requestPage();
		} else {
			var map = md.app.map;

			var aycocha = map.isCollectingChanges();
			if (!aycocha){
				map.startChangesCollecting();
			}

			showMOnMap(map, pioneer, this);

			var parent_bwlev = this;
			for (var i = 0; i < bwlev_children.length; i++) {
				if (!parent_bwlev) {
					continue;
				}
				var cur_md = bwlev_children[i];

				if (cur_md.state('has_no_access')) {
					parent_bwlev = null;
					cur_md.switchPmd();
				} else {
					parent_bwlev = map._goDeeper(cur_md, parent_bwlev);
				}
			}

			if (!aycocha){
				map.finishChangesCollecting();
			}
		}

	},
	zoomOut: function() {
		var pioneer = this.getNesting('pioneer');
		if (pioneer.state('mp_stack') || (pioneer.state('mp_show') )) {
			ba__sliceTM(this);
		}
	},
	followTo: function(id) {
		var md = pv.getModelById(id);
		if (md.getRelativeModel) {
			md = md.getRelativeModel();
		}
		// md.requestPage();
		followFromTo(this.map, this, md);
	
	},
	'stch-mpl_attached': function(state) {
		var md = this.getNesting('pioneer');
		var obj = pv.state(md, 'bmpl_attached');
		obj = obj ? spv.cloneObj({}, obj) : {};
		obj[this._provoda_id] = state;
		pv.update(md, 'bmpl_attached', obj);
		pv.update(md, 'mpl_attached', spv.countKeys(obj, true));

	}
});

var getBWlev = function(md, parent_bwlev, map_level_num){
	var cache = parent_bwlev && parent_bwlev.children_bwlevs;
	var key = md._provoda_id;
	var bwlev;

	if (!cache || !cache[key]) {
		bwlev = pv.create(BrowseLevel, {
			map_level_num: map_level_num,
			model_name: md.model_name,
			pioneer: md
		}, {
			nestings: {
				pioneer: md
			}
		}, parent_bwlev);

		if (cache) {
			cache[key] = bwlev;
		}
		
	} else {
		bwlev = cache[key];
	}

	return bwlev;
};

var sProp = function(obj, prop_name, nv, cb) {
	if (obj[prop_name] != nv){
		var ov = obj[prop_name];
		obj[prop_name] = nv;
		if (cb) {
			cb(nv, ov);
		}
		return {nv: nv, ov: ov};
	}
};

// BrowseMap
pv.Eventor.extendTo(BrowseMap, {
	init: function(maleres){
		this._super();

		this.changes_group = null;
		this.grouping_changes = null;
		this.collecting_changes = null;
		this.current_level_num = null;
		this.nav_tree = null;
		this.onNavTitleChange = null;
		this.onNavUrlChange = null;


		
		this.levels = [];
		if (!maleres){
			throw new Error('give me 0 index level (start screen)');
		}
		this.mainLevelResident = maleres;


		this.cha_counter = 0;
		this.chans_coll = [];
		this.residents = [];



		return this;
	},
	isGroupingChanges: function() {
		return this.grouping_changes;
	},
	startChangesGrouping: function(group_name, soft_allowed) {
		if (this.grouping_changes){
			if (!soft_allowed){
				throw new Error('already grouping');
			}
			
		} else {
			this.changes_group = {
				name: group_name,
				changes: []
			};
			this.grouping_changes = true;
			return true;
		}
	},
	finishChangesGrouping: function(group_name) {
		if (!this.grouping_changes){
			throw new Error('none to finish');
		} else {
			this.grouping_changes = false;
			this.emitChangesGroup(group_name);
		}
	},
	emitChangesGroup: function(group_name) {
		if (this.changes_group.name != group_name){
			throw new Error('wrong changes group name');
		}
		if (this.changes_group.changes.length){

			this.chans_coll.push(this.changes_group);
			this.changes_group = null;
			if (!this.isCollectingChanges()){
				this.emitChanges();
			}
		}
	},
	addChangeToGroup: function(change) {
		if (this.grouping_changes){
			this.changes_group.changes.push(change);
		} else {
			var last_group = this.chans_coll[this.chans_coll.length-1];
			if (last_group && !last_group.name){
				last_group.changes.push(change);
			} else {
				throw new Error('unknow changes');
			}
		}
	},
	isCollectingChanges: function() {
		return !!this.collecting_changes;
	},
	startChangesCollecting: function(soft_allowed, opts) {
		if (this.collecting_changes){
			if (!soft_allowed){
				throw new Error('already collecting');
			}
			
		} else {
			this.collecting_changes = opts || {};
			return true;
			
		}
	},
	finishChangesCollecting: function() {
		if (!this.collecting_changes){
			throw new Error('none to finish');
		} else {
			var opts = this.collecting_changes;
			this.collecting_changes = false;
			this.emitChanges(opts);
		}
	},
	addChange: function(change) {
		this.addChangeToGroup(change);
		if (!this.collecting_changes){
			this.emitChanges();
		}
	},
	zipChanges: function() {
		var
			cur,
			prev,
			zipped = [];

		for (var i = 0; i < this.chans_coll.length; i++) {
			if (cur){
				if (!prev || cur.name != prev.name){
					prev = cur;
				}
			}
			
			cur = this.chans_coll[i];
			if (prev && cur.name == prev.name){
				prev.changes = prev.changes.concat(cur.changes);
				prev.zipped=  true;
			} else {
				zipped.push(cur);
			}
		}
		if (zipped.length < this.chans_coll.length){
			this.chans_coll = zipped;
		}
	},
	emitChanges: function(opts) {
		opts = opts || {};
		if (this.chans_coll.length){
			this.zipChanges();

			var all_changes = spv.filter(this.chans_coll, 'changes');
			var big_line = [];
			for (var i = 0; i < all_changes.length; i++) {
				big_line = big_line.concat(all_changes[i]);
			}
			var move_view_changes = spv.filter(big_line, 'type', 'move-view');

			for (var jj = 0; jj < move_view_changes.length; jj++) {
				var cur = move_view_changes[jj];
				if (jj == move_view_changes.length -1){					
					this.updateNav(cur.bwlev.getMD(), opts);
				}
			}

			

			var bwlev = this.getCurrentLevel();

			this.trigger('changes', {
				array: this.chans_coll,
				changes_number: this.cha_counter
			}, bwlev.rtree.slice().reverse(), bwlev.ptree.slice().reverse());
			this.chans_coll = [];
			this.chans_coll.changes_number = ++this.cha_counter;

		}
		
	},
	makeMainLevel: function(){
		this.startChangesGrouping('zoom-in');
		this.setLevelPartActive(this.getFreeLevel(-1, false, this.mainLevelResident));
		this.finishChangesGrouping('zoom-in');
		return this;
	},
	getCurrentLevel: function() {
		return this.getLevel(this.getActiveLevelNum());
	},
	getCurrentResident: function() {
		return this.getCurrentLevel().getNesting('pioneer');
	},
	getLevel: function(num){
		if (this.levels[num]){
			return this.levels[num].free || this.levels[num].freezed;
		} else{
			return false;
		}
	},
	getActiveLevelNum: function(){
		return this.current_level_num;
	},
	setLevelPartActive: function(lp){
		ba_show(lp);
		this.current_level_num = lp.state('map_level_num');
	},
	_goDeeper: function(md, parent_bwlev){
		// без parent_bwlev нет контекста
		if (!parent_bwlev) {
			// будем искать parent_bwlev на основе прямой потомственности от уровня -1
			parent_bwlev = getBwlevInParentBwlev(md.map_parent, this);
		}


		// var cur_res = this.getCurrentResident();
		// if (cur_res == md){
		// 	// возврщаем bwlev
		// 	return cur_res.lev.bwlev;
		// }

		var parent_md = md.map_parent;
		
		var target_lev;
		// if (md.lev && md.lev.canUse()){
		// 	// есть ли на карте уровень для этой модели, который можно использовать повторно
		// 	target_lev = md.lev;
		// } else {
			// reusing freezed;
			var map_level_num;
			if (parent_bwlev) {
				map_level_num = parent_bwlev.state('map_level_num') + 1;
			} else {
				if (typeof md.map_level_num != 'number') {
					throw new Error('md must have `map_level_num`');
				}
				map_level_num = md.map_level_num;
			}
			// нужно чтобы потом использовать все уровни-предки
			var parent_lev = parent_bwlev;
			if (!parent_lev && parent_md) {
				throw new Error('`md.lev` prop dissalowed');
				parent_lev = parent_md.lev;
			}

			target_lev = this.getFreeLevel(map_level_num, parent_lev, md);
		// }

		var just_started = this.startChangesGrouping('zoom-in');
		this.setLevelPartActive(target_lev);
		if (just_started){
			this.finishChangesGrouping('zoom-in');
		}
		return target_lev;
		
	},
	// goDeeper: function(md, parent_bwlev, bwlev){
	// 	return this._goDeeper(md, parent_bwlev, bwlev);
	// },
	createLevel: function(num, parent_bwlev, md){
		var bwlev = getBWlev(md, parent_bwlev, num);
		bwlev.map = this;
		pv.update(bwlev, 'mpl_attached', true);
		return bwlev;
	},
	getFreeLevel: function(num, parent_bwlev, resident){//goDeeper
		if (!this.levels[num]){
			this.levels[num] = {};
		}
		if (this.levels[num].free && this.levels[num].free != this.levels[num].freezed){
			return this.levels[num].free;
		} else{
			
			this.levels[num].free = this.createLevel(num, parent_bwlev, resident);
			return this.levels[num].free;
		}
	},
	freezeMapOfLevel : function(num){
		var
			i,
			fresh_freeze = false,
			l = Math.min(num, this.levels.length - 1);

		this.startChangesGrouping('freezing');

		for (i = l; i >= 0; i--){
			if (this.levels[i]){
				if (this.levels[i].free){
					if (this.levels[i].free != this.levels[i].freezed){
						if (this.levels[i].freezed){ //removing old freezed
							ba_die( this.levels[i].freezed );
							this.levels[i].freezed.closed = false;
							this.levels[i].freezed = null;
						}
						this.levels[i].freezed = this.levels[i].free;
						ba_markAsFreezed( this.levels[i].freezed );
						fresh_freeze = true;
					}
				}
				this.levels[i].free = null;
			}
			
			
		}

		
		//clearing if have too much levels !?!?!??!?!?!
		if (l + 1 < this.levels.length -1) {
			for (i= l + 1; i < this.levels.length; i++) {
				if (this.levels[i].freezed){
					ba_die( this.levels[i].freezed );
					this.levels[i].freezed = null;
				}
				
			}
		}
		this.finishChangesGrouping('freezing');
		return fresh_freeze;
	},
	hideFreeLevel: function(lev, exept) {
		if (lev.free && lev.free != exept){
			ba_die(lev.free);
			lev.free = null;
		}
	},
	hideLevel: function(lev, exept, only_free){
		if (lev){
			if (!only_free){
				if (lev.freezed && lev.freezed != exept){
					ba_hide(lev.freezed);
				}
			}
			
			this.hideFreeLevel(lev, exept);
			
		}
	},
	updateNav: (function(){
		var stackNav = function(bwlev, stack_v) {
			pv.update(bwlev, 'mp_stack', stack_v);
			pv.update(bwlev.getNesting('pioneer'), 'mp_stack', stack_v);
			return this;
		};
		return function(bwlev, urlop){
			//hev
			var lvls = bwlev.ptree;
			var root = lvls[ lvls.length - 1 ]; //start_page
			var exept_root = lvls.length - 1;
			stackNav(bwlev, false);

			var prev = lvls[1];
			// lvls[0] is bwlev, 
			// lvls[1] is bwlev.map_parent;
			if (prev){
				// this is top of stack, but only if we have "stack";
				stackNav(prev, 'top');
				stackNav(root, true);
			} else {
				stackNav(root, false);
			}

			for (var i = 2; i < exept_root; i++) {
				stackNav(lvls[i],  i + 1 === exept_root ? 'bottom' : 'middle');
			}

			this.setNavTree(bwlev.ptree, urlop);
		};
	})(),
	setNavTree: function(tree, urlop) {
		var old_tree = this.nav_tree;

		this.nav_tree = tree;

		var
			url_changed = this.setCurrentURL(tree, old_tree, urlop),
			title_changed = this.setCurrentNav(tree[0].rtree, old_tree && old_tree[0].rtree, urlop);

		// !!urlop.skip_url_change

		if (url_changed){
			var bwlev =  this.getCurrentLevel();
			this.trigger('nav-change', {
				url: url_changed.nv || "",
				md:  bwlev && bwlev.getNesting('pioneer'),
				map_level: bwlev
			});
		}

		this.trigger("map-tree-change", tree[0].rtree, old_tree && old_tree[0].rtree);
	},
	getTitleNav: function(n) {
		return n && n.slice(0, 2);
	},
	setCurrentNav: function(new_nav, old_nav) {
		var _this = this;
		if (!this.onNavTitleChange){
			this.onNavTitleChange = function() {
				var cur_nav = _this.getTitleNav(_this.nav_tree[0].rtree);
				var s_num = cur_nav.indexOf(this);
				if (s_num != -1){
					_this.refreshTitle(s_num);
				}
			};
		}
		old_nav = this.getTitleNav(old_nav);


		var i;

		if (old_nav){
			for (i = 0; i < old_nav.length; i++) {
				old_nav[i].offTitleChange( this.onNavTitleChange); //unbind
			}
		}

		new_nav = this.getTitleNav(new_nav);

		for (i = 0; i < new_nav.length; i++) {
			new_nav[i].onTitleChange(this.onNavTitleChange);
		}

		return this.setTitle(this.joinNavTitle(new_nav));
	},
	setTitle: function(new_title) {
		var _this = this;
		return sProp(this, 'cur_title', new_title, function(nv, ov) {
			_this.trigger('title-change', nv, ov);
		});
	},
	joinNavTitle: function(nav) {
		var nav_t = [];
		for (var i = 0; i < nav.length; i++) {
			if (nav[i].getTitle){
				nav_t.push(nav[i].getTitle());
			}
		}
		return nav_t.join(' ← ');
	},
	refreshTitle: function() {
		this.setTitle(this.joinNavTitle(this.getTitleNav(this.nav_tree[0].rtree)));
		return this;
	},
	setCurrentURL: function(ptree, ptree_old, urlop) {
		var new_tree = ptree[0].rtree;
		var old_tree = ptree_old && ptree_old[0].rtree;

		var _this = this;
		if (!this.onNavUrlChange){
			this.onNavUrlChange = function() {
				var cur_nav = _this.nav_tree[0].rtree;
				var s_num = cur_nav.indexOf(this);
				if (s_num != -1){
					_this.replaceURL(s_num);
				}
			};
		}
		var i;
		if (old_tree){
			for (i = 0; i < old_tree.length; i++) {
				old_tree[i].off('state_change-url_part', this.onNavUrlChange); //unbind
			}
		}

		for (i = 0; i < new_tree.length; i++) {
			new_tree[i].on('state_change-url_part', this.onNavUrlChange, {
				skip_reg: true
			});
		}
		return this.setURL(this.joinNavURL(ptree), false, urlop);
	},
	joinNavURL: (function(){
		var joinSubtree = function(array){
			var url = "";
			for (var i = array.length - 1; i >= 0; i--) {
				var md = 	array[i];
				var url_part = md.state('url_part');
				// if (!url_part) {
				// 	throw new Error('must be url');
				// }
				url += url_part || '';
			}
			return url;
		};

		return function(nav) {
			var url = '';
			var groups = getNavGroups(nav[0]);

			/*
				/users/me/lfm:neighbours#3:/users/lfm:kolczyk0
			*/

			var last = groups.pop();

			url += joinSubtree(last);
			// for (var i = last.length - 1; i >= 0; i--) {
			// 	var cur = last[i];
			// 	url.push(cur.state('url_part'));
			// }

			for (var i = groups.length - 1; i >= 0; i--) {
				var distance = groups[i].length;
				// var md = groups[i][0];
				// var url_part = md.state('url_part');
				// if (!url) {
				// 	throw new Error('must be url');
				// }
				url += '#';


				// url.push('#');

				if (distance > 1) {
					url += distance + ':';
					// url.push();
				}
				url += joinSubtree(groups[i]);

				//url.push(url_part);
				
			}

			return url;
		};
	})(),
	setURL: function(url, replace, urlop) {
		urlop = urlop || {};
		var _this = this;
		return sProp(this, 'cur_url', url, function(nv, ov) {
			if (!urlop.skip_url_change){
				_this.trigger('url-change', nv, ov || "", _this.getCurrentLevel(), replace || urlop.replace_url);
			}
			var bwlev = _this.getCurrentLevel();
			_this.trigger(
				'every-url-change',
				{
					url: nv,
					map_level: bwlev,
					md: bwlev && bwlev.getNesting('pioneer')
				},
				null,
				replace
			);

		});
	},
	replaceURL: function() {
		this.setURL(this.joinNavURL(this.nav_tree), true);
		return this;
	},
	sliceDeepUntil: function(num){
		var
			current_lev = this.getCurrentLevel(),
			target_lev;

		if (num < this.levels.length){
			for (var i = this.levels.length-1; i > num; i--){
				this.hideLevel(this.levels[i]);
			}
		}
		target_lev = this.getLevel(num);
		if (target_lev && target_lev != current_lev){
		//	throw new Error('fix nav!');
			this.setLevelPartActive(target_lev);
		}
	},
	clearCurrent: function() {
		var current_num = this.getActiveLevelNum();
		if (current_num != -1){
			for (var i = current_num; i >= 0; i--) {
				this.hideLevel(this.levels[i]);
				
			}
		}
	},
	startNewBrowse: function(){

		var just_started_zoomout = this.startChangesGrouping('zoom-out', true);
		
		this.clearCurrent();
		this.setLevelPartActive(this.getLevel(-1));
		if (just_started_zoomout){
			this.finishChangesGrouping('zoom-out');
		}
	}
	
});

var getDistantModel = function(md, distance){
	var cur = md;
	for (var i = 1; i < distance; i++) {
		cur = cur.map_parent;
	}
	return cur;
};

BrowseMap.showInterest = function(map, interest) {
	var first = interest.shift();
	var aycocha = map.isCollectingChanges();
	if (!aycocha){
		map.startChangesCollecting();
	}
	// first.md.lev fixme

	var parent_bwlev = showMOnMap(first.md.app.map, first.md);

	for (var i = 0; i < interest.length; i++) {
		var cur = interest[i];

		var distance = cur.distance;
		if (!distance) {throw new Error('must be distance: 1 or more');}
		while (distance) {
			var md = getDistantModel(interest[i].md, distance);
			parent_bwlev = map._goDeeper(md, parent_bwlev);
			distance--;
		}
		

	}

	if (!aycocha){
		map.finishChangesCollecting();
	}
	return parent_bwlev;
};


var interest_part = /(\#(?:\d*\:)?)/gi;
BrowseMap.getUserInterest = function(pth_string, start_md) {
	/*
		/users/me/lfm:neighbours#3:/users/lfm:kolczyk0
	*/
	var parts = pth_string.split(interest_part);

	var interest = [];

	while (parts.length) {
		var path = parts.pop();
		var distance_part = parts.pop();
		var distance = distance_part && distance_part.slice(1, distance_part.length - 1 );
		interest.push({
			md: BrowseMap.routePathByModels(start_md, path),
			// path: path,
			distance: distance || 1
		});
	}

	return interest.reverse();
};

BrowseMap.routePathByModels = function(start_md, pth_string, need_constr) {

		/*
		catalog
		users
		tags
		*/


		/*
		#/catalog/The+Killers/_/Try me
		#?q=be/tags/beautiful
		#/catalog/Varios+Artist/Eternal+Sunshine+of+the+spotless+mind/Phone+Call
		#/catalog/Varios+Artist/Eternal+Sunshine+of+the+spotless+mind/Beastie+boys/Phone+Call
		#/catalog/The+Killers/+similar/Beastie+boys/Phone+Call
		#/recommendations/Beastie+boys/Phone+Call
		#/loved/Beastie+boys/Phone+Call
		#/radio/artist/The+Killers/similarartist/Bestie+Boys/Intergalactic
		#?q=be/directsearch/vk/345345
		#/ds/vk/25325_2344446
		http://www.lastfm.ru/music/65daysofstatic/+similar
		*/
		var pth = pth_string.replace(/^\//, '').replace(/([^\/])\+/g, '$1 ')/*.replace(/^\//,'')*/.split('/');

		var cur_md = start_md;
		var result = cur_md;
		var tree_parts_group = null;
		for (var i = 0; i < pth.length; i++) {
			if (cur_md.sub_pages_routes && cur_md.sub_pages_routes[pth[i]]){
				if (!tree_parts_group){
					tree_parts_group = [];
				}
				tree_parts_group.push(pth[i]);
				continue;
			} else {
				var path_full_string;
				if (tree_parts_group){
					path_full_string = [].concat(tree_parts_group, [pth[i]]).join('/');
				} else {
					path_full_string = pth[i];
				}
				tree_parts_group = null;

				if (need_constr) {
					var Constr = cur_md.getSPIConstr(path_full_string);
					if (!Constr) {
						throw new Error('you must use supported path');
					} else {
						cur_md = Constr.prototype;
						result = Constr;
					}

				} else {
					var md = cur_md.getSPI(path_full_string);
					if (md){
						cur_md = md;
						result = md;
					} else {
						break;
					}
				}
			}
		}
		return result;
};

BrowseMap.Model = function() {};

var getSPOpts = function(md, sp_name) {
	var target = md[ 'sub_pa-' + sp_name] || md.sub_pa[sp_name];
	var parts = sp_name.split(':');


	return [
		{
			url_part: '/' + sp_name,
			nav_title: target.title || (target.getTitle && target.getTitle.call(md))
		},
		{
			simple_name: sp_name,
			name_spaced: parts[1]
		}];
};

var getInitData = function(md, common_opts) {
	var pre_instance_data = {};
				
	
	var params_from_parent = md.data_by_hp === true ? md.head_props : md.sub_pa_params;

	var data_parts = [
		params_from_parent,
		common_opts && common_opts[0]
	];

	for (var i = 0; i < data_parts.length; i++) {
		if (!data_parts[i]) {
			continue;
		}
		spv.cloneObj(pre_instance_data, data_parts[i]);
	}

	return pre_instance_data;
};

var getDeclrConstr = function(app, md, item) {
	if (typeof item == 'function') {
		return item;
	} else {
		return md.getConstrByPathTemplate(app, item);
	}
};

var getNestingConstr = function(app, md, nesting_name) {
	nesting_name = pv.hp.getRightNestingName(md, nesting_name);


	if (md[ 'nest_rqc-' + nesting_name ]) {
		var target = md[ 'nest_rqc-' + nesting_name ];
		if (Array.isArray(target)) {
			if (!target.constrs_array) {
				var result = [];
				var index = target[1];
				for (var prop in index) {
					if (!index.hasOwnProperty(prop)) {
						continue;
					} else {
						result.push( index[prop] );
					}
					
				}
				target.constrs_array = result;
			}
			
			return target.constrs_array;
		} else {
			return target;
		}
		
	} else if (md[ 'nest_posb-' + nesting_name ]) {
		return md[ 'nest_posb-' + nesting_name ];
	} else if (md[ 'nest-' + nesting_name]) {

		var declr = md[ 'nest-' + nesting_name];
		var items = declr[0];

		if (Array.isArray(items)) {
			var result = [];
			for (var i = 0; i < items.length; i++) {
				result.push(getDeclrConstr(app, md, items[i]));
			}
			return result;
		} else {
			return getDeclrConstr(app, md, items);
		}
		
	}
	
	
	
};
BrowseMap.getNestingConstr = getNestingConstr;


var getModelSources = function(app, md, cur) {
	var states_sources = [];
	var i;
	var states_list = cur.merged_states;
	var unfolded_states = new Array(states_list.length);
	for (i = 0; i < states_list.length; i++) {
		unfolded_states[i] = md.getNonComplexStatesList(states_list[i]);
	}

	unfolded_states = spv.collapseAll.apply(null, unfolded_states);
	
	for (i = 0; i < unfolded_states.length; i++) {
		var state_name = unfolded_states[i];
		var arr = md.getStateSources(state_name, app);
		if (arr) {
			states_sources.push(arr);
		}
		

	}
	states_sources = spv.collapseAll.apply(null, states_sources);

	var nestings_names_list = [];

	var nesting_name;
	for (nesting_name in cur.m_children.children_by_mn) {
		nestings_names_list.push(nesting_name);
	}
	for (nesting_name in cur.m_children.children) {
		nestings_names_list.push(nesting_name);
	}

	nestings_names_list = spv.collapseAll(nestings_names_list);

	var nesting_sources = [];
	for (i = 0; i < nestings_names_list.length; i++) {
		var source = md.getNestingSource(nestings_names_list[i], app);
		if (source) {
			nesting_sources.push(source);
		}
	}


	var all_nest_sources =[];

	for (nesting_name in cur.m_children.children) {
		var items = getNestingConstr(app, md, nesting_name);
		for (var space_name in cur.m_children.children[nesting_name]) {
			
			var constr_sources;
			if (!items) {
				continue;
			}
			if (Array.isArray(items)) {
				constr_sources = [];
				for (i = 0; i < items.length; i++) {
					var cur_sources = getModelSources(app, items[i].prototype, cur.m_children.children[nesting_name][space_name]);
					if (cur_sources.length) {
						constr_sources = constr_sources.concat(cur_sources);
					}
				}
			} else {
				constr_sources = getModelSources(app, items.prototype, cur.m_children.children[nesting_name][space_name]);
			}

			if (constr_sources) {
				all_nest_sources = all_nest_sources.concat(constr_sources);
			}
		}
		
	}





	/*
	a) итерируем по названиям гнезд,
		получаем список или один конструктор для нужного гнезда
		совмещаем данные

	б) итерируем по названиям гнезд
		получаем список или один конструктор для нужного гнезда
		вычленяем по имени модели только используемые конструкторы


	*/

	var full_sources_list = states_sources.concat(nesting_sources);
	if (all_nest_sources.length) {
		full_sources_list = full_sources_list.concat(all_nest_sources);
	}
	return  spv.collapseAll(full_sources_list);
};


BrowseMap.getStrucSources = function(md, struc) {
	//console.log(struc);
	var result = {};
	for (var space_name in struc) {
		result[space_name] = getModelSources(md.app, md, struc[space_name]);
		//var cur = struc[space_name];
	}
	return result;
	//console.log(md.model_name, md.constr_id, result);
};

pv.HModel.extendTo(BrowseMap.Model, {
	init: function(opts, data) {
		this._super.apply(this, arguments);

		this.lists_list = null;
		// this.map_level_num = null;
		this.head_props = this.head_props || null;


		if (this.hp_bound && !data) {
			throw new Error('pass data arg!');
		} else {
			if (this.head_props) {
				console.log('already has head_props');
			} else if (this.hp_bound) {
				
				var complex_obj = {
					'--data--': null
				};
				if (this.map_parent.sub_pa_params) {
					spv.cloneObj(complex_obj, this.map_parent.sub_pa_params);
				}

				complex_obj['--data--'] = data;

				this.head_props = this.hp_bound(complex_obj);
			}
		}

		opts = opts || {};
		if (!this.skip_map_init){
			if (data) {
				if (data['url_part']){
					this.initState('url_part', data['url_part']);
				}
				if (data['nav_title']){
					this.initState('nav_title', data['nav_title']);
				}
			}
		}

		if (this.data_by_hp && typeof this.data_by_hp == 'function') {
			this.sub_pa_params = this.data_by_hp(data);
		}

		
		
		if (this.allow_data_init) {
			this.updateManyStates(data);
		}

		if (this.preview_nesting_source) {
			this.on('child_change-' + this.preview_nesting_source, function(e) {
				pv.updateNesting(this, 'preview_list', e.value);
			});
		}
	},
	preview_nesting_source: 'lists_list',
	getSPIConstr: function(sp_name) {
		var target = this['sub_pa-' + sp_name] || (this.sub_pa && this.sub_pa[sp_name]);
		if (target){
			return target.constr;
		} else if (this.subPager){
			var result = this.getSPC(decodeURIComponent(sp_name), sp_name);
			if (Array.isArray(result)) {
				return result[0];
			} else {
				return result;
			}
		}
	},
	getSPI: function(sp_name) {
		var instance;
		if (this.sub_pages && this.sub_pages[sp_name]){
			instance = this.sub_pages[sp_name];
		}
		var init_opts;
		if (!instance){
			var target = this['sub_pa-' + sp_name] || (this.sub_pa && this.sub_pa[sp_name]);
			if (target){
				/*
				hp_bound
				data_by_urlname
				data_by_hp

				берем данные из родителя
				накладываем стандартные данные 
				накладываем данные из урла
				*/
				var Constr = target.constr;

				var common_opts = getSPOpts(this, sp_name);

				var instance_data = getInitData(this, common_opts);
				var data_by_urlname = Constr.prototype.data_by_urlname && Constr.prototype.data_by_urlname(common_opts[1]);
				spv.cloneObj(instance_data, data_by_urlname);
				init_opts = [this.getSiOpts(), instance_data];
				instance = new Constr();

				this.sub_pages[sp_name] = instance;
			} else {
				if (this.subPager){
					var sub_page = this.subPager(decodeURIComponent(sp_name), sp_name);
					if (Array.isArray(sub_page)) {
						instance = sub_page[0];
						init_opts = [this.getSiOpts(), sub_page[1]];
					} else {
						instance = sub_page;
					}
				}
			}

			if (instance && init_opts){
				this.useMotivator(instance, function(instance) {
					instance.init.apply(instance, init_opts);
				});
			}
		}
		
		
		return instance;
	},
	preloadNestings: function(array) {
		//var full_list = [];
		for (var i = 0; i < array.length; i++) {
			var md = this.getNesting(array[i]);
			if (md) {
				md.preloadStart();
			}
			
		}
	},
	requestPage: function() {
		this.showOnMap();
	},
	showOnMap: function() {
		showMOnMap(this.app.map, this);
	},
	getParentMapModel: function() {
		return this.map_parent;
	},
	mlmDie: function(){
		return;
	},
	hideOnMap: function() {
		pv.update(this, 'mp_show', false);
	},
	setFullUrl: function(url) {
		pv.update(this, 'mp_full_url ', url);
	},
	getTitle: function() {
		return this.state('nav_title');
	},
	onTitleChange: function(cb) {
		return this.on('vip_state_change-nav_title', cb, {skip_reg: true, immediately: true});
	},
	offTitleChange: function(cb) {
		return this.off('vip_state_change-nav_title', cb);
	},
	getURL: function() {
		return '';
	}
});

function ba_show(bwlev){
	var md = bwlev.getNesting('pioneer');
	bwlev.map.addChange({
		type: 'move-view',
		bwlev: bwlev.getMDReplacer(),
		target: md.getMDReplacer(),
		value: true
	});
}

function ba_hide(bwlev){
	if (!ba_inUse(bwlev)) {
		return;
	}
	var md = bwlev.getNesting('pioneer');
	bwlev.map.addChange({
		type: 'zoom-out',
		bwlev: bwlev.getMDReplacer(),
		target: md.getMDReplacer()
	});
}

function ba_die(bwlev){
	var md = bwlev.getNesting('pioneer');
	bwlev.map.addChange({
		type: 'destroy',
		bwlev: bwlev.getMDReplacer(),
		target: md.getMDReplacer()
	});
	bwlev.getNesting('pioneer').trigger('mpl-detach');
	pv.update(bwlev, 'mpl_attached', false);
}

function ba__sliceTM(bwlev){ //private alike
	var map = bwlev.map;
	// var current_level = map.getCurrentLevel();
	// if (current_level == bwlev){
	// 	return;
	// }
	var aycocha = map.isCollectingChanges();
	if (!aycocha){
		map.startChangesCollecting();
	}

	var just_started = map.startChangesGrouping('zoom-out', true);
	map.sliceDeepUntil(bwlev.state('map_level_num')); ///////
	if (just_started){
		map.finishChangesGrouping('zoom-out');
	}

	if (!aycocha){
		map.finishChangesCollecting();
	}
}

function ba_unfreeze(map, bwlev) {
	var just_started_zoomin = map.startChangesGrouping('zoom-in', true);

	ba_show(bwlev);
	map.current_level_num = bwlev.state('map_level_num');

	if (just_started_zoomin){
		map.finishChangesGrouping('zoom-in');
	}
}

function ba_sliceTillMe(bwlev){
	return ba__sliceTM(bwlev);
}

function ba_markAsFreezed(bwlev) {
	var md = bwlev.getNesting('pioneer');
	bwlev.closed = true;
	pv.update(md, 'mp_freezed', true);
}

function ba_inUse(bwlev){
	return bwlev.state('mp_show');
}

function ba_isOpened(bwlev){
	return !!bwlev.map && !bwlev.closed;
}

function ba_canReuse(bwlev) {
	//если модель прикреплена к карте
	return bwlev && (ba_inUse(bwlev) || !ba_isOpened(bwlev));
}


BrowseMap.freeze = function ba_freeze(bwlev){
	if (ba_isOpened(bwlev)){
		bwlev.map.freezeMapOfLevel(bwlev.state('map_level_num'));
	}
};



return BrowseMap;
});