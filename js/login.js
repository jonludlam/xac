var Login = function () {
/* Panes */
	this.templates="login_templates.xml";
	this.paneName="Login";
}


Login.prototype = {
	remember_server: function(master_address,username,password,pool) {
		console.log("Remembering server: "+master_address+" (pool="+pool+")");

		if(typeof(Storage)=="undefined")
		{
			alert("Can't remember to auto connect to this pool. Your browser is too old");
			return;
		}

		var accookie;

		try {
			accookie = JSON.parse(localStorage.xac_autoconnect);
		} catch(err) {
			accookie = {pools:[]}
		}
		
		for(var i=0; i<accookie.pools.length; i++) {
			if(accookie.pools[i].pool == pool)
				return;
		}

		accookie.pools.push({username:username, 
							 password:password,
							 master_address:master_address,
							 pool:pool});
		
		localStorage.xac_autoconnect=JSON.stringify(accookie);
	},

	will_autoconnect : function(pool) {
		try {
			accookie = JSON.parse(localStorage.xac_autoconnect);
		} catch(err) {
			accookie = {pools:[]}
		}
		
		for(var i=0; i<accookie.pools.length; i++) {
			if(accookie.pools[i].pool == pool) {
				return true;
			}
		}

		return false;

	},

	forget_server : function(pool) {
		console.log("Forgetting server: (pool="+pool+")");

		if(typeof(Storage)=="undefined")
		{
			alert("Can't forget to auto connect to this pool. Your browser is too old");
			return;
		}

		var accookie;

		try {
			accookie = JSON.parse(localStorage.xac_autoconnect);
		} catch(err) {
			accookie = {pools:[]}
		}
		
		var new_pools=[];

		for(var i=0; i<accookie.pools.length; i++) {
			if(accookie.pools[i].pool != pool) {
				new_pools.push(accookie.pools[i]);
			}
		}

		accookie.pools=new_pools;

		localStorage.xac_autoconnect=JSON.stringify(accookie);
	},


	add_explicit_server: function(server,username,password,remember) {
		var xapi=new Xenapi();
		xapi.username=username;
		xapi.password=password;
		xapi.master_address=server;
		var t=this;
		xapi.detectServerVersion((function(r) {return function(xapi,pool) {
			if(r) {
				t.remember_server(xapi.master_address,xapi.username,xapi.password,pool);
			}
			connect(xapi,pool);
		}})(remember));
	},

	auto_connect: function() {
		if(typeof(Storage)=="undefined")
		{
			return;
		}

		var accookie;

		try {
			accookie = JSON.parse(localStorage.xac_autoconnect);
		} catch(err) {
			accookie = {pools:[]}
		}
		
		for(var i=0; i<accookie.pools.length; i++) {
			var o=accookie.pools[i];
			this.add_explicit_server(o.master_address,o.username,o.password,false);
		}
	},

	add_server: function() {
		var username=$('#login_username').val();
		var password=$('#login_password').val();
		var server=$('#login_server').val();
		var remember=$('#login_remember').val();

		this.add_explicit_server(server,username,password,remember);
	},

	show : function(content) {
		var mycontent = $(ich.login_content());
		content.empty().append(mycontent);
		var t=this;
		$('button',mycontent).click(function() {t.add_server()});		
	},
}

var login;

(function() {
	login=new Login();
	login.auto_connect();
	$(document).ready(function(){register(login)});
})();
