/* Install a XenServer on a pool */


function xsinstall(xapi,branch,name) {
	var vm=xapi.check(xapi.xapi.VM.clone(xapi.session,find_template(xapi,"Other install media"),name));
	var vmuuid=xapi.check(xapi.xapi.VM.get_uuid(xapi.session,vm))

	xapi.check(xapi.xapi.VM.provision(xapi.session,vm));
	xapi.check(xapi.xapi.VM.set_memory_static_max(xapi.session,vm,"2147483648"));
	xapi.check(xapi.xapi.VM.set_memory_dynamic_max(xapi.session,vm,"2147483648"));
	xapi.check(xapi.xapi.VM.set_memory_dynamic_min(xapi.session,vm,"2147483648"));
	xapi.check(xapi.xapi.VM.set_memory_static_min(xapi.session,vm,"2147483648"));
	xapi.check(xapi.xapi.VM.remove_from_HVM_boot_params(xapi.session,vm,"order"));
	xapi.check(xapi.xapi.VM.add_to_HVM_boot_params(xapi.session,vm,"order","ncd"));

	var net=find_network(xapi,"xenbr0");
	xapi.check(xapi.xapi.VIF.create(xapi.session,{device:"0",network:net,VM:vm,MAC:"",MTU:"1500",other_config:{},qos_algorithm_type:"",qos_algorithm_params:{}}));

	var sr=find_default_sr(xapi);
	disk_add(xapi,vm,sr,"42949672960","0","disk0");
	disk_add(xapi,vm,sr,"42949672960","1","disk1");

	var answerfileblob=xapi.check(xapi.xapi.VM.create_new_blob(xapi.session,vm,"answerfile","",true));
	var postinstallscriptblob=xapi.check(xapi.xapi.VM.create_new_blob(xapi.session,vm,"postinstallscript","",true));
	var initscriptblob=xapi.check(xapi.xapi.VM.create_new_blob(xapi.session,vm,"initscript","",true));
	var firstbootblob=xapi.check(xapi.xapi.VM.create_new_blob(xapi.session,vm,"firstboot","",true));

	var answerfile_m = 
		'<?xml version="1.0"?>\n'+
		'<installation>\n'+
		'  <primary-disk>sda</primary-disk>\n'+
		'  <keymap>uk</keymap>\n'+
		'  <root-password>xenroot</root-password>\n'+
		'  <source type="url">http://www.uk.xensource.com/{{branch}}/</source>\n'+
		'  <ntp-servers>ntp.uk.xensource.com</ntp-servers>\n'+
		'  <admin-interface name="eth0" proto="dhcp" />\n'+
		'  <timezone>Europe/London</timezone>\n'+
		'  <script stage="filesystem-populated" type="url">http://{{host}}/blob?ref={{postinstallscriptblob}}</script>\n'+
		'</installation>\n';
	
	var postinstallscript_m = 
		'#!/usr/bin/python\n'+
		'\n'+
		'import urllib2\n'+
		'import os\n'+
		'import sys\n'+
		'\n'+
		'u = urllib2.urlopen("http://{{host}}/blob?ref={{initscriptblob}}")\n'+
		'localFile = open(\'%s/etc/init.d/iptoxenserver\' % sys.argv[1], \'w\')\n'+
		'localFile.write(u.read())\n'+
		'localFile.close()\n'+
		'os.chmod("%s/etc/init.d/iptoxenserver" % sys.argv[1],0755)\n'+
		'os.symlink("../init.d/iptoxenserver","%s/etc/rc3.d/S99iptoxenserver" % sys.argv[1])\n'+
		'\n'+
		'u = urllib2.urlopen("http://{{host}}/blob?ref={{firstbootblob}}")\n'+
		'localFile = open(\'%s/etc/firstboot.d/90-vxenserver-setup\' % sys.argv[1], \'w\')\n'+
		'localFile.write(u.read())\n'+
		'localFile.close()\n'+
		'os.chmod("%s/etc/firstboot.d/90-vxenserver-setup" % sys.argv[1],0755)\n';

	var firstboot_m = 
		'#!/bin/bash\n'+
		'##\n'+
		'# Virtual xenserver firstboot\n'+
		'\n'+
		'set -e\n'+
		'\n'+
		'. ${XENSOURCE_INVENTORY}\n'+
		'\n'+
		'start() {\n'+
		'	host=\`xe host-list --minimal\`\n'+
		'	xe host-set-hostname-live host-uuid=$host host-name={{name}}\n'+
		'	xe host-param-set uuid=$host name-label={{name}}\n'+
		'	xe sr-create type=ext device-config:device=/dev/sdb name-label=ext\n'+
		'}\n'+
		'\n'+
		'case $1 in\n'+
		'    start)  start ;;\n'+
		'esac\n'
	
	var initscript_m = 
		'#!/bin/bash\n'+
		'. /etc/xensource-inventory\n'+
		'sleep 30\n'+
		'ip=\`xe host-param-get uuid=$INSTALLATION_UUID param-name=address\`\n'+
		'echo xe -s {{host}} -u {{username}} -pw {{password}} vm-param-set uuid=$vm other-config:vxsip=$ip > /tmp/initscript.out\n'+
		'xe -s {{host}} -u {{username}} -pw {{password}} vm-param-set uuid=$vm other-config:vxsip=$ip\n'

	var params = {
		host:xapi.master_address,
		username:xapi.username,
		password:xapi.password,
		name:name,
		branch:branch,
		initscriptblob:initscriptblob,
		postinstallscriptblob:postinstallscriptblob,
		vmuuid:vmuuid,
		firstbootblob:firstbootblob,
	}
		
	var answerfile = Mustache.render(answerfile_m,params);
	writeblob(xapi,answerfileblob,answerfile);

	var postinstallscript = Mustache.render(postinstallscript_m,params);
	writeblob(xapi,postinstallscriptblob,postinstallscript);

	var firstboot = Mustache.render(firstboot_m,params);
	writeblob(xapi,firstbootblob,firstboot);

	var initscript = Mustache.render(initscript_m,params);
	writeblob(xapi,initscriptblob,initscript);

	xenuserpc.set_pxe_target(vmuuid,branch,"http://"+xapi.master_address+"/blob?ref="+answerfileblob);

	xapi.check(xapi.xapi.VM.start(xapi.session,vm,false,false));

	xapi.check(xapi.xapi.VM.remove_from_HVM_boot_params(xapi.session,vm,"order"));
	xapi.check(xapi.xapi.VM.add_to_HVM_boot_params(xapi.session,vm,"order","cd"));

}