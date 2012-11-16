
function blobtest(xapi) {
	var vm="";

	for(myvm in xapi.xo.vm)
		vm=myvm;

	var next=function(result) {
		foo=xapi.check(result);
		var url = xapi.master_address+'/blob' + "?session_id="+xapi.session+"&ref="+foo;
		console.log("url="+url);
		$.ajax({
			type: 'PUT',
			contentType: 'application/json',
			url: url,
			dataType: "json",
			data: "testing testing 123",
			success: function(data, textStatus, jqXHR){
				alert('Wine updated successfully');
			},
			error: function(jqXHR, textStatus, errorThrown){
				alert('updateWine error: ' + textStatus);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});
	}
	xapi.xapi.VM.create_new_blob(next,xapi.session,vm,"testblob","text");
	
}