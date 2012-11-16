
test_machines = {}		

xenuserpc = new $.rpc(
	"http://snoosnoo2.uk.xensource.com:8000/RPC2",
	"xml", 
	function() {},
	null); 	

function find_my_xenservers(user) {
	var test_machines_x = xenuserpc.tm_get_list();
	var test_machine = test_machines_x.result;
	var res = xenuserpc.ul_locked_by(test_machine);
	
	for(var i=0; i<res.result.length; i++) {
		if(res.result[i].length>0) {
			test_machines[res.result[i][0]]=res.result[i][1]
		}
	}
		

	var mine=[];

	for(var tm in test_machines) {
		if(test_machines[tm]==user) {
			mine.push(tm);
		}
	}

	return mine

}

function connect_to_my_xenservers(user) {
	var mine=find_my_xenservers(user)

	for(var i=0; i<mine.length; i++) {
		var xs=mine[i];
		add_explicit_server(xs,"root","xenroot");
	}

}