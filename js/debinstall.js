
function debinstall(xapi,name) {
	var template=find_template(xapi,"Debian Squeeze 6.0 (64-bit)");
	var vm=xapi.check(xapi.xapi.VM.clone(xapi.session,template, name));

	/* Forget about provisioning xml */
	xapi.check(xapi.xapi.VM.remove_from_other_config(xapi.session,vm,"disks"));

	xapi.check(xapi.xapi.VM.provision(xapi.session,vm));

	var net=find_network(xapi,"xenbr0");
	xapi.check(xapi.xapi.VIF.create(xapi.session,{device:"0",network:net,VM:vm,MAC:"",MTU:"1500",other_config:{},qos_algorithm_type:"",qos_algorithm_params:{}}));

	var sr=find_default_sr(xapi);
	disk_add(xapi,vm,sr,"8589934592","0","disk0");

	var preseedblob=xapi.check(xapi.xapi.VM.create_new_blob(xapi.session,vm,"preseed","",true));

	xapi.check(xapi.xapi.VM.remove_from_other_config(xapi.session,vm,"install-repository"));
	xapi.check(xapi.xapi.VM.add_to_other_config(xapi.session,vm,"install-repository","http://ftp.uk.debian.org/debian"))
	xapi.check(xapi.xapi.VM.set_PV_args(xapi.session,vm,"auto-install/enable=true url=http://"+xapi.master_address+"/blob?ref="+preseedblob+" interface=auto netcfg/dhcp_timeout=600 hostname="+name+" domain=uk.xensource.com"));
	
	var preseed_m = "" +
		"d-i debian-installer/locale     string en_GB\n"+
		"d-i keyboard-configuration/layoutcode string en_GB\n"+
		"d-i keyboard-configuration/xkb-keymap string en_GB\n"+
		"d-i mirror/country          string manual\n"+
		"d-i mirror/http/hostname        string ftp.uk.debian.org\n"+
		"d-i mirror/http/directory       string /debian/\n"+
		"d-i mirror/http/proxy       string\n"+
		"d-i time/zone string        string Europe/London\n"+
		"d-i partman-auto/method     string regular\n"+
		"d-i partman-auto/choose_recipe \\n"+
		"    select All files in one partition (recommended for new users)\n"+
		"d-i partman/confirm_write_new_label boolean true\n"+
		"d-i partman/choose_partition \\n"+
		"        select Finish partitioning and write changes to disk\n"+
		"d-i partman/confirm         boolean true\n"+
		"d-i partman/confirm_nooverwrite boolean true\n"+
		"d-i passwd/make-user        boolean false\n"+
		"d-i passwd/root-password        password {{password}}\n"+
		"d-i passwd/root-password-again  password {{password}}\n"+
		"	d-i apt-setup/local0/repository string http://www.uk.xensource.com/deb-guest lenny main\n"+
		"d-i debian-installer/allow_unauthenticated boolean true\n"+
		"popularity-contest  popularity-contest/participate  boolean false\n"+
		"tasksel tasksel/first           multiselect standard\n"+
		"d-i pkgsel/include string openssh-server vim ntp ethtool tpcdump bridge-util rsync ssmtp strace gdb build-essential xe-guest-utilities\n"+
		"d-i grub-installer/only_debian  boolean true\n"+
		"d-i grub-installer/with_other_os boolean true\n"+
		"d-i finish-install/reboot_in_progress   note\n";

	var params={password:"xenroot"};

	var preseed = Mustache.render(preseed_m,params);
	writeblob(xapi,preseedblob,preseed);

	xapi.check(xapi.xapi.VM.start(xapi.session,vm,false,false));
}