/* State */

var Dbview = function () {
/* Internal */
	this.pool=undefined;
	this.cls=undefined;
	this.ref=undefined;
	this.session=undefined;
	this.table=undefined;

/* Panes */
	this.templates="db_templates.xml";
	this.paneName="Database";
}

Dbview.prototype = {
	class_of_ref: function(xapi,ref) {
		for(cls in xapi.xo) {
			if(xapi.xo[cls].hasOwnProperty(ref))
				return cls
		}
	},

	fix_active_class : function() {
		$('[data-cls]').parents().removeClass("active");
		$('[data-cls="'+this.cls+'"]').parent().addClass("active");
	},

	fix_active_ref : function() {
		$('[data-ref]').parents("li").removeClass("active");
		$('[data-ref="'+this.ref+'"]').parents("li").addClass("active");
	},

	set_target : function(pool, cls, ref) {
		var curcls=this.cls;
		var curref=this.ref;

		if(pool != this.pool) {
			this.pool=pool;
			this.cls=undefined;
			this.populate_classes();
		}

		if(cls) {
			this.cls=cls;
		}
		if(this.cls != curcls) {
			this.ref=undefined;
			this.populate_references();
			this.fix_active_class();
		}

		if(ref) {
			this.ref=ref;
		}

		if(this.ref != curref) {
			this.fix_active_ref();
			$('#db_object').empty();
		}

		var p=this;
		var x=$xapis[this.pool];
		x.xapi.session.logout(this.session);
		this.session=x.check(x.xapi.session.login_with_password(x.username,x.password));
		x.xapi.event.from(function(result) {p.events_callback(result)},this.session,[this.cls+"/"+this.ref],"",0.1);
	},

	do_opaque_click : function(evt) {
		var ref=$(evt.target).data('ref');
		var pool=$(evt.target).data('pool');
		var cls=this.class_of_ref($xapis[pool],ref);
		this.set_target(pool,cls,ref);
	},

	db_class_click : function(evt) {
		var cls=$(evt.target).data('cls');
		var pool=$(evt.target).data('pool');
		this.set_target(pool,cls);
	},

	populate_references : function() {
		var data=[];
		var i=0;
		var pool=this.pool;
		var xapi=$xapis[pool];
		var got_active=false;

		if(this.cls && xapi.xo[this.cls].hasOwnProperty(this.ref)) {
			got_active=true;
		}
	
		for(var key in xapi.xo[this.cls]) {
			if(!got_active) {
				this.ref=key;
				got_active=true;
			}
			
			data[i++]={"pool":pool, 
					   "ref":key, 
					   "shortref":key.substring(10,18),
					   "active":(key==this.ref)};
			i++;
		}

		var template=$(ich.db_refs_template({data:data}));
		$('a',template).click((function(x) {return function(evt) {x.do_opaque_click(evt)}})(this));
		$('#db_refs').empty().append(template);

		var p=this;
		
		xapi.unregisterEventListener("db_references_add");
		xapi.unregisterEventListener("db_references_del");
		xapi.registerEventListener("db_references_add",[this.cls],"add",function() {p.populate_references();});
		xapi.registerEventListener("db_references_del",[this.cls],"del",function() {p.populate_references();});
	},

	populate_classes : function() {
		var xapi = $xapis[this.pool];

		if(!(this.cls in xapi.xo)) {
			this.cls="vm";
		}
		
		var mainclasses=[
			{cls:"vm",strcls:"VM"},
			{cls:"host",strcls:"Host"},
			{cls:"pool",strcls:"Pool"},
			{cls:"sr",strcls:"SR"}];
		
		var classes=[];
		var i=0;
		
		for(var cls in xapi.xo) {
			if(!(cls in {"vm":1,"pool":1,"host":1,"sr":1})) {
				classes[i++]=cls;
			}
		}
		
		for(i=0; i<classes.length; i++) {
			if(this.cls==classes[i].cls)
				classes[i].active=true;
		}
		for(i=0; i<mainclasses.length; i++) {
			if(this.cls==mainclasses[i].cls)
				mainclasses[i].active=true;
		}
		
		var template=$(ich.db_classes_template({mainclasses:mainclasses, classes:classes, pool:this.pool}));
		var p=this;
		$('a',template).click(function(evt) {p.db_class_click(evt)});
		$('#db_classes').empty().append(template);
	},

	events_callback : function(events) {
		if(events.result.Status=="Failure") {
			return;
		}
		var events=eval("("+events.result.Value+")");
	
		for(var i=0; i<events.events.length; i++) {
			switch(events.events[i].operation) {
			case "mod":
				if($('#db_object').data("ref")==this.ref) {
					this.refresh_object(events.events[i]);
				} else {
					this.populate_object(events.events[i]);
				};
				break;
			case "add":
				this.populate_object(events.events[i]);
				break;
			case "del":
				$('#db_object').empty();
				break;
			}
		}

		var xapi=$xapis[this.pool];
		var p=this;
		xapi.xapi.event.from(function(result) {p.events_callback(result)},this.session,[this.cls+"/"+this.ref],events.token,30.1);	
	},

	check_data : function(v) {
		if(v.value.substring(0,9)=="OpaqueRef" && v.value != "OpaqueRef:NULL") {
			v['class']=true;
			v['ref']=v.value;
			v['pool']=this.pool;
		}
		return v;
	},

	refresh_object : function(events) {
		if(!this.table) {
			console.log("No table set!");
			return;
		}

		var table=this.table;
		
		var myobj = events.snapshot;

		for(key in events.snapshot) {
			var value=myobj[key];
			var data={key:key};
			if(typeof(value)=="string") {
				data.strvalue=[];
				data.strvalue[0]=this.check_data({value:value});
			} else if($.isArray(value)) {
				data.strvalue=[];
				for(var l=0; l<value.length; l++) {
					data.strvalue[l]=this.check_data({value:value[l]});
				}
			} else if(typeof(value)=="object") {
				data[i].objvalue=[];
			}
			var template=ich.db_object_row(data);
			$('#table_row_'+key,table).empty().append($(template));
		}
	},

	populate_object : function(events) {
		var data=[];
		var i=0;
		
		var myobj = events.snapshot;
		
		for(key in myobj) {
			var value=myobj[key];
			data[i]={key:key};
			if(typeof(value)=="string") {
				data[i].strvalue=[];
				data[i].strvalue[0]=this.check_data({value:value});
			} else if($.isArray(value)) {
				data[i].strvalue=[];
				for(var l=0; l<value.length; l++) {
					data[i].strvalue[l]=this.check_data({value:value[l]});
				}
			} else if(typeof(value)=="object") {
				data[i].objvalue=[];
			}
			i++;
		}
		
		mydata=data;

		var template=$(ich.db_object_template({data:data, objref:this.ref, objclass:this.cls}));
		var p=this;
		$('a',template).click(function(evt){p.do_opaque_click(evt)});
		this.table=template;
		$('#db_object').empty().append(template);
	},

	show : function(content) {
		content.empty().append($(ich.db_content()));

		if(!this.target) {
			for(var pool in $xapis) {
				this.set_target(pool);
				break;
			}		
		};

		this.populate_classes();
		this.populate_references();
	},

	hide : function() {
		this.target=null;
	}

}

var dbview;

(function() {
	dbview=new Dbview();
	$(document).ready(function(){register(dbview)});
})();
