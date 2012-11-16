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

/* Construct the tree on the left */

var nbsp="\u00a0";


function belongs_on(xapi,vm,ignore_resident_on)
{
    /* A VM belongs on a host if it has a vdi in a non-shared sr or
      it's resident on the host */

    if(xapi.xo.host[xapi.xo.vm[vm].resident_on] && !ignore_resident_on)
	return xapi.xo.vm[vm].resident_on;

    /* Non-shared SRs */

    var nonsharedsrs=new Object;

    for(sr in xapi.xo.sr) {
	if(!xapi.xo.sr[sr].shared && xapi.xo.sr[sr].PBDs) {
	    
	    var pbd=xapi.xo.sr[sr].PBDs[0];
	    if(pbd)
		nonsharedsrs[sr]=xapi.xo.pbd[pbd].host;
	}
    }

    /* For the VBDs, check if the VDIs are in the non-shared SRs */

    if(xapi.xo.vm[vm].VBDs) {
	for(var i=0; i<xapi.xo.vm[vm].VBDs.length; i++) {
	    var vbd=xapi.xo.vm[vm].VBDs[i];
	    if(!xapi.xo.vbd[vbd].empty) {
		var sr=xapi.xo.vdi[xapi.xo.vbd[vbd].VDI].SR;
		if(nonsharedsrs[sr])
		    return nonsharedsrs[sr];
	    }
	}
    }

    return null;
}

function mkvms(xapi,vms,defaulttemplatesonly)
{
    var result=new Array;

    for(var i=0; i<vms.length; i++) {
		var img;
		var attr={ id:("tree_"+vms[i]), 'class':"clickable" };
		switch(xapi.xo.vm[vms[i]].power_state.toLowerCase()) {
		case "running":
			img="img/tree_running_16.png";
			attr["class"]=attr["class"]+" draggable";
			break;
		case "suspended":
			img="img/tree_suspended_16.png";
			break;
		case "halted":
			img="img/tree_stopped_16.png";
			break;
		};
		for(op in xapi.xo.vm[vms[i]].current_operations) {
			img="img/tree_starting_16.png";
		}
		if(xapi.xo.vm[vms[i]].is_a_template)
			img="img/template_16.png";
		
		if((defaulttemplatesonly && xapi.xo.vm[vms[i]].other_config.default_template)
		   || (!defaulttemplatesonly && !xapi.xo.vm[vms[i]].other_config.default_template))
			result.push({ "data" : 
						  { "title":xapi.xo.vm[vms[i]].name_label,
							"icon":img,
							"attr" : attr
						  },
						});
    }
	
    return result;
}



function mksrs(xapi,srs)
{
    var results=new Array;

    for(var i=0; i<srs.length; i++) {
		results.push({"data":{ "title":xapi.xo.sr[srs[i]].name_label,
							   "icon":"img/storage_16.png",
							   "attr":{ "id":"tree_"+srs[i], "class":"clickable" } },				 
					 });
	}
	
    return results;
}

function mkhosts(xapi,vms,srs)
{
    var result=new Array;

    for(var host in vms) {
		var attr={id:"tree_"+host, "class":"clickable"}

		if(host != "none")
			result.push({"data": { "title":xapi.xo.host[host].name_label,
								   "icon":"img/tree_running_16.png",
								   "attr": attr },
						 "state": "open",
						 "children":mkvms(xapi,vms[host]).concat(mksrs(xapi,srs[host]))});
    }

    result.push({"data": { "title": "Default templates",
						   "icon": "img/template_16.png" },
				 "attr" : {},
				 "state" : "closed",
				 "children" : mkvms(xapi,vms["none"],true)});

    var vms=mkvms(xapi,vms["none"]);
    for(var i=0; i<vms.length; i++)
	result.push(vms[i]);

    var srs=mksrs(xapi,srs["none"]);
    for(var i=0; i<srs.length; i++)
	result.push(srs[i]);

    return result;
}

function mkpool(xapi)
{

    /* Build up a list of affinities of VMs (via visibility of their SRs on hosts) */

    var vms=new Object;
    
    for(host in xapi.xo.host) {
	vms[host]=new Array;
    }

    vms["none"]=new Array;

    for(vm in xapi.xo.vm) {
	if(!xapi.xo.vm[vm].is_control_domain) {
	    var host;
	    host=belongs_on(xapi,vm,false);
	    if(host)
		vms[host].push(vm);
	    else
		vms["none"].push(vm);
	}
    }

    /* Equivalently, build up a list of SRs */

    var srs=new Object;

    for(host in xapi.xo.host) {
	srs[host]=new Array;
    }

    srs["none"]=new Array;

    for(sr in xapi.xo.sr) {
	var host;
	var found=false;

	if(!xapi.xo.sr[sr].shared) {
	    if(xapi.xo.sr[sr].PBDs) {
		for(var j=0; j<xapi.xo.sr[sr].PBDs.length; j++) {
		    
		    var pbd=xapi.xo.sr[sr].PBDs[j];
		    if(pbd) {
			host=xapi.xo.pbd[pbd].host;
			srs[host].push(sr);
			found=true;
		    }	
		}
	    }
	}

	if(!found)
	    srs["none"].push(sr);
    }
	    
    /* Get the Pool object */
    var pool;
    var poolref;
    for(poolref in xapi.xo.pool)
		pool=xapi.xo.pool[poolref];

    return {"data":{"title":pool.name_label,
					"attr":{id:"tree_"+poolref, "class":"clickable"},
				    "icon":"img/poolconnected_16.png"},
		    "state":"open",
		    "children":mkhosts(xapi,vms,srs)};
}

function doclick(evt) {
    var id=$(evt.currentTarget).attr("id");
    var ref=id.slice(5);
	console.log("doclick..." + ref);
    render_object(ref);
}

function mktree(xapi,elt)
{
    var popupmenutarget;

	elt.jstree({"json_data": {"data":mkpool(xapi)},"themes":{"theme":"classic"},"plugins" : ["themes","json_data"]}).bind("loaded.jstree", function (event, data) { 
	var clickables = $(".clickable");
	clickables.hover(function() {$(this).addClass("hoverbold")}, function(){$(this).removeClass("hoverbold")}).click(doclick); });

    /*.find(".draggable").Draggable({ghosting:true, revert:true}).end();
    pool.find(".droptarget").Droppable({
	accept : "draggable",
	activeclass : "greenhighlight",
	hoverclass : "redhighlight",
	tolerance : "pointer",
	ondrop: function (drag) {
	    var host=this.id.substring(5);
	    var vm=drag.id.substring(3);
	    var task=xapi_check(xenapi.Async.VM.pool_migrate(session,vm,host,{}));
	    do_log(vm,"Migrating...",task);
	}
    });
    */

    /*
    $("li.vm_tree",pool).contextMenu('mytreemenu', {
	onShowMenu: function(e,menu) {
	    var vm=$(e.target).attr('id');
	    vm=vm.substring(3);
	    popupmenutarget=vm; // for bindings below
	    //console.log(vm);
       	    $(menu).addClass("dontshowme");
	    for(var i=0; i<$xapi.xo.vm[vm].allowed_operations.length; i++) {
		var op = $xapi.xo.vm[vm].allowed_operations[i];
		//console.log("op="+op);
		$("#"+op,menu).removeClass("dontshowme");
	    }
       	    $(".dontshowme",menu).remove();
	    
	    return menu;
	},
	bindings: {
	    'clone': function(t) {vm_clone(popupmenutarget);}
	    ,'start': function(t) {vm_start(popupmenutarget);}
	    ,'clean_shutdown': function(t) {vm_clean_shutdown(popupmenutarget);}
	    ,'clean_reboot': function(t) {vm_clean_reboot(popupmenutarget);}
	    ,'suspend': function(t) {vm_suspend(popupmenutarget);}
	    ,'resume':function(t) {vm_resume(popupmenutarget);}		
	}
	
    }).bind("click",{"foo":"bar"}, function(event) {
	$(event.currentTarget).addClass("selected");
    	var vm=this.id.substring(3); 
    	$vmd.populateVMPane(vm); });
    */
/*    div.empty().append(pool);   */
}

function dotree(xapis,div) {
    var content=$('#'+div).empty();

    for(pool in xapis) {
		xapi=xapis[pool];
		var elt=$('<div></div>');
		mktree(xapi,elt);
		content.append(elt);
		
		xapi.registerEventListener("tree_adder",["vm"],"add",function(xapi,elt) {return function() {mktree(xapi,elt)} } (xapi,elt));
		xapi.registerEventListener("tree_deler",["vm"],"del",function(xapi,elt) {return function() {mktree(xapi,elt)} } (xapi,elt));
		xapi.registerEventListener("tree_moder",["vm"],"mod",function(xapi,elt) {return function() {mktree(xapi,elt)} } (xapi,elt));
	}
}


