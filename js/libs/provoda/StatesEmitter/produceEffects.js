define(function () {
'use strict';

function checkAndMutateCondReadyEffects(changes_list, self) {
	var index = self.__api_effects_$_index;

	for (var i = 0; i < changes_list.length; i+=3) {
		var state_name = changes_list[i+1];
		var value = changes_list[i+2];
		if (!value || !index[state_name]) {
			continue;
		}
		self._effects_using.conditions_ready[index[state_name].name] = true;
		self._effects_using.invalidated[index[state_name].name] = true;
	}
}

function checkAndMutateInvalidatedEffects(changes_list, self) {
	var index = self.__api_effects_$_index_by_triggering;

	for (var i = 0; i < changes_list.length; i+=3) {
		var state_name = changes_list[i+1];
		if (!index[state_name]) {
			continue;
		}
		var list = index[state_name];
		for (var jj = 0; jj < list.length; jj++) {
			self._effects_using.invalidated[list[jj].name] = true;
		}
		// self.__api_effects_$_index_by_triggering[index[state_name].name] = true;
		// self._effects_using.invalidated[index[state_name].name] = true;
	}
}

function checkAndMutateDepReadyEffects(self) {
	var using = self._effects_using;
	var effects = self.__api_effects;

	// маркировать готовые
	/*
		у которых не готовы зависимости - те не готовы
		выполнять готовых
		повторить проверку
		повторить выполнение
		повторять до упора

	*/
	using.dep_effects_ready_is_empty = true;

	var has_one = false;

	for (var effect_name in using.invalidated) {
		if (!using.invalidated[effect_name]) {
			continue;
		}

		var effect = effects[effect_name];

		var deps_ready = true;

		if (effect.deps && !using.conditions_ready[effect_name]) {
			deps_ready = false;
		}

		if (!deps_ready) {
			using.dep_effects_ready[effect_name] = deps_ready;
			continue;
		}

		for (var cc = 0; cc < effect.apis.length; cc++) {
			var api = effect.apis[cc];

			if (!self._interfaces_using.used[api]) {
				deps_ready = false;
				break;
			}
		}

		if (!deps_ready) {
			using.dep_effects_ready[effect_name] = deps_ready;
			continue;
		}

		if (!effect.effects_deps) {
			using.dep_effects_ready[effect_name] = true;
			has_one = true;
			continue;
		}

		has_one = true;
		for (var i = 0; i < effect.effects_deps.length; i++) {
			var dep_effect_name = effect.effects_deps[i];
			if (using.invalidated[dep_effect_name] || !using.once[dep_effect_name]) {
					deps_ready = false;
					has_one = false;
					break;
			}
		}


		using.dep_effects_ready[effect_name] = deps_ready;
	}
	using.dep_effects_ready_is_empty = using.dep_effects_ready_is_empty && !has_one;
}

function checkExecuteMutateEffects(self) {
	var using = self._effects_using;
	var effects = self.__api_effects;

	for (var effect_name in using.dep_effects_ready) {
		if (!using.dep_effects_ready[effect_name]) {
			continue;
		}

		var effect = effects[effect_name];

		var args = new Array(effect.apis.length + effect.triggering_states.length);
		for (var i = 0; i < effect.apis.length; i++) {
			args[i] = self._interfaces_using.used[effect.apis[i]];
		}
		for (var jj = 0; jj < effect.triggering_states.length; jj++) {
			args[effect.apis.length + jj] = self.state(effect.triggering_states[jj]);
		}

		effect.fn.apply(null, args);

		using.invalidated[effect_name] = false;
		using.dep_effects_ready[effect_name] = false;
		using.once[effect_name] = true;
	}

	using.dep_effects_ready_is_empty = true;
}

function iterateEffects(changes_list, self) {
	if (!self.__api_effects_$_index) {
		return;
	}

	if (!self._effects_using) {
		self._effects_using = {
			conditions_ready: {},
			invalidated: {},
			once: {},
			dep_effects_ready: {},
			dep_effects_ready_is_empty: true
		};
	}

	checkAndMutateCondReadyEffects(changes_list, self);
	checkAndMutateInvalidatedEffects(changes_list, self);

	checkAndMutateDepReadyEffects(self);

	while (!self._effects_using.dep_effects_ready_is_empty) {
		checkExecuteMutateEffects(self);
		checkAndMutateDepReadyEffects(self);
	}
}

function checkApi(declr, value, self) {
	if (!value) {
		self.useInterface(declr.name, null);
		return;
	}

	self.useInterface(declr.name, declr.fn());
}

function iterateApis(changes_list, context) {
	//index by uniq
	var index = context.__apis_$_index;
	if (!index) {
		return;
	}

	for (var i = 0; i < changes_list.length; i+=3) {
		var state_name = changes_list[i+1];
		if (!index[state_name]) {
			continue;
		}

		checkApi(index[state_name], changes_list[i+2], context);
	}
}


return function (total_ch, self) {
  iterateApis(total_ch, self);
	iterateEffects(total_ch, self);
};
});
