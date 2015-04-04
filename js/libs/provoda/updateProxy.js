define(['./StatesLabour', './helpers', 'spv'], function(StatesLabour, hp, spv) {
'use strict';
var push = Array.prototype.push;
var getSTCHfullname = spv.getPrefixingFunc('stch-');

function updateProxy(etr, changes_list, opts) {
	if (etr._lbr && etr._lbr.undetailed_states){
		iterateChList(changes_list, etr, _setUndetailedState);
		return etr;
	}

	//порождать события изменившихся состояний (в передлах одного стэка/вызова)
	//для пользователя пока пользователь не перестанет изменять новые состояния
	if (!etr.zdsv){
		etr.zdsv = new StatesLabour(!!etr.full_comlxs_index, etr._has_stchs);
	}
	var zdsv = etr.zdsv;


	zdsv.states_changing_stack.push(changes_list, opts);

	if (zdsv.collecting_states_changing){
		return etr;
	}

	zdsv.collecting_states_changing = true;
	//etr.zdsv is important for etr!!!
	//etr.zdsv.collecting_states_changing - must be semi public;


	var total_ch = zdsv.total_ch;
	var original_states = zdsv.original_states;
	var all_i_cg = zdsv.all_i_cg;
	var all_ch_compxs = zdsv.all_ch_compxs;
	var changed_states = zdsv.changed_states;
	
	while (zdsv.states_changing_stack.length){

		//spv.cloneObj(original_states, etr.states);

		var cur_changes_list = zdsv.states_changing_stack.shift();
		var cur_changes_opts = zdsv.states_changing_stack.shift();

		//получить изменения для состояний, которые изменил пользователь через публичный метод
		getChanges(etr, original_states, cur_changes_list, cur_changes_opts, changed_states);
		//var changed_states = ... ↑

		cur_changes_list = cur_changes_opts = null;

		if (etr.full_comlxs_index) {
			//проверить комплексные состояния
			var first_compxs_chs = getComplexChanges(etr, original_states, changed_states);
			if (first_compxs_chs.length){
				push.apply(all_ch_compxs, first_compxs_chs);
			}

			var current_compx_chs = first_compxs_chs;
			//довести изменения комплексных состояний до самого конца
			while (current_compx_chs.length){
				var cascade_part = getComplexChanges(etr, original_states, current_compx_chs);
				current_compx_chs = cascade_part;
				if (cascade_part.length){
					push.apply(all_ch_compxs, cascade_part);
				}
				cascade_part = null;

			}
			current_compx_chs = null;
		}

		

		//собираем все группы изменений
		if (changed_states.length){
			push.apply(all_i_cg, changed_states);
		}
		if (all_ch_compxs && all_ch_compxs.length){
			push.apply(all_i_cg, all_ch_compxs);
		}
		//устраняем измененное дважды и более
		compressStatesChanges(all_i_cg);


		
		iterateChList(all_i_cg, etr, _triggerVipChanges, zdsv);

		

		if (all_i_cg.length){
			push.apply(total_ch, all_i_cg);
		}


		hp.wipeObj(original_states);
		all_i_cg.length = changed_states.length = 0;
		if (all_ch_compxs) {
			all_ch_compxs.length = 0;
		}
		
		//объекты используются повторно, ради выиграша в производительности
		//которые заключается в исчезновении пауз на сборку мусора 
	}

	//устраняем измененное дважды и более
	compressStatesChanges(total_ch);
	iterateChList(total_ch, etr, _triggerStChanges, zdsv);


	//hp.wipeObj(original_states);
	//all_i_cg.length = all_ch_compxs.length = changed_states.length = 0;

	if (etr.sendStatesToMPX && total_ch.length){
		etr.sendStatesToMPX(total_ch);
		total_ch.length = 0;
	} else {
		total_ch.length = 0;
	}


	zdsv.collecting_states_changing = false;
	//zdsv = null;
	return etr;
}

function iterateChList(changes_list, context, cb, zdsv) {
	for (var i = 0; i < changes_list.length; i+=2) {
		cb(context, i, changes_list[i], changes_list[i+1], zdsv);
	}
}

function _setUndetailedState(etr, i, state_name, value) {
	etr._lbr.undetailed_states[state_name] = value;
}


function proxyStch(target, value, state_name) {
	var old_value = target.zdsv.stch_states[state_name];
	if (old_value != value) {
		target.zdsv.stch_states[state_name] = value;
		var method = (target[ getSTCHfullname( state_name ) ] || (target.state_change && target.state_change[state_name]));

		method(target, value, old_value);
	}
}

function _handleStch(etr, original_states, state_name, value, skip_handler, sync_tpl) {
	var stateChanger = !skip_handler && (etr[ getSTCHfullname( state_name ) ] || (etr.state_change && etr.state_change[state_name]));
	if (stateChanger) {
		etr.zdsv.abortFlowSteps('stch', state_name, true);
	} else {
		return;
	}
	var old_value = etr.zdsv.stch_states[state_name];
	if (old_value != value) {
		var method;
		
		if (stateChanger){
			if (typeof stateChanger == 'function'){
				method = stateChanger;
			} else if (etr.checkDepVP){
				if (etr.checkDepVP(stateChanger)){
					method = stateChanger.fn;
				}
			}
		}

		if (method){
			if (!sync_tpl) {
				var flow_step = etr.nextLocalTick(proxyStch, [etr, value, state_name], true);
				flow_step.p_space = 'stch';
				flow_step.p_index_key = state_name;
				etr.zdsv.createFlowStepsArray('stch', state_name, flow_step);
			} else {
				proxyStch(etr, value, state_name);
			}
			
			
			//method.call(this, value, old_value);
		}
	}
}



function getChanges(etr, original_states, changes_list, opts, result_arr) {
	var changed_states = result_arr || [];
	var i;
	for (i = 0; i < changes_list.length; i+=2) {
		_replaceState(etr, original_states, changes_list[i], changes_list[i+1], changed_states);
	}
	if (etr.updateTemplatesStates){
		etr.updateTemplatesStates(changes_list, opts && opts.sync_tpl);
	}
	for (i = 0; i < changes_list.length; i+=2) {
		_handleStch(etr, original_states, changes_list[i], changes_list[i+1], opts && opts.skip_handler, opts && opts.sync_tpl);
	}
	return changed_states;
}

function getComplexChanges(etr, original_states, changes_list) {
	return getChanges(etr, original_states, checkComplexStates(etr, changes_list));
}


function _replaceState(etr, original_states, state_name, value, stack) {
	if (state_name){
		var old_value = etr.states[state_name];
		if (old_value != value){
			//value = value || false;
			//less calculations? (since false and "" and null and undefined now os equeal and do not triggering changes)

			if (!original_states.hasOwnProperty(state_name)) {
				original_states[state_name] = etr.states[state_name];
			}
			etr.states[state_name] = value;
			stack.push(state_name, value);
		}
	}
}

function getComplexInitList(etr) {
	var result_array = [];

	if (!etr.full_comlxs_list) {return result_array;}

	for (var i = 0; i < etr.full_comlxs_list.length; i++) {
		var cur = etr.full_comlxs_list[i];
		result_array.push(cur.name, compoundComplexState(etr, cur));
	}

	return result_array;
}


function checkComplexStates(etr, changes_list) {
	return getTargetComplexStates(etr, changes_list);
}

function getTargetComplexStates(etr, changes_list) {
	var matched_compxs = [];
	var result_array = [];

	var i, cur;

	for ( i = 0; i < changes_list.length; i+=2) {
		cur = etr.full_comlxs_index[changes_list[i]];
		if (!cur){
			continue;
		}
		for (var jj = 0; jj < cur.length; jj++) {
			if (matched_compxs.indexOf(cur[jj]) == -1){
				matched_compxs.push(cur[jj]);
			}
		}
	}

	for ( i = 0; i < matched_compxs.length; i++) {
		cur = matched_compxs[i];
		result_array.push(cur.name, compoundComplexState(etr, cur));
	}

	return result_array;
}

function compoundComplexState(etr, temp_comx) {
	var values = new Array(temp_comx.depends_on.length);
	for (var i = 0; i < temp_comx.depends_on.length; i++) {
		values[i] = etr.state(temp_comx.depends_on[i]);
	}
	return temp_comx.fn.apply(etr, values);
}

function compressChangesList(result_changes, changes_list, i, prop_name, value, counter) {
	if (result_changes[prop_name] !== true){
		var num = (changes_list.length - 1) - counter * 2;
		changes_list[ num - 1 ] = prop_name;
		changes_list[ num ] = value;

		result_changes[prop_name] = true;
		return true;
	}
}

function reversedIterateChList(changes_list, context, cb) {
	var counter = 0;
	for (var i = changes_list.length - 1; i >= 0; i-=2) {
		if (cb(context, changes_list, i, changes_list[i-1], changes_list[i], counter)){
			counter++;
		}
	}
	return counter;
}

function compressStatesChanges(changes_list) {
	var result_changes = {};
	var counter = reversedIterateChList(changes_list, result_changes, compressChangesList);
	counter = counter * 2;
	while (changes_list.length != counter){
		changes_list.shift();
	}
	return changes_list;
}

var PVStateChangeEvent = function(type, value, old_value, target) {
	this.type = type;
	this.value = value;
	this.old_value = old_value;
	this.target = target;
};


//var st_event_name_default = ;
//var st_event_name_vip = 'vip_state_change-';
//var st_event_name_light = 'lgh_sch-';

var st_event_opt = {force_async: true};

function _triggerVipChanges(etr, i, state_name, value, zdsv) {
	var vip_name = hp.getSTEVNameVIP( state_name);
	zdsv.abortFlowSteps('vip_stdch_ev', state_name);


	var vip_cb_cs = etr.evcompanion.getMatchedCallbacks(vip_name);
	if (vip_cb_cs.length) {
		var flow_steps = zdsv.createFlowStepsArray('vip_stdch_ev', state_name);
		var event_arg = new PVStateChangeEvent(state_name, value, zdsv.original_states[state_name], etr);
		
		//вызов внутреннего для самого объекта события
		etr.evcompanion.triggerCallbacks(vip_cb_cs, false, false, vip_name, event_arg, flow_steps);
		hp.markFlowSteps(flow_steps, 'vip_stdch_ev', state_name);
	}
}

function triggerLegacySChEv(etr, state_name, value, old_value, default_cb_cs, default_name, flow_steps) {
	var event_arg = new PVStateChangeEvent(state_name, value, old_value, etr);
			//вызов стандартного события
	etr.evcompanion.triggerCallbacks(default_cb_cs, false, st_event_opt, default_name, event_arg, flow_steps);
}

function _triggerStChanges(etr, i, state_name, value, zdsv) {

	zdsv.abortFlowSteps('stev', state_name);


	var links = etr.states_links && etr.states_links[state_name];
	if (links) {
		for (var k = 0; k < links.length; k++) {
			var cur = links[k];
			// var calls_flow = (opts && opts.emergency) ? main_calls_flow : this.sputnik._getCallsFlow();
			var calls_flow = etr._getCallsFlow();
			calls_flow.pushToFlow(null, null, [cur, value, zdsv.original_states[state_name], etr], cur, cur.state_handler, null, etr.current_motivator);
			
		}
	}

	var default_name = hp.getSTEVNameDefault( state_name );
	var light_name = hp.getSTEVNameLight( state_name );

	var default_cb_cs = etr.evcompanion.getMatchedCallbacks(default_name);
	var light_cb_cs = etr.evcompanion.getMatchedCallbacks(light_name);
	
	if (light_cb_cs.length || default_cb_cs.length) {
		var flow_steps = zdsv.createFlowStepsArray('stev', state_name);

		if (light_cb_cs.length) {
			etr.evcompanion.triggerCallbacks(light_cb_cs, false, false, light_name, value, flow_steps);
		}

		if (default_cb_cs.length) {
			triggerLegacySChEv(etr, state_name, value, zdsv.original_states[state_name], default_cb_cs, default_name, flow_steps);
		}

		if (flow_steps) {
			hp.markFlowSteps(flow_steps, 'stev', state_name);
		}

	}

	// states_links

}

updateProxy.update = function(md, state_name, state_value, opts) {
	/*if (state_name.indexOf('-') != -1 && console.warn){
		console.warn('fix prop state_name: ' + state_name);
	}*/
	if (md.hasComplexStateFn(state_name)){
		throw new Error("you can't change complex state " + state_name);
	}
	return updateProxy(md, [state_name, state_value], opts);


	// md.updateState(state_name, state_value, opts);
};
updateProxy.getComplexInitList = getComplexInitList;

return updateProxy;
});