define(function(require) {
'use strict';

var FlowStep = require('./FlowStep');
var spv = require('spv');

var Group = function(num) {
	this.num = num;
	this.complex_order = [num];
};

var sortFlows = function(item_one, item_two) {
	var none_one = !item_one || item_one.aborted;
	var none_two = !item_two || item_two.aborted;

	if (none_one && none_two) {
		return;
	} else if (none_one) {
		return -1;
	} else if (none_two) {
		return 1;
	}

	if (item_one.finup && item_two.finup) {

	} else if (item_one.finup){
		return 1;
	} else if (item_two.finup) {
		return -1;
	}


	var max_length;

	/*if (item_one.custom_order && item_two.custom_order) {

	} else if (item_one.custom_order) {

	} else if (item_two.custom_order) {

	}*/


	max_length = Math.max(item_one.complex_order.length, item_two.complex_order.length);

	for (var i = 0; i < max_length; i++) {
		var item_one_step = item_one.complex_order[i];
		var item_two_step = item_two.complex_order[i];

		if (typeof item_one_step == 'undefined' && typeof item_two_step == 'undefined'){
			return;
		}
		if (typeof item_one_step == 'undefined'){
			return -1;
		}
		if (typeof item_two_step == 'undefined'){
			return 1;
		}
		if (item_one_step > item_two_step){
			return 1;
		}
		if (item_one_step < item_two_step){
			return -1;
		}
	}
};


var getBoxedSetImmFunc = function(win) {
	return win.setImmediate || (function() {
		//http://learn.javascript.ru/setimmediate

		var head = {
			func: null,
			next: null
		}, tail = head; // очередь вызовов, 1-связный список

		var ID = Math.random(); // уникальный идентификатор

		var onmessage = function(e) {
			if ( e.data != ID ) {
				return;
			} // не наше сообщение
			head = head.next;
			var func = head.func;
			head.func = null;
			func();
		};

		if ( win.addEventListener ) { // IE9+, другие браузеры
			win.addEventListener('message', onmessage, false);
		} else { // IE8
			win.attachEvent( 'onmessage', onmessage );
		}

		return win.postMessage ? function(func) {
			if (!win || win.closed) {
				return;
			}
			tail = tail.next = { func: func, next: null };
			win.postMessage(ID, "*");
		} :
		function(func) { // IE<8
			setTimeout(func, 0);
		};
	}());
};

var getBoxedRAFFunc = function(win) {
	var raf;

	if ( win.requestAnimationFrame ){
		raf = win.requestAnimationFrame;
	} else {
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		for(var x = 0; x < vendors.length && !raf; ++x) {
			raf = win[vendors[x]+'RequestAnimationFrame'];
		}
	}
	return raf && function(fn) {
		return raf.call(win, fn);
	};
};

var CallbacksFlow = function(win, rendering_flow, iteration_time) {
	this.flow = [];
	this.flow_start = null;
	this.flow_end = null;
	this.busy = null;
	this.iteration_time = iteration_time || 250;
	this.iteration_delayed = null;
	this.flow_steps_counter = 1;
	// this.flow_steps_collating_invalidated = null;
	var _this = this;
	this.hndIterateCallbacksFlow = function() {
		_this.iterateCallbacksFlow();
	};
	var raf = rendering_flow && getBoxedRAFFunc(win);
	if ( raf ) {
		this.pushIteration = function(fn) {
			return raf(fn);
		};
	} else {
		var setImmediate = getBoxedSetImmFunc(win);
		this.pushIteration = function(fn) {
			return setImmediate(fn);
		};
	}
};
var insertItem = spv.insertItem;
CallbacksFlow.prototype = {
	startGroup: function() {
		return new Group(++this.flow_steps_counter);
	},
	iterateCallbacksFlow: function() {
		var start = Date.now() + this.iteration_time;
		this.iteration_delayed = false;
		this.callbacks_busy = true;

		var stopped;
		for (var cur = this.flow_start; cur;) {
			this.flow_start = cur;
			if (!this.flow_start) {
				this.flow_end = null;
			}
			if (Date.now() > start){
				stopped = cur;
				this.pushIteration(this.hndIterateCallbacksFlow);
				break;
			}
			this.flow_start = cur.next;
			if (!this.flow_start) {
				this.flow_end = null;
			}

			if (!cur.aborted) {
				cur.call();
			}

			if (this.flow_start == cur) {
				cur = cur.next;
			} else {
				cur = this.flow_start;
			}
		}
		this.flow_start = stopped;
		if (!stopped) {
			this.flow_end = null;
		}

		if (!this.flow_start) {
			this.callbacks_busy = false;
		}

	},
	checkCallbacksFlow: function() {
		if (!this.iteration_delayed && !this.callbacks_busy){
			this.pushIteration(this.hndIterateCallbacksFlow);

			this.iteration_delayed = true;
		}
	},
	pushToFlow: function(fn, context, args, cbf_arg, cb_wrapper, real_context, motivator, finup) {
		var flow_step = new FlowStep(++this.flow_steps_counter, fn, context, args, cbf_arg, cb_wrapper, real_context, motivator, finup);
		if (motivator){
			var last_item = this.flow_end;
			var result = last_item && sortFlows(last_item, flow_step);
			if (result === 1) {
				//очевидно, что новый элемент должен в результате занять другую позицию

				var last_matched;
				for (var cur = this.flow_start; cur; cur = cur.next) {
					var match_result = sortFlows(cur, flow_step);
					if (match_result == -1) {
						last_matched = cur;
					} else {
						if (cur) {
							// debugger;
						}

						break;
					}
				}

				if (!cur) {
					throw new Error('something wrong');
				}

				if (!last_matched) {
					flow_step.next = this.flow_start;
					this.flow_start = flow_step;
				} else {
					flow_step.next = last_matched.next;
					last_matched.next = flow_step;
				}

			} else {
				if (this.flow_end) {
					this.flow_end.next = flow_step;
				}
				this.flow_end = flow_step;
				if (!this.flow_start) {
					this.flow_start = flow_step;
				}
			}
		} else {
			if (this.flow_end) {
				this.flow_end.next = flow_step;
			}
			this.flow_end = flow_step;
			if (!this.flow_start) {
				this.flow_start = flow_step;
			}
		}

		this.checkCallbacksFlow();
		return flow_step;

	}
};
return CallbacksFlow;
});
