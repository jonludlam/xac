/*
 * Copyright (C) 2006-2009 Citrix Systems Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation; version 2.1 only. with the special
 * exception on linking described in file LICENSE.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 */

/* Base module, keeps track of xapi's state */

/* status: 0==disconnected
           1==connected
*/

var Xenapi = function() {
    this.xo = {};
    this.xo_deleted = {};
    this.listeners = {};
    this.session = {};
    this.use_json = true;
    this.cache_objects = true;
    this.get_rrds = true;
    this.username=""
    this.password=""
    this.status=0; 
    this.hoststats={};
    this.lastupdatetime={};
	this.event_registration=[];
    this.master_address=""
};

Xenapi.prototype = {
    registerEventListener : function(name,classes,type,cb) {
		this.listeners[name]={classes:classes, ty:type, callback:cb};
    },

    unregisterEventListener : function(name) {
		delete this.listeners[name];
    },

	eventFieldsFromCallback : function(result) {
		var res=result.events;
		var list;
		var modifiedclasses={};
		var addedclasses={};
		var delclasses={};
		var c, ref, i, cb;
		
		for(i=0; i<res.length; i++) {
			c = res[i]['class'];
			ref = res[i].ref;
			
			switch(res[i].operation) {
			case "mod": 
				if(!modifiedclasses[c]) { modifiedclasses[c]={}; }
				modifiedclasses[c][ref]=res[i].snapshot; 
				break;
			case "add": 
				if(!addedclasses[c]) { addedclasses[c]={}; }
				addedclasses[c][ref]=res[i].snapshot;
				break;
			case "del": 
				if(!this.xo[c]) {
					this.xo[c]={}
				}
				if(this.xo[c][ref])
					delete this.xo[c][ref];
				if(!delclasses[c]) { delclasses[c]={}; }
				delclasses[c][ref]={};
				break;
			default:
				break;
			}
		}
		
		var callbacks={};
		
		for(cb in this.listeners) {
			if(this.listeners.hasOwnProperty(cb)) {
				var call=false;
				var classes;
				switch(this.listeners[cb].ty) {
				case "mod":
					classes=modifiedclasses;
					break;
				case "add":
					classes=addedclasses;
					break;
				case "del":
					classes=delclasses;
					break;
				default:
					classes=modifiedclasses;
				}
				
				for(c in classes) {
					if(classes.hasOwnProperty(c)) {
						for(i=0; i<this.listeners[cb].classes.length; i++) {
							if(this.listeners[cb].classes[i]==c) {
								call=true;
							}
						}
					}
				}
				
				if(call) {
					try {
						this.listeners[cb].callback(classes);
					} catch(e) {
					}
				}
			}
		};
		
		for(c in modifiedclasses) {
			if(modifiedclasses.hasOwnProperty(c)) {
				if(!this.xo[c]) {
					this.xo[c]={};
				}
				
				for(ref in modifiedclasses[c]) {
					if(modifiedclasses[c].hasOwnProperty(ref)) {
						for(field in modifiedclasses[c][ref]) {
							this.xo[c][ref]={};
							if(modifiedclasses[c][ref].hasOwnProperty(field)) {
								this.xo[c][ref][field]=modifiedclasses[c][ref][field];
							}
						}
						
					}
				}
			}
		}
		
		for(c in addedclasses) {
			if(addedclasses.hasOwnProperty(c)) {
				if(!this.xo[c]) {
					this.xo[c]={};
				}
				for(ref in addedclasses[c]) {
		    if(addedclasses[c].hasOwnProperty(ref)) {
				this.xo[c][ref]=addedclasses[c][ref];
		    }
				}
			}
		}
		
		var parent=this;
		
		if(parent.xapi.event.hasOwnProperty("fields_from")) {
			parent.xapi.event.fields_from(function(result) {parent.eventFieldsFromCallback(parent.check(result));},parent.session,parent.event_registration,result.token,30.1);
		} else {
			parent.xapi.event.from(function(result) {parent.eventFieldsFromCallback(parent.check(result));},parent.session,parent.event_registration,result.token,30.1);
		}
		
	},

    eventCallback : function(result) {

	/* Nb, I think the callbacks are the wrong way around. When mod or
           add events happen, the cache is not updated until after the callbacks,
           and the new objects are passed in the argument to the callback. This
           is backwards - the cache should be updated, and the _old_ objects 
           passed as the argument (for diffing purposes). */

	var res=result;
	var list;
	var modifiedclasses={};
	var addedclasses={};
	var delclasses={};
	var c, ref, i, cb;

	for(i=0; i<res.length; i++) {
	    c = res[i]['class'];
	    ref = res[i].ref;

	    switch(res[i].operation) {
	    case "mod": 
		if(!modifiedclasses[c]) { modifiedclasses[c]={}; }
		modifiedclasses[c][ref]=res[i].snapshot; 
		break;
	    case "add": 
		if(!addedclasses[c]) { addedclasses[c]={}; }
		addedclasses[c][ref]=res[i].snapshot;
		break;
	    case "del": 
		//delete this.xo[c][ref];
		this.xo[c][ref]=res[i].snapshot;
		this.xo[c][ref].__deleted__=true;

		if(modifiedclasses[c] && modifiedclasses[c][ref]) {
		    delete modifiedclasses[c][ref];
		}
		if(addedclasses[c] && addedclasses[c][ref]) {
		    delete addedclasses[c][ref];
		}
		break;
	    default:
		break;
	    }
	}
   
	var callbacks={};
	
	for(cb in this.listeners) {
	    if(this.listeners.hasOwnProperty(cb)) {
		var call=false;
		var classes;
		switch(this.listeners[cb].ty) {
		case "mod":
		    classes=modifiedclasses;
		    break;
		case "add":
		    classes=addedclasses;
		    break;
		case "del":
		    classes=delclasses;
		    break;
		default:
		    classes=modifiedclasses;
		}
		
		for(c in classes) {
		    if(classes.hasOwnProperty(c)) {
			for(i=0; i<this.listeners[cb].classes.length; i++) {
			    if(this.listeners[cb].classes[i]==c) {
				call=true;
			    }
			}
		    }
		}
		
		if(call) {
		    try {
			this.listeners[cb].callback(classes);
		    } catch(e) {
		    }
		}
	    }
	}

	for(c in modifiedclasses) {
	    if(modifiedclasses.hasOwnProperty(c)) {
		if(!this.xo[c]) {
		    this.xo[c]={};
		}

		for(ref in modifiedclasses[c]) {
		    if(modifiedclasses[c].hasOwnProperty(ref)) {
			this.xo[c][ref]=modifiedclasses[c][ref];
		    }
		}
	    }
	}

	for(c in addedclasses) {
	    if(addedclasses.hasOwnProperty(c)) {
		if(!this.xo[c]) {
		    this.xo[c]={};
		}
		for(ref in addedclasses[c]) {
		    if(addedclasses[c].hasOwnProperty(ref)) {
			this.xo[c][ref]=addedclasses[c][ref];
		    }
		}
	    }
	}
	
	var parent=this;
	parent.xapi.event.next(function(result) {parent.eventCallback(parent.check(result));},parent.session);
    },

    callEventListeners : function(classchanged) {
	var objects = {};
	objects[classchanged]={};
	
	for(var c in this.xo[classchanged]) {
	    if(this.xo[classchanged].hasOwnProperty(c)) {
		objects[classchanged][c]=true;
	    }
	}
	
	for(var cb in this.listeners) { 
	    if(this.listeners.hasOwnProperty(cb)) {
		for(var i=0; i<this.listeners[cb].classes.length; i++) {
		    if(this.listeners[cb].classes[i]==classchanged) {
			this.listeners[cb].callback(objects);
		    }
		}
	    }
	}
    },

    metricsTick : function () {
	var parent=this;
	
	if(this.apiversion.minor < 3) {
	    return;
	}

	var error = function(xhr,text,error) { if(text) {alert("text: "+text);} if(error) {alert("error: "+error);} };
    var successfn = function(parent,host) {return (function(data) {
		var t=processrrd(parent,host,eval("("+data+")")); 
		parent.lastupdatetime[host]=t;
	});};
	
	for(var host in this.xo.host) {
	    if(this.xo.host.hasOwnProperty(host)) {
		var t=this.lastupdatetime[host];
		
		if(!t) {
		    var d=new Date();
		    t=(d.getTime()/1000)-500;
		} else {
		    t=t+1;
		}
		
		if (typeof netscape != "undefined") { 
		    //netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect UniversalBrowserRead"); 
		} 
		
		var url = "http://"+this.xo.host[host].address+"/rrd_updates";
        var success = successfn(parent,host);
		
		$.ajax({
			type: "GET",
			    url: url,
			    error: error,
			    success: success,
			    dataType: "text",
			    data: "start="+parseInt(t,10)+"&cf=AVERAGE&json=true&interval=1&host=true&session_id="+this.session
			    });
	    }
	}
    },

    check : function(result) {
		result=result.result;
            if(result.Status=="Failure") {
                var message=result.ErrorDescription[0];
                for(var i=1; i<result.ErrorDescription.length; i++) {
                    message+=","+result.ErrorDescription[i];
		}
                alert("Request failed: Error='"+message+"'");
                throw new Error("failed!");
            }
	try {
            result = eval("("+result.Value+")");
            return result;
	} catch(e) {
	    // Silently ignore errors!
	}
    },

    detectServerVersion : function(next) {
		var tmprpc;
		var s;
		var h;
		var p;
		var poolref;
		var major, minor;
		var x=this;
		
		function check6(result) { sv=x.check(result); x.mastersoftwareversion=sv; tmprpc.session.logout(function(res) {next(x,poolref)},s); }
		function check5(result) { minor=x.check(result); x.apiversion={major:parseInt(major), minor:parseInt(minor)}; tmprpc.host.get_software_version(check6,s,h); }
		function check4(result) { major=x.check(result); tmprpc.host.get_API_version_minor(check5, s, h); }
		function check3(result) { 
			p=x.check(result); 
			for(r in p) {
				if(p.hasOwnProperty(r)) {
					poolref=r;
				}
			}
			h=p[poolref].master;
			tmprpc.host.get_API_version_major(check4, s, h); }
		function check2(result) { s=x.check(result); tmprpc.pool.get_all_records(check3, s);}
		function check1() { tmprpc.session.login_with_password(check2, x.username, x.password); }
		
		tmprpc= new $.rpc(
			"http://"+x.master_address+"/json",
			"xml", 
			check1,
			null,
			["session.login_with_password","pool.get_all_records","host.get_API_version_major","host.get_API_version_minor","session.logout", "host.get_software_version"]
		); 	
    },

    syncDetectServerVersion : function() {
	var tmprpc,session,poolrefrec,poolref,poolrec,host,majorver,minorver;

	tmprpc = new $.rpc(
	    "http://"+this.master_address+"/json",
	    "xml", 
	    null,
	    null,
	    ["session.login_with_password","pool.get_all_records","host.get_API_version_major","host.get_API_version_minor","session.logout", "host.get_software_version"]);
	session = this.check(tmprpc.session.login_with_password(this.username, this.password));
	poolrefrec = this.check(tmprpc.pool.get_all_records(session));
	for(r in poolrefrec) {
	    if(poolrefrec.hasOwnProperty(r)) {
		poolref=r;
		poolrec=poolrefrec[r];
	    }
	}
	host = poolrec.master;
	majorver = parseInt(this.check(tmprpc.host.get_API_version_major(session,host)));
	minorver = parseInt(this.check(tmprpc.host.get_API_version_minor(session,host)));
	this.mastersoftwareversion = this.check(tmprpc.host.get_software_version(session,host));
	this.apiversion = {major:majorver, minor:minorver};
	this.check(tmprpc.session.logout(session));
	return this.apiversion;
    },

    init : function(finishedfn) {
	if(this.myticker) {
	    clearInterval(this.myticker);
	}

	this.status=0;
	this.session="OpaqueRef:NULL";
	for(obj in this.xo) {
	    if(this.xo.hasOwnProperty(obj)) {
		try {
		    delete this.xo[obj];
		} catch (e) {}
	    }
	}

	var x=this;

	function check_all_done() {
	    for(var cc in x.xapi) {
		if(x.xo[cc.toLowerCase()]==-1) {
		    return false;
		}
	    }
	    return true;
	}
	
	var sequence = [
	    function() {
		x.xapi.session.login_with_password(
		    function(result) {
			x.session=x.check(result);
			sequence[1](); },
		    x.username,x.password); },
	    function() {
			if(!x.cache_objects) {
				return;
			}

			/* Generate a list of all the classes with get_all defined */
			var all_classes=[];
			var i=0;
			for(cls in x.xapi) {
				if(x.xapi[cls].hasOwnProperty("get_all")) {
					all_classes[i++]=cls;
				}
			}

			function startswith(x,y) {
				return x.slice(0, y.length) == y;
			}

			/* If fields_from is defined, make a subset query */
			if(x.xapi.event.hasOwnProperty("fields_from")) {
				var classes = [
					"pool",
					"host",
					"sr",
					"network",
					"vm[uuid,name_label,power_state,metrics,guest_metrics,resident_on,console]",
					"vbd[uuid,vm,vdi]",
					"vdi[uuid]",
					"vif[uuid,vm,network]",
					"task[uuid,name_label,status]",
					"pbd[currently_attached]"];
				for(i=0; i<all_classes.length; i++) {
					var found=false;
					for(var j=0; j<classes.length; j++) {
						if(startswith(classes[j],all_classes[i].toLowerCase()))
							var found=true;
					}
					if(!found)
						classes[classes.length]=all_classes[i].toLowerCase()+"[uuid]"
				}
				x.event_registration=classes;
				x.xapi.event.fields_from(
					function(result) {
						x.eventFieldsFromCallback(x.check(result));
						x.status=1;
						console.log("About to call finishedfn");
						finishedfn()},
					x.session,classes,"",0.1);
				x.startMetrics();
			} else {
				x.event_registration=["*"];
				x.xapi.event.from(
					function(result) {
						x.eventFieldsFromCallback(x.check(result));
						x.status=1;
						finishedfn()},
					x.session,["*"],"",0.1);
				x.startMetrics();
			}
		}
	];
		  
	
	
	if(this.apiversion.minor>2) {
	    /* Orlando and above */
	    this.xapi = new $.rpc(
		"http://"+this.master_address+"/json",
		"xml", 
		function() {sequence[0]();},
		null
	    ); 
	} else {
	    /* Miami and below */
	    this.xapi = new $.rpc(
		"http://"+this.master_address+"/json",
		"xml", 
		function() {sequence[0]();},
		null,
		mymessages);
	}
		
	return;	
    },

    startMetrics : function() {
	var x=this;
	if(!x.get_rrds) {
	    return;
	}
	x.metricsTick();
	this.myticker=window.setInterval(function() {x.metricsTick();},5000.0);
	for(var cb in x.listeners) {
	    if(x.listeners.hasOwnProperty(cb)) {
		x.listeners[cb].callback();
	    }
	}
    }
};

$xapis={};
