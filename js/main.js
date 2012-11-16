var Main = function () {
/* Panes */
	this.templates="main_template.xml";
	this.paneName="XAC";
	this.brand=true;
}

Main.prototype = {
	show : function(content) {
		var data={};
		var states = [
			"Disconnected",
			"Connecting",
			"Connected",
			"Uncertain"];
		function nhosts(pool) {
			var n=0;
			for(host in $xapis[pool].xo.host) {
				n++;
			}
			return n;
		}
		for(var pool in $xapis) {
			if(!data.pools) {
				data.pools={pool:[]}
			}
			data.pools.pool.push({
				pool:pool,
				master_address:$xapis[pool].xo.host[$xapis[pool].xo.pool[pool].master].name_label,
				master_ip:$xapis[pool].xo.host[$xapis[pool].xo.pool[pool].master].address,
				nhosts:nhosts(pool),
				state:states[$xapis[pool].status],
				autoconnect:login.will_autoconnect(pool)
			});			
		}
		var mycontent = $(ich.main_content(data));
		$("input",mycontent).click(function(evt) {
			var pool=$(evt.target).data('pool');
			var value=$(evt.target).is(":checked");
			if(value) {
				login.remember_server($xapis[pool].master_address,
									  $xapis[pool].username,
									  $xapis[pool].password,
									  pool);
			} else {
				login.forget_server(pool);
			}
		});
		content.empty().append(mycontent);
	},

	hide : function() {

	}
}

var main;

(function() {
	main=new Main();
	$(document).ready(function(){register(main)});
})();

function setstatus(status,n) {
	console.log(""+n+": "+status);
}

function connect(xapi,pool) {
	if($xapis.hasOwnProperty(pool))
		alert("Already connected to this pool!");

	$xapis[pool]=xapi;

    var vsnstring;
    switch(xapi.mastersoftwareversion.product_version) {
    case "4.0.0":
        vsnstring="Rio";
        break;
    case "4.1.0":
        vsnstring="Miami";
        break;
    case "5.0.0":
        vsnstring="Orlando";
        break;
    case "5.5.0":
        vsnstring="Midnight Ride";
        break;
    case "6.0.0":
	vsnstring="Boston";
	break;
    case "6.1.0":
        vsnstring="Tampa";
	break;
    }

    setstatus("Connecting to "+vsnstring+" server",1);

    xapi.init( 
        function() 
        {
            if(xapi.status==0) {
                setstatus("Failed to connect",0);
            } else {
                setstatus("Connected to "+vsnstring+" server",2);
            }
			/*dotree($xapis,"mytree");*/
			/*db_display(getxapi());*/
			pane_switchto('Database');
			
        });
	
}


function getxapi() {
	for (var pool in $xapis) {
		return $xapis[pool]
	}
}

function fakeconnect() {
	var xapi=new Xenapi();
	xapi.status=1;
	try { xapi.eventFieldsFromCallback(dumpedevents); } catch(e) { }
	
	var mypool;
	for(var pool in xapi.xo['pool']) {
		mypool=pool;
	}
	
	$xapis[mypool]=xapi;
}



$(document).ready(function() {
	$('#form_add_server').submit(function() { 
		pane_switchto('login_pane'); 
		return false; 
	});
	$.get("templates.xml", function(response) {
		$('script',response).each(function () {
			ich.addTemplate(this.getAttribute("id"),$(this).text());
		});
	})
});
