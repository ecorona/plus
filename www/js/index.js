/*
 * Listo!
 */

var plusServer="http://mymasterpoints.com/system/";
var getScript="index.php/tienda/getMobil";
var gcmScript="index.php/tienda/saveRegGCM";
var optionScript="index.php/tienda/mobileSaveOpt";
var miUbicacion={lat:0,lng:0}, mapa, watchID, estado=0,retornoObj, 
	bounds, myWindow, thePush, panelOpen=false, dorefresh=false, empresas,
	mapaIniciado=false, markersArray=[],mapaCargado=false,idioma,devicePlatform,pushNotification,listoesto;
	
// Depending on the device, a few examples are: devicePlatform=
//   - "Android"
//   - "BlackBerry"
//   - "iOS"
//   - "webOS"
//   - "WinCE"
//   - "Tizen"

var app = {
	debug:false,
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener("menubutton", this.onMenuKeyDown, false);
		document.addEventListener("backbutton", this.doBack, false);
    },
    
    onDeviceReady: function() {
    	app.log('onDeviceReady');
        pushNotification = window.plugins.pushNotification;
    	retornoObj=null;
        $.mobile.defaultPageTransition = 'none';
        
        app.checkConnection();
        
		app.fastclick();
		
        app.getPlatform();
		app.getLanguage();
		
		app.autoLogin();
    },
    //obtener la plataforma a global
    getPlatform:function(){
    	devicePlatform = device.platform;
    	app.log("init: plataforma: "+devicePlatform);
    	if(devicePlatform=='iOS'){
			$("#salirApp").remove();
		}
    },
    //obtener lenguaje a global
    getLanguage:function(){
    	navigator.globalization.getPreferredLanguage(
		    function (language) {
		    	idioma=language.value;
		    	app.log('init: idioma: ' + idioma  + '\n');
		    },
		    function () {
		    	app.log('init: Error getting language\n');
		    	idioma='es-MX';
		    }
		);
    },
    //activar fastclick
    fastclick:function(){
    	try{
	        FastClick.attach(document.body);
	        app.log('init: fastclick: done');
        }catch(err){
        	app.log('init:'+err.message);
        }
    },
    //inicio de autologin
    autoLogin:function(){
    	var tarjeta = window.localStorage.getItem("masterpoints_userTarjeta");
		var email = window.localStorage.getItem("masterpoints_userEmail");
		var fnac = window.localStorage.getItem("masterpoints_userFnac");
		if(tarjeta!=null) $("#tarjeta").val(tarjeta);
		if(email!=null) $("#email").val(email);
		if(fnac!=null) $("#fnac").val(fnac);
		if(tarjeta!=null && (email!=null||fnac!=null)) {
			app.log('init: autologin');
			doLogin('pageWelcome',dorefresh);
		}
    },
    doBack:function (e){
		e.preventDefault();
		return false;
	},
	onMenuKeyDown:function (e){
		e.preventDefault();
		return false;
	},
    //salir
    salir:function(){
    	app.log('salir');
		try{
	    	if(navigator.app){
	    		app.log('bye');
				navigator.app.exitApp();
			}else if(navigator.device){
				app.log('bye');
				navigator.device.exitApp();
			}
		}catch(err){
			alert(err.message);
		}
    },
    alerta:function (message){
		navigator.notification.alert(message, this.alertCallback, 'My Master Points', 'Ok');
	},
	alertCallback:function (){
		
	},
	checkConnection: function () {
		app.log('init: checando estado de conexion...');
	    try {
		    var networkState = navigator.network.connection.type;
		    var states = {};
		    states[Connection.UNKNOWN]  = 'Desconocida';
		    states[Connection.ETHERNET] = 'Ethernet';
		    states[Connection.WIFI]     = 'WiFi';
		    states[Connection.CELL_2G]  = '2G';
		    states[Connection.CELL_3G]  = '3G';
		    states[Connection.CELL_4G]  = '4G';
		    states[Connection.NONE]     = 'Sin Red';
		    
		    app.log('init: coneccion: '+states[networkState]);
		    if(networkState==Connection.NONE){
		    	app.alerta('Necesita una conexión a internet para funcionar.');
		    	app.salir();
		    }
		}catch(err) {
		    app.alerta(err.message);
		}
	},
	log:function(msg){
		if(this.debug) console.log(msg);
	}
};


/*********************************************PANNELS********************************************/

$(document).on("pagecreate","#pageLogin",function(){
	//ocultar botones de email y fecha de nacimiento
	$("#entraemail").addClass('ui-screen-hidden');
	$("#entrafnac").addClass('ui-screen-hidden');
	
	$("#salirApp").on('click',function(){
		app.salir();
	});
	
	$("#escanearCodigo").on('click',function(){
		escanear();
	});
	
	$("#iniciarconEmail").on('click',function(){
		$("#entraemail").removeClass('ui-screen-hidden');
		$("#botonesEntrar").addClass('ui-screen-hidden');
		$("a#accesoCliente").removeClass('ui-screen-hidden');
		if($("#email").val()=='') $("#email").focus();
		$("#fnac").val('');
	});
	
	$("#iniciarconFecha").on('click',function(){
		$("#entrafnac").removeClass('ui-screen-hidden');
		$("#botonesEntrar").addClass('ui-screen-hidden');
		$("a#accesoCliente").removeClass('ui-screen-hidden');
		if($("#fnac").val()=='') $("#fnac").focus();
		$("#email").val('');
	});
	
    $("#accesoCliente").on("click",function(){
    	doLogin('pageWelcome',dorefresh);
    });
});

function doLogin(cambiar,isrefresh){
	app.log('iniciando login');
	var email=$("#email").val();
	var tarjeta=$("#tarjeta").val();
	var fnac=$("#fnac").val();
	
	if(tarjeta.length==0) return;
	if(email.length==0 && fnac.length==0) return;
    var datos={
        email:$("#email").val(),
        tarjeta:$("#tarjeta").val(),
        fnac:$("#fnac").val()
    };
	
    //reset
    $(".promos").addClass('oculto');
    $("#noPromos").removeClass('oculto');
    $("#divBonificaciones").addClass('oculto');
    $("#divGastos").addClass('oculto');
    $("#bonificaciones").empty();
    $("#gastos").empty();
    
    app.log('lanzando ajax');
    showSpinner();
    $.ajax({
    	type:"POST",
    	url:plusServer+getScript,
    	data:datos,
    	success:function(retorno){
    		dorefresh=true;
            window.plugins.spinnerDialog.hide();
            app.log('login retorno:');
            app.log(retorno);
            if(retorno.resultado=="OK"){//almacenamos la tarjeta
            	retornoObj=retorno;
            	
            	window.localStorage.setItem("masterpoints_userTarjeta",datos.tarjeta);
            	window.localStorage.setItem("masterpoints_userEmail",datos.email);
            	window.localStorage.setItem("masterpoints_userFnac",datos.fnac);
            	
	            registroPush();
	            
            	$("#nombreCliente").html(retorno.nombreCliente);
            	$("#nombreTienda").html(retorno.nombreTienda);
            	$("#puntosCliente").html(retorno.puntosCliente);
            	$("#entraemail").addClass('ui-screen-hidden');
				$("#entrafnac").addClass('ui-screen-hidden');
				$("#botonesEntrar").removeClass('ui-screen-hidden');
            	$("#botonAccesar").addClass('ui-screen-hidden');
            	if(retorno.logoTienda.length>0){
            		$("#logoTienda").attr('src',retorno.logoTienda);
            	}
            	//reset
            	$("#noPromos").removeClass('oculto');
            	$("#contenedorPromos").empty();
            	
            	
        		$.each(retorno.promociones,function(i,p){
        			app.log('promocion:');
        			app.log(p);
        			$("#noPromos").addClass('oculto');
        			var promoX=''+
        			'<h3 id="txtPromo_'+p.id+'" class="txtPromos">'+p.texto+'</h3>'+
            		'<img src="'+p.imagen+'" width="100%" id="imgPromo_'+p.id+'" class="promos">'+
        			'';
        			$("#contenedorPromos").append(promoX);
				});
				
				$("#divBonificaciones").addClass('oculto');
				$("#bonificaciones").empty();
				$.each(retorno.bonificaciones,function(i,bon){
        			$("#divBonificaciones").removeClass('oculto');
					$("#bonificaciones").append(
						'<li class="listaitem ui-li-static ui-body-inherit ui-first-child"><h2>'+bon.descripcion+'</h2>'+
					 	'<p><strong>'+bon.fecha+'</strong> - Referencia: '+bon.referencia+'</p>'+
					 	'<p class="ul-li-aside"><strong>'+bon.puntos+'</strong> Puntos</p></li>'
					 	);
				});
				
				$("#divGastos").addClass('oculto');
				$("#gastos").empty();
				$.each(retorno.gastos,function(i,gas){
        			$("#divGastos").removeClass('oculto');
					$("#gastos").append(
						'<li class="listaitem ui-li-static ui-body-inherit ui-first-child"><h2>'+gas.descripcion+'</h2>'+
					 	'<p><strong>'+gas.fecha+'</strong> - Referencia: '+gas.referencia+'</p>'+
					 	'<p class="ul-li-aside"><strong>'+gas.cantidad+'</strong> Puntos</p></li>'
					);
				});
				
				//opciones...
				//notificaciones de promos 0=no, 1=si
				var myswitchp = $( "#slider-flip-p" );
				myswitchp[ 0 ].selectedIndex = parseInt(retorno.opciones.p);
				
				//notificaciones de bonificaciones 0=no, 1=si
				var myswitchb = $( "#slider-flip-b" );
				myswitchb[ 0 ].selectedIndex = parseInt(retorno.opciones.b);
				
				//notificaciones de canjes 0=no, 1=si
				var myswitchc = $( "#slider-flip-c" );
				myswitchc[ 0 ].selectedIndex = parseInt(retorno.opciones.c);
				
				var myswitche = $( "#slider-flip-e" );
				myswitche[ 0 ].selectedIndex = parseInt(retorno.opciones.e);
				
				app.log('switches cambiados...');
				
				app.log('isrefresh:'+isrefresh);
				try{
					if(isrefresh) {
						app.log('refrescando switches');
						myswitchp.slider( "refresh" );
						myswitchb.slider( "refresh" );
						myswitchc.slider( "refresh" );
						myswitche.slider( "refresh" );
					}else{
						app.log('no se refrescaron los switches');
					}
				} catch(e){
					app.log('error al refrescar switches de opciones:'+e.message);
				}

				if(mapaCargado) doAgregarUbicacionesMapa();
				
            	$.mobile.changePage($("#"+cambiar),{transition :'none'});
            }else{
            	app.alerta(retorno.mensaje);
            }
    	},
    	error:function( jqXHR, textStatus, errorThrown){
    		app.alerta(errorThrown);
    	},
    	dataType:'json'
    });
}

function escanear(){
	app.log('escaneando');
	try {
		cordova.plugins.barcodeScanner.scan(
	      function (result) {
	      		if (result.format=="CODE_128"){
	      			$("#tarjeta").val(result.text);
	      		}
	      }, 
	      function (error) {
	          app.alerta("Error al escanear código: " + error);
	      }
	   );
    }catch(err) {
	    app.alerta(err.message);
	}
}

$(document).on("pagecreate","#opciones",function(){
	$( "#slider-flip-p" ).bind( "change", function(event, ui) {
		saveOption('notifica_promos',$(this).val());
	});
	$( "#slider-flip-b" ).bind( "change", function(event, ui) {
		saveOption('notifica_bonifica',$(this).val());
	});
	$( "#slider-flip-c" ).bind( "change", function(event, ui) {
		saveOption('notifica_canje',$(this).val());
	});
	$( "#slider-flip-e" ).bind( "change", function(event, ui) {
		saveOption('notifica_boletin',$(this).val());
	});
});

$(document).on("pagecreate","#mapaPage",function(){
	if(retornoObj.ubicacionesTienda.length==0){
		$("#mensajeMapa").removeClass('ui-screen-hidden');
		$("#mapa_div").addClass('ui-scree-hidden');
		return; //no hay ubicaciones....
	}
	$("#mapa_div").removeClass('ui-screen-hidden');
	$("#mensajeMapa").addClass('ui-screen-hidden');
	
	/*
	 * Cambiar el tamaño del mapa a todo lo que de la pantalla
	 */
	$("#mapa_div").css({height:getRealContentHeight()+'px'});
	
	/*
	 */
	//$.mobile.loading('show',{html:'<div id="divLoader"><img src="images/loader.png"><br>Cargando...</div>'});
	showSpinner();
	var u1=retornoObj.ubicacionesTienda[0];
    var myLatLng = new google.maps.LatLng(u1.lat, u1.lng);
    var myOptions = {
    	center:myLatLng,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI:true,
        draggable:true
    };
    //global
    mapa = new google.maps.Map(document.getElementById('mapa_div'), myOptions);
    bounds= new google.maps.LatLngBounds();
    
    mapaCargado=true;
    
    doAgregarUbicacionesMapa();
    
    google.maps.event.addListenerOnce(mapa, 'idle', function(){
    	//$.mobile.loading('hide');
    	window.plugins.spinnerDialog.hide();
	});
});

$( ".panel" ).on( "panelbeforeopen", function( event, ui ) {
	$("a.aopciones").removeClass('ui-btn-active');
});

$(document).on("pagecontainerchange", function( event, ui ) {
	var idPaginaActiva=$.mobile.activePage.attr('id');
	
	$("#botonOpciones").removeClass('ui-btn-active');
	$(".linksPaginas").removeClass('ui-btn-active');
	
	var linkActive = $('a[href="#'+idPaginaActiva+'"]');
	linkActive.addClass('ui-btn-active');
	
	if(idPaginaActiva=='pageLogin'){
		$("a#accesoCliente").addClass('ui-screen-hidden');
	}
	
});

function showSpinner(){
	window.plugins.spinnerDialog.show('My Master Points','',true);
}

function doAgregarUbicacionesMapa(){
	//quitar todas las ubicaciones en caso de que existan...
	quitarUbicaciones();
	/*
     * agregar ubicaciones...
     */
    var totalUbicaciones=retornoObj.ubicacionesTienda.length;
    var ubicacionActual=0;
    $.each(retornoObj.ubicacionesTienda,function(i,u){
    	var telefono='';
    	if(u.telefono){
    		telefono=' <span class="telefono"><a href="tel:'+u.telefono+'" class="botontelefono" target="_system">'+u.telefono+'</a> ';
    	}
    	var email='';
    	if(u.email){
    		email=' <br><span class="email"><a href="mailto:'+u.email+'" class="botonemail" target="_system">'+u.email+'</a>';
    	}
    	var website='';
    	if(u.website){
    		website=' <br><span class="website"><a href="'+u.website+'" class="botonwebsite" target="_system">'+u.website+'</a>';
    	}
    	var facebook='';
    	if(u.facebook){
    		facebook=' <br><span class="facebook"><a href="'+u.facebook+'" class="botonfacebook" target="_system">'+u.facebook+'</a>';
    	}
    	var contentString = ''+
    	  '<div class="iw-container"><div class="iw-title">'+
	      u.titulo+'</div>'+
	      u.html+'<hr>'+
	      telefono+
	      email+
	      website+
	      facebook+
	      '</div>';
	    var infowindowx = new google.maps.InfoWindow({
			content: contentString,
			maxWidth: 250
		});
		var newPos=new google.maps.LatLng(u.lat, u.lng);
		var markerx = new google.maps.Marker({
	        position: newPos, 
	        map: mapa,
	        title:u.titulo,
	        draggable:false,
	        animation:google.maps.Animation.DROP,
	        marker_id:u.id,
	        infow:infowindowx
	    });
	    
	    google.maps.event.addListener(markerx,'click', function(ev) {
	    	if(myWindow) myWindow.close();
		    infowindowx.open(mapa, this);
		    myWindow=infowindowx;
		});
		
		markersArray.push(markerx); //agregarlo a los markers existentes...
		
	    bounds.extend(markerx.getPosition());
	    
	    ubicacionActual++;
	    if(ubicacionActual==totalUbicaciones){ // al finalizar centrar mapa
	    	//app.log('Marcadores agregados:');
	    	//app.log(markersArray);
	    	
	    	if (totalUbicaciones == 1) {
	    		var CenlatLng = markersArray[0].getPosition(); // returns LatLng object
				mapa.setCenter(CenlatLng);
	    		mapa.setZoom(16);
			}else {
				mapa.fitBounds(bounds);
			}
	    }
    });
    
}

function quitarUbicaciones(){
	//app.log('quitando marcadores:');
	//app.log(markersArray);
	if(markersArray.length>0){
		for (var i = 0; i < markersArray.length; i++) {
			markersArray[i].setMap(null);
		}
		markersArray=[];
	}
}

function getRealContentHeight() {
    var header = $.mobile.activePage.find("div[data-role='header']:visible");
    var footer = $.mobile.activePage.find("div[data-role='footer']:visible");
    var content = $.mobile.activePage.find("div[data-role='content']:visible:visible");
    var viewport_height = $(window).height();
    var content_height = viewport_height - header.outerHeight() - footer.outerHeight();
    if((content.outerHeight() - header.outerHeight() - footer.outerHeight()) <= viewport_height) {
        content_height -= (content.outerHeight() - content.height());
    } 
    return content_height;
}

function saveOption(opcion,valor){
	var datos={
        email:$("#email").val(),
        tarjeta:$("#tarjeta").val(),
        fnac:$("#fnac").val(),
        opcion:opcion,
        valor:valor
    };
    showSpinner();
	$.ajax({
		type:"POST",
    	url:plusServer+optionScript,
    	data:datos,
    	success:function(retorno){
            $.mobile.loading('hide');
            window.plugins.spinnerDialog.hide();
    	},
    	error:function( jqXHR, textStatus, errorThrown){
    		app.alerta(errorThrown);
    	}
    });
}

function registroPush(){
	app.log('registrando push: '+devicePlatform);
	try{
		if ( devicePlatform == 'iOS' ){
			pushNotification.register(
			    function(token){
			    	app.log('token ios recibido:'+token);
    				saveReg(token);
			    },
			    function(error){
			    	app.alerta('error push ios:' + error);
			    },
			    {
			        "badge":"true",
			        "sound":"true",
			        "alert":"true",
			        "ecb":"onNotificationAPN"
			    });
		}else if ( devicePlatform == 'Android' || devicePlatform == 'android' ){
			pushNotification.register(
			    function(result){
			    	app.log('registro android recibido:');
					app.log(result);
			    },
			    function(error){
			    	app.alerta('error push android:' + error);
			    },
			    {
			        "senderID":"414157346284",
			        "ecb":"onNotification"
			    });
		}
	}catch(err){
		app.alerta(err.message);
	}
}

function saveReg(regid){
	app.log('guardando token en db:'+regid);
	var datos={
    	regid:regid,
        tarjeta:window.localStorage.getItem("masterpoints_userTarjeta"),
        os:devicePlatform
    };
    
    app.log('datos post:');
    app.log(datos);
    $.ajax({
    	type:"POST",
    	url:plusServer+gcmScript,
    	data:datos,
    	success:function(retorno){
    		app.log('token almacenado:');
    		app.log(retorno);
    	},
    	error:function( jqXHR, textStatus, errorThrown){
    		app.alerta('Hubo un error al guardar la suscripción.');
    	},
    	dataType:"json"
    });
}

function onNotification(e){
	app.log('Notificacion Android:');
	app.log(e);
	
	switch( e.event ){
	    case 'registered':
	        if ( e.regid.length > 0 ){
	            app.log("regID = " + e.regid);
	        	saveReg(e.regid);
	        }
	    	break;
	    case 'message':
		    if ( e.foreground ){
	            
	        }else{  // otherwise we were launched because the user touched a notification in the notification tray.
	        	
	        }
	        app.alerta(e.message);
	        if(e.payload.accion=='update') {
				if(e.payload.seccion=='promos') doLogin('promoPage',true);
				if(e.payload.seccion=='welcome') doLogin('pageWelcome',true);
			}
	    	break;
	    case 'error':
			app.alerta('Error de notificacion: '+ e.msg);
			break;
		default:
			app.log('notificacion desconocida.');
		break;
    }
	
	
}

function onNotificationAPN (event) {
	app.log('notificacioni recibida:');
	app.log(event);
    if ( event.alert ){
        app.alerta(event.alert);
    }
	if(event.accion=='update') {
		if(event.seccion=='promos') doLogin('promoPage',true);
		if(event.seccion=='welcome') doLogin('pageWelcome',true);
	}
}