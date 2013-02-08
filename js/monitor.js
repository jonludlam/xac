var Monitor = function () {
/* Panes */
	this.templates="monitor_template.xml";
	this.paneName="Monitor";
	this.brand=false;

	this.graphs=[];
}

Monitor.prototype = {
	getGoodName : function(badname) {
		var namere=/([^\:]*)\:([^\:]*):([^\:]*):(.*)/;
		var myarr=namere.exec(badname);
		return myarr[4];
	},

	addGraph : function(g) {
		var data=g.getdata();
		
		g.plot=$.plot(g.jq, data, {
			xaxis: {mode: "time"}});

		this.graphs[this.graphs.length]=g;
	},
	
	monHostOverview : function(hostuuid) {
		var allhosts=[];

		for(var pool in $xapis) {
			for(var host in $xapis[pool].xo.host) {
				allhosts.push({name:$xapis[pool].xo.host[host].name_label, uuid:$xapis[pool].xo.host[host].uuid});
			}
		}

		if(!hostuuid) {
			hostuuid=allhosts[0].uuid;
		}

		var hostname="";

		for(var i=0; i<allhosts.length; i++) {
			if(allhosts[i].uuid==hostuuid) {
				hostname=allhosts[i].name;
			}
		}

		var hostfilter=new RegExp(hostuuid);

		var mycontent = $(ich.m_host_overview_tmpl({hostname:hostname, hostuuid:hostuuid, hosts:allhosts}));
		$('#graphmainspan').empty().append(mycontent);

		$('.hostdropdown a').click(function(evt) {
			monitor.monHostOverview($(evt.target).data('hostuuid'));
		});

		this.graphs=[];
		var me=this;
		this.addGraph({
			jq: $('#graphmainspan .graph')[0],
			getdata: (function() me.getData(function(r) {
				return (hostfilter.test(r) && /host.*cpu_avg/.test(r));}))});
		this.addGraph({
			jq: $('#graphmainspan .graph')[1],
			getdata: (function() me.getData(function(r) {
				return (hostfilter.test(r) && /host.*:memory/.test(r));}))});
		this.addGraph({
			jq: $('#graphmainspan .graph')[2],
			getdata: (function() me.getData(function(r) {
				return (hostfilter.test(r) && /host.*pif_aggr.*x/.test(r));}))});
		this.addGraph({
			jq: $('#graphmainspan .graph')[3],
			getdata: (function() me.getData(function(r) {
				return (hostfilter.test(r) && /host.*xapi/.test(r));}))});

	},

	monHostCPU : function() {
		
	},

	monHostNet : function() {

	},

	monHostStorage : function() { 

	},

	monHostOther : function() {

	},
	
	changeView : function(ty) {
		$('#graphmainspan').empty();
		switch(ty) {
		case 'monitor_host_overview':
			this.monHostOverview();
			break;
		case 'monitor_host_cpu':
			this.monHostCPU();
			break;
		case 'monitor_host_network':
			this.monHostNet();
			break;
		case 'monitor_host_storage':
			this.monHostStorage();
			break;
		case 'monitor_host_other':
			this.monHostOther();
			break;
		default:
			alert("unknown");
			break;
		}
	},

	clickEvt : function(evt) {
		var ty=$(evt.currentTarget).attr('id');
		this.changeView(ty);
	},

	getData : function(testfn) {
		var datasets = [];
		for(pool in $xapis) {
			var xapi=$xapis[pool];
			
			var host;
			
			for(var h in xapi.xo.host) {
				host=h;
				var ring="";
				var stats=xapi.hoststats[host].rings
				
				for(var r in stats) {
					if(testfn(r)) {
						ring=r;
						
						var d1=[];
						
						for(var i=0; i<100; i++) {
							d1.push([stats['t'].peek(i)*1000, stats[ring].peek(i)]);
						}
						
						datasets.push( {label:this.getGoodName(ring), data:d1} );
					}			
				}
			}
		}
		
		return datasets;
	},

	update : function() {
		for(i=0; i<monitor.graphs.length; i++) {
			g=monitor.graphs[i];
			g.plot.setData(g.getdata());

			g.plot.setupGrid();
			g.plot.draw();
		}
		setTimeout(monitor.update, 5000);
	},

	show : function(content) {
		var mycontent = $(ich.monitor_content({}));
		content.empty().append(mycontent);
		var me=this;
		$('#monitor_views a').click(function(evt) {me.clickEvt(evt);});
		me.changeView('monitor_host_overview');

		this.update();
	},

	hide : function() {

	}
}

var monitor;

(function() {
	monitor=new Monitor();
	$(document).ready(function(){register(monitor)});
})();

