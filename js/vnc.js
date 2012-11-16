var rfb;

function vnc(xapi,con,content) {

	if(xapi.xo.console[con].protocol!="rfb") {
		console.log("Can't connect to non-rfb console!");
		return;
	}

	var getLocation = function(href) {
		var l = document.createElement("a");
		l.href = href;
		return l;
	};

        function passwordRequired(rfb) {
            var msg;
            msg = '<form onsubmit="return setPassword();"';
            msg += '  style="margin-bottom: 0px">';
            msg += 'Password Required: ';
            msg += '<input type=password size=10 id="password_input" class="noVNC_status">';
            msg += '<\/form>';
            $D('noVNC_status_bar').setAttribute("class", "noVNC_status_warn");
            $D('noVNC_status').innerHTML = msg;
        }
        function setPassword() {
            rfb.sendPassword($D('password_input').value);
            return false;
        }
        function sendCtrlAltDel() {
            rfb.sendCtrlAltDel();
            return false;
        }
        function updateState(rfb, state, oldstate, msg) {
            var s, sb, cad, level;
            s = $D('noVNC_status');
            sb = $D('noVNC_status_bar');
            cad = $D('sendCtrlAltDelButton');
            switch (state) {
                case 'failed':       level = "error";  break;
                case 'fatal':        level = "error";  break;
                case 'normal':       level = "normal"; break;
                case 'disconnected': level = "normal"; break;
                case 'loaded':       level = "normal"; break;
                default:             level = "warn";   break;
            }

            if (state === "normal") { cad.disabled = false; }
            else                    { cad.disabled = true; }

            if (typeof(msg) !== 'undefined') {
                sb.setAttribute("class", "noVNC_status_" + level);
                s.innerHTML = msg;
            }
        }


	if(con) {
		var location = getLocation(xapi.xo.console[con].location);
		var hostname = location.hostname;
		var path = location.pathname + location.search + "&session_id=" + xapi.session;
		var port = 80;
/*		if (location.protocol == "https:")
			port = 443;*/

		var template=ich.vnc({});
		
		content.empty().append($(template))

		if(rfb) 
			try {rfb.disconnect()} catch(err) {};

		rfb = new RFB({'target':       $D('noVNC_canvas'),
                       'encrypt':      (port==443),
                       'true_color':   WebUtil.getQueryVar('true_color', true),
                       'local_cursor': WebUtil.getQueryVar('cursor', true),
                       'shared':       WebUtil.getQueryVar('shared', true),
                       'view_only':    WebUtil.getQueryVar('view_only', false),
                       'updateState':  updateState,
                       'onPasswordRequired':  passwordRequired});
        rfb.connect(hostname, port, "", path);
	}
			
}

