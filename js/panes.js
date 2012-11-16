/* panes - manipulate the panes on xac */

var panes = {
}

var curpane;

function pane_switchto(newpane) {
	var pane=panes[newpane];
	if(curpane && curpane.hide) {
		curpane.hide();
	}
	pane.show($('#xac_content'));
	curpane=pane;
}

function loadTemplates(pane) {
	console.log("Loading templates: "+pane.templates);
	$.get(pane.templates, function(response) {
		console.log("got a response");
		console.log(response);
		$('script',response).each(function () {
			console.log("Got "+this.getAttribute("id"));
			ich.addTemplate(this.getAttribute("id"),$(this).text());
		});
	})
}

function register(pane) {
	panes[pane.paneName]=pane;
	var maybe_brand="";
	if(pane.brand) {
		maybe_brand=" class='brand'";
	}
	var newlink = $('<li><a'+maybe_brand+' href="#">'+pane.paneName+'</a></li>');
	$('a',newlink).click(function() {pane_switchto(pane.paneName)});
	$("#navbarul").append(newlink);
	loadTemplates(pane);
}