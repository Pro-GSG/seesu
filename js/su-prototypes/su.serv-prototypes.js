var suMapModel = function() {};

mapLevelModel.extendTo(suMapModel, {
	regDOMDocChanges: function(cb) {
		this
			.on('mpl-attach', function() {
				jsLoadComplete(function() {
					su.on('dom', cb);
				});
				
			})
			.on('mpl-detach', function() {
				jsLoadComplete(function() {
					su.off('dom', cb);
				});
			});
	}
});



var suServView = function() {};

provoda.View.extendTo(suServView, {
	init: function(md, opts) {
		this._super(md, opts);

		var _this = this;
		var onDOMDie = function(dead_doc, is_current_ui, ui) {
			_this.isAlive(dead_doc);
		};
		su.on('dom-die', onDOMDie);
		this.onDie(function() {
			su.off('dom-die', onDOMDie);	
		});
	}
});

var commonMessagesStore = function(glob_store, store_name) {
	this.init();
	this.glob_store = glob_store;
	this.store_name = store_name;
};


provoda.Eventor.extendTo(commonMessagesStore, {
	markAsReaded: function(message) {
		var changed = this.glob_store.set(this.store_name, message);
		if (changed){
			this.trigger('read', message);
		}
	},
	getReadedMessages: function() {
		return this.glob_store.get(this.store_name);
	}
});


var gMessagesStore = function(set, get) {
	this.sset = set;
	this.sget = get;
	this.store = this.sget() || {};
	this.cm_store = {};
};

Class.extendTo(gMessagesStore, {
	set: function(space, message) {
		this.store[space] = this.store[space] || [];
		if ( this.store[space].indexOf(message) == -1 ){
			this.store[space].push(message);
			this.sset(this.store);
			return true;
		}
	},
	get: function(space) {
		return this.store[space] || [];
	},
	getStore: function(name) {
		return this.cm_store[name] || (this.cm_store[name] = new commonMessagesStore(this, name));
	}
});




var PartsSwitcher = function() {};

provoda.Model.extendTo(PartsSwitcher, {
	init: function() {
		this._super();
		this.context_parts = {};
		this.active_part = null;
	},
	hideAll: function() {
		if (this.active_part){
			this.updateState('active_part', false);
			this.active_part.deacivate();
			this.active_part = null;
		}
	},
	hide: function(name){
		if (this.context_parts[name] === this.active_part){
			this.hideAll();
		}
	},
	addPart: function(model) {
		if (!this.context_parts[model.row_name]){
			this.context_parts[model.row_name] = model;
			this.addChild(model);
		}
	},
	getAllParts: function(){
		return this.context_parts;
	},
	switchPart: function(name) {
		if (this.context_parts[name] && this.context_parts[name] != this.active_part){
			if (this.active_part){
				this.active_part.deacivate();
			}
			this.active_part = this.context_parts[name];
			this.updateState('active_part', name);
			this.active_part.acivate();
			
	
		} else {
			this.hideAll();
		}
	}
});

var ActionsRowUI = function(){};
suServView.extendTo(ActionsRowUI, {
	createDetailes: function(){
		this.createBase();

		this.parts_views = {};

		var	parts = this.md.getAllParts();

		

		for (var i in parts) {
			var pv = parts[i].getFreeView(this);
			if (pv){
				this.parts_views[i] = pv;
				pv.appended();
				this.addChild(pv);
			}
		}
	},
	state_change: {
		active_part: function(nv, ov) {
			if (nv){
				this.row_context.removeClass('hidden');
				this.arrow.removeClass('hidden');
			} else {
				this.row_context.addClass('hidden');
			}
		}
	}
});



var BaseCRowUI = function(){};
suServView.extendTo(BaseCRowUI, {
	bindClick: function(){
		if (this.button){
			var md = this.md;
			this.button.click(function(){
				md.switchView();
			});
		}
	},
	getButtonPos: function(){
		var button_shift = this.button_shift || 0;
		return this.button.offset().left + (this.button.outerWidth()/2) + button_shift;
	},
	"stch-active_view": function(state){
		if (state){
			if (this.expand){
				this.expand();
			}
			var b_pos = this.getButtonPos();
			if (b_pos){
				var arrow = this.parent_view.arrow;
				arrow.css('left', b_pos - arrow.offsetParent().offset().left + 'px');
			}
			this.c.removeClass('hidden');
		} else {
			this.c.addClass('hidden');
		}
	}

});

var BaseCRow = function(){};
provoda.Model.extendTo(BaseCRow, {
	switchView: function(){
		this.actionsrow.switchPart(this.row_name);
	},
	hide: function(){
		this.actionsrow.hide(this.row_name);
	},
	deacivate: function(){
		this.updateState("active_view", false);
	},
	acivate: function(){
		this.updateState("active_view", true);
	}
});