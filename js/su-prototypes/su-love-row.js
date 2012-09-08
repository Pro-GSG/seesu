var LoveRow;
(function(){
"use strict";



var LoveRowUI = function(){};
BaseCRowUI.extendTo(LoveRowUI, {
	init: function(md, parent_c, buttons_panel){
		this.md = md;
		this._super();
		this.c = parent_c.children('.love-song');
		this.button = buttons_panel.find('.pc-place .pc-love');

		this.bindClick();
		this.setModel(md);
	},
	expand: function(){
		if (this.expanded){
			return;
		} else {
			this.expanded = true;
		}
		var llit_view = this.md.lfm_loveit.getFreeView(this);
		this.c.append(llit_view.getC());
		llit_view.appended();
		this.addChild(llit_view);

		
	}
});

LoveRow = function(actionsrow, mo){
	this.init(actionsrow, mo);
};
BaseCRow.extendTo(LoveRow, {
	init: function(actionsrow, mo){
		var _this = this;
		this.actionsrow = actionsrow;
		this.mo = mo;
		this._super();
		this.lfm_loveit = new LfmLoveIt(su.lfm_auth, this.mo);
		this.lfm_loveit.on('love-success', function() {
			_this.hide();
		});
		this.addChild(this.lfm_loveit);
		
	},
	row_name: 'love',
	ui_constr: LoveRowUI
});
})()


