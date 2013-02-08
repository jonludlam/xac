/* State */

var Consoles = function () {
	this.cur_pool=null;
	this.cur_con=null;
	this.tokens={};
	this.sessions={};
	this.objects={vm:{},console:{}};
/* Panes */
	this.templates="console_templates.xml";
	this.paneName="VM consoles";
}

Consoles.prototype = {
	click : function(evt) {
		var ref=$(evt.target).data('ref');
		var pool=$(evt.target).data('pool');
		vnc($xapis[pool],ref,$('#con_console'));
	},


	populate_list : function() {
		var hash={pools:[]};
		var i=0;

		for(pool in $xapis) {
			var x = {};
			var xo=$xapis[pool].xo;

			x['name'] = xo.pool[pool].name_label;

			x['consoles']=[];
			var j=0;
			console.log("Checking pool: " + pool);

			for(c in xo.console) {
				var con=xo.console[c];
				console.log(con);

				var active = (c==this.cur_con);

				if(con.protocol=="rfb") {
					if(xo.vm[con['VM']]) {
						console.log("rfb");
						var vm=con['VM']
						console.log("VM="+vm);
						var convm=xo.vm[vm];
						console.log(convm);
						var vmname=convm.name_label;
						console.log("VM name="+vmname);
						x['consoles'][j++]={conname:vmname,
											active:active,
											ref:c,
											pool:pool};
					}
				}
			}

			hash.pools[i++]=x;
		}

		console.log("here");
		var foo=$(ich.console_list(hash));
		var t=this;

		$('a',foo).click(function(evt) {t.click(evt)});

		$("#con_pools_and_consoles_ul").empty().append(foo);
	},

	events_callback : function(pool,events) {
		if(events.result.Status=="Failure") {
			return;
		}
		var events=eval("("+events.result.Value+")");
		
		for(var i=0; i<events.events.length; i++) {
			switch(events.events[i].operation) {
			case "mod":
			case "add":
				this.objects[events.events[i]['class']][events.events[i].ref]=events.events[i].snapshot;
				break;
			case "del":
				break;
			}
		}
		
		var p=this;
		p.tokens[pool]=events.token;
		$xapis[pool].xapi.event.from(function(result) {p.events_callback(pool,result)}, this.sessions[pool],["vm","console"],this.tokens[pool],30.1);
	},
	
	start: function() {
		for(var pool in $xapis) {
			var xapi = $xapis[pool];
			if(!(pool in this.sessions)) {
				this.sessions[pool]=xapi.check(xapi.xapi.session.login_with_password(xapi.username,xapi.password,"1.0"));
			}
			if(!(pool in this.tokens)) {
				this.tokens[pool]="";
			}
			var p=this;
			xapi.xapi.event.from((function(pool) { return function(result) {p.events_callback(pool,result)}})(pool),this.sessions[pool],["vm","console"],this.tokens[pool],30.1);	
		}
	},

	show : function(content) {
		content.empty().append($(ich.console_content()));


/*		this.start(); */
		this.populate_list();
/*		if(!this.target) {
			for(var pool in $xapis) {
				this.set_target(pool);
				break;
			}		
		}*/
	},

	hide : function() {
		if(rfb) 
			try {rfb.disconnect()} catch(err) {}
	}

}

var consoles;

(function() {
	consoles=new Consoles();
	$(document).ready(function(){register(consoles)});
})();
