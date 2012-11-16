function find_template(xapi,template_name) {
	for(vm in xapi.xo.vm) {
		if(xapi.xo.vm[vm].name_label == template_name)
			return vm;
	}
}

function find_network(xapi,bridge) {
	for(net in xapi.xo.network) {
		if(xapi.xo.network[net].bridge == bridge)
			return net;
	}
}

function find_default_sr(xapi) {
	var pool;
	for(p in xapi.xo.pool) {
		pool=p;
	}
	return xapi.xo.pool[pool].default_SR;
}

function writeblob(xapi,blob,text) {
	$.ajax({
		type: 'PUT',
		contentType: 'application/json',
		url: ("http://"+xapi.master_address+"/blob?session_id="+xapi.session+"&ref="+blob),
		dataType: "json",
		data:text,
		success: function(data, textStatus, jqXHR){
			console.log("Uploaded blob");
		},
		error: function(jqXHR, textStatus, errorThrown){
			console.log('blob upload error');
			console.log(textStatus);
			console.log(errorThrown);
		} });
}

function disk_add(xapi,vm,sr,size,device,disk_name) {
	var vdi = {
		name_label:disk_name,
		name_description:"",
		SR:sr,
		virtual_size:size,
		type:"system",
		sharable:false,
		read_only:false,
		other_config:{},
		xenstore_data:{},
		sm_config:{},
		tags:[]}

	var vbd = {
		VM:vm,
		VDI:"",
		userdevice:device,
		bootable:true,
		mode:"rw",
		type:"disk",
		unpluggable:false,
		empty:false,
		other_config:{owner:""},
		qos_algorithm_type:"",
		qos_algorithm_params:{}
	}

	var myvdi = xapi.check(xapi.xapi.VDI.create(xapi.session,vdi));
	vbd['VDI']=myvdi;
	var myvbd = xapi.check(xapi.xapi.VBD.create(xapi.session,vbd));

	return myvbd;
}
