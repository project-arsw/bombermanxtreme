//var APIuseful = apimockJugar;
var APIuseful = apiclientCanvas;

var appCanvas = (function () {

	var stompClient = null;
	var idJugador = appCookie.getIdJugador(false);
	var idSala = appCookie.getSala();
	var canvas;
	var anchoCasilla = 50;
	var ctx;
	var tablero;
	var _manes;
	var terminado=false;
	var _id_man;
	var _apodo;
	var keyPress = null;
	var clear;

	/**
	 * función que realiza la conexión STOMP
	 */
	var connectAndSubscribe = function () {
		console.info("Connecting to WS...");
		var socket = new SockJS("/stompendpoint");
		stompClient = Stomp.over(socket);

		//subscribe to /topic/TOPICXX when connections succeed
		stompClient.connect({}, function (frame) {
			//console.log("Conectado: " + frame);

			//especificamos que estamos atentos a poner bombas de jugadores
			stompClient.subscribe("/topic/AccionBomba." + idSala, function (eventbody) {
				callback_accionBomba(eventbody.body);
			});

			//especificamos que estamos atentos a las estadisticas
			stompClient.subscribe("/topic/Estadisticas." + idSala, function (eventbody) {
				callback_estadisticas(eventbody);
			});

			//Estamos atentos si se daña alguna caja
			stompClient.subscribe("/topic/DaniarCaja." + idSala, function (eventbody) {
				callback_DaniarCaja(eventbody);
			});

			//Estamos atentos si se daña alguna caja
			stompClient.subscribe("/topic/actualizar." + idSala, function (eventbody) {
				callback_actualizar(eventbody);
			});

			//Estamos atentos si se daña alguna caja
			stompClient.subscribe("/topic/terminado." + idSala, function (eventbody) {
				callback_terminado(eventbody);
			});

			//Estamos atentos si se daña alguna caja
			stompClient.subscribe("/topic/ManQuemado." + idSala, function (eventbody) {
				callback_Quemado(eventbody);
			});

		});
	};

	function isNumber(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}

	// Funciones 

	/**
	 * Modificar posiciones despues de Movimiento de Jugador
	 * @param {type} data
	 * @returns {undefined}
	 */
	var callback_actualizar = function (data) {
		var tempotab = JSON.parse(data.body);
		//console.log(data);
		var y, x, k;
		for (i = 0; i < tempotab.length; i++) {
			y = tempotab[i].y;
			x = tempotab[i].x;
			k = tempotab[i].key;
			setElemento(y,x,k);
			//console.log("----- Tablero antes de Modificar: " + tablero);
			//console.log("+++++ Esto es lo que voy a modificar: Y:" + y + ", X:" + x + ", K:" + k);
		}
		clear = true;
		actualizar();
	};

	var callback_terminado = function (data) {
		terminado=true;
		alert("juego terminado, felicidades al ganador");
		location.href="jugar.html";
	};

	var callback_estadisticas=function(esta_){
		var esta=eval("("+esta_.body+")");
		var vida;
		var bombas;
		var apodo;
		var energia;
		var equipo=esta.esEquipo;
		var velocidad;
		var j=Array();
		for (let i = 0; i < esta.manes.length; i++) {
			var man=esta.manes[i];
                        console.log(_id_man);
			if(man.apodo_jugador===_apodo){
				vida= man.vida;
				apodo= man.apodo_jugador;
				bombas= man.bombas;
				energia= man.energia;
				velocidad= man.velocidad;
			}
			j[i]={
				 id_man:man.i,
				 vida:man.vida,
				 apodo:man.apodo_jugador,
				 img:man.img,
				 equipoB:man.equipoB
			};
		}
		var html="<table><tr><td>"+estaManes(j,equipo,false)+"</td><td><div class='apodo'>"+apodo+"</div><br>Vida:"+vida+"<br>Bombas:"+bombas+"<br>Energia:"+energia+"<br>Velocidad:"+velocidad+"<br></td><td>"+estaManes(j,equipo,true)+"</td></tr></table>";
                console.log(html);
		$("#estadisticas").html(html);
	}

	var estaManes=function(j,esEquipo,equipoB){
		var s="";
		var orden=Array();
		console.log(esEquipo);
		console.log(equipoB);
		for (let i = 0; i < j.length; i++){console.log("j.equipoB");console.log(j[i].equipoB); if(esEquipo && j[i].equipoB===equipoB || !esEquipo && equipoB==false){
			console.log(_manes[i]);
			s+="<tr><td><img src='"+j[i].img+"'></td><td>"+j[i].apodo+"</td><td>"+j[i].vida+"</td></tr>";
		}}
		return "<table>"+s+"</table>";
	};

	var callback_DaniarCaja = function (message) {
		var cajaADaniar = eval("(" + message.body + ")");
		setElemento(cajaADaniar.queda.y,cajaADaniar.queda.x,"c." + cajaADaniar.queda.key);
		actualizar();
	};

	var setElemento=function(y,x,key){
		if(tablero[y][x]!="X")
			tablero[y][x]=key;
	}

	var callback_Quemado = function (data) {
		var dataMan = eval("(" + data.body + ")");
		var vida = dataMan.vida;
		clear = true;
		setElemento(dataMan.y,dataMan.x,"Q");
		actualizar();
		if (vida > 0) {
			setTimeout(function () {
				setElemento(dataMan.y,dataMan.x,dataMan.key);
				actualizar();
			}, dataMan.tiempo);
		}
		actualizar();
	};

	function getCookie(name) {
		var value = "; " + document.cookie;
		var parts = value.split("; " + name + "=");
		if (parts.length === 2)
			return parts.pop().split(";").shift();
	};

	/**
	 * Obtener JTablero de Juego teniendo en cuenta el IdSala
	 * @returns {undefined}
	 */
	var getJuego = function () {
		APIuseful.getJuego(idSala, function (data) {
			var nameCookie = getCookie("nombreuser");
			if (data === "" || data === null) {
				location.href = "jugar.html";
				return false;
			}
			var datosJuego = eval("(" + data + ")");

			tablero = Array();

			//llenamos todo de vacíos
			for (var i = 0; i < datosJuego.alto; i++) {
				tablero[i] = Array();
				for (var k = 0; k < datosJuego.ancho; k++) {
					tablero[i][k] = "O";
				}
			}

			//cargamos las cajas
			for (var i = 0; i < datosJuego.cajas.length; i++) {
				var x = datosJuego.cajas[i].x;
				var y = datosJuego.cajas[i].y;
				tablero[y][x] = "C";
			}

			//cargamos las cajasfijas
			for (var i = 0; i < datosJuego.cajasFijas.length; i++) {
				var x = datosJuego.cajasFijas[i].x;
				var y = datosJuego.cajasFijas[i].y;
				tablero[y][x] = "X";
			}

			_manes = datosJuego.manes;
			//cargamos los manes
			for (var i = 0; i < datosJuego.manes.length; i++) {
				var x = datosJuego.manes[i].x;
				var y = datosJuego.manes[i].y;

				var color = datosJuego.manes[i].color;
				var apodo = datosJuego.manes[i].apodo_jugador;
				tablero[y][x] = datosJuego.manes[i].key;

				//Verificar KSSP
				////console.log("/// Este es el nombre de la sesion = " + appCookie.getNombre());
				if (nameCookie === apodo) {
					_id_man = parseInt(getCookie("iduser"));
                                        _apodo=getCookie("nombreuser");
				}
			}
			//actualizamos el canvas
			actualizar();
		});
	};

	/**
	 * Carga los controles basicos para el funcionamiento del juego
	 * @returns {undefined}
	 */
	var loadBasicControls = function () {
		//console.info('Cargando script!');
		canvas = document.getElementById('lienzo');
		ctx = canvas.getContext('2d');

		window.addEventListener('keydown', function (e) {
			key = e.keyCode;
			if (key === 32)
				colocarBomba();
			else
				moverPersonaje(key);
			//console.log(key);
		});
		window.addEventListener('keyup', function (e) {
			key = false;
		});
	};

	/**
	 * Funcion para mover personaje
	 * @param {type} key
	 * @returns {undefined}
	 */
	function moverPersonaje(key) {
		if (36 < key && key < 41) {
			////console.log("/// Me estoy moviendo :D");
			keyPress = key;
			stompClient.send("/app/mover." + idSala + "." + key, {}, idJugador);
		}

	}

	function getParameterByName(name, url) {
		if (!url)
			url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results)
			return null;
		if (!results[2])
			return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}

	/**
	 * Encargado de redibujar el canvas
	 */
	var actualizar = function () {
		if(terminado)return false;
		for (i = 0; i < tablero.length; i++) {
			for (j = 0; j < tablero[i].length; j++) {
				if (isNumber(tablero[i][j]) || tablero[i][j] == "Q") {
					var myPlayer = new Player(tablero[i][j], j * anchoCasilla, i * anchoCasilla, anchoCasilla, anchoCasilla, "image");
					myPlayer.update();
				} else {
					switch (tablero[i][j][0]) { // si tiene algo como-> A.B verifica-> A
						case "C": //caja
							var myObstacle = new Objeto("wood", j, i);
							myObstacle.update();
							break;
						case "X": //Pared
							var myObstacle = new Objeto("wall", j, i);
							myObstacle.update();
							break;
						case "c": //caja dañada
							anim_cajaDañada(j, i);
							break;
						case "O": //nada
							var myObstacle = new Objeto("grass", j, i);
							myObstacle.update();
							break;
						case "B": //Bomba
							var myObstacle = new Objeto("bomba", j, i);
							myObstacle.update();
							break;
						case "R": //PODER mas rapido
							var myObstacle = new Objeto("PTurbo", j, i);
							myObstacle.update();
							break;
						case "r": //PODER mas lento
							var myObstacle = new Objeto("PTortuga", j, i);
							myObstacle.update();
							break;
						case "T": //PODER mas radio
							var myObstacle = new Objeto("PRedbull", j, i);
							myObstacle.update();
							break;
						case "t": //PODER menos radio
							var myObstacle = new Objeto("PTinto", j, i);
							myObstacle.update();
							break;
						case "N": //PODER mas bomba
							var myObstacle = new Objeto("PAddBomba", j, i);
							myObstacle.update();
							break;
						case "n": //PODER menos boba
							var myObstacle = new Objeto("PLessBomba", j, i);
							myObstacle.update();
							break;
						case "S": //PODER super
							var myObstacle = new Objeto("PSuper", j, i);
							myObstacle.update();
							break;
						case "b": //fuego
							var myObstacle = new Objeto("fuego", j, i);
							myObstacle.update();
							break;
						default:
							// Para el caso que no se tenga un caracter claro en el tablero
							var myObstacle = new Objeto("grass", j, i);
							myObstacle.update();
							break;
					}
				}
			}
		}
		//console.log("LLENANDO CANVAS");
	};

	/**
	 * método encargado de animar una caja dañandose 
	 * @param {*} j 
	 * @param {*} i 
	 */
	var anim_cajaDañada = function (j, i) {
		var myObstacle = new Caja("#222222", j, i);
		myObstacle.update();
		setElemento(i,j,tablero[i][j][2]); // si tiene A.B queda con B
		setTimeout(function () {
			actualizar();
		}, 100);
	};


	var callback_fuego = function (coords) {
		for (var i = 0; i < coords.length; i++) {
			setElemento(coords[i].y,coords[i].x,"O");
		}
		actualizar();
		return false;
	}

	var callback_accionBomba = function (data) {
		var J = eval("(" + data + ")");
		//bomba
		var bomba = J.bomba;
		//fuego
		var coords = null;

		if (bomba.estallo === true) {
			coords = J.coords;
			for (var i = 0; i < coords.length; i++) {
				setElemento(coords[i].y,coords[i].x,"b");
			}
			actualizar();
			setTimeout(function () {
				callback_fuego(coords);
			}, 100);
		} else {
			setElemento(bomba.y,bomba.x,"B");
			clear = false;
			actualizar();
		}
	};

	// Objeto Caja
	function Caja(color, x, y) {

		this.update = function () {
			x *= anchoCasilla;
			y *= anchoCasilla;
			ctx.fillStyle = color;
			ctx.fillRect(x, y, anchoCasilla, anchoCasilla);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(anchoCasilla + x, y);
			ctx.lineTo(anchoCasilla + x, anchoCasilla + y);
			ctx.lineTo(x, anchoCasilla + y);
			ctx.lineTo(x, y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(anchoCasilla + x, anchoCasilla + y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(anchoCasilla + x, y);
			ctx.lineTo(x, anchoCasilla + y);
			ctx.stroke();
		};
	}

	// Objeto relacionado a los Elementos del Tablero
	function Objeto(color, x, y) {
		this.ancho = anchoCasilla;
		this.alto = anchoCasilla;
		this.x = x * anchoCasilla;
		this.y = y * anchoCasilla;

		this.update = function () {
			var img = document.getElementById(color);
			if (clear) {
				ctx.clearRect(this.x, this.y, this.ancho, this.alto);
			}

			ctx.drawImage(img,
				this.x,
				this.y,
				this.ancho, this.alto);
		};
	}

	// Objeto Jugador
	function Player(color, x, y, ancho, alto, type) {
		this.type = type;
		this.ancho = ancho;
		this.alto = alto;
		this.x = x;
		this.y = y;

		this.update = function () {
			if (this.type === "image") {
				var img;
				var sx, sy, swidth, sheight;

				sx = 0;
				sy = 0;
				swidth = 50;
				sheight = 50;

				switch (color) {
					case "0": //Jugador0
						img = document.getElementById("sergio");
						break;
					case "1": //Jugador1
						img = document.getElementById("alfredo");
						break;
					case "2": //Jugador2
						img = document.getElementById("pirata");
						break;
					case "3": //Jugador3
						img = document.getElementById("sergio");
						break;
					case "Q": //Jugador_Quemado
						img = document.getElementById("calavera");
						swidth = 50;
						sheight = 50;
						break;
					default:
						img = document.getElementById("betty2");
						break;
				}
				if (clear) {
					ctx.clearRect(this.x, this.y, this.ancho, this.alto);
				}
				ctx.drawImage(img,
					sx,
					sy,
					swidth,
					sheight,
					this.x,
					this.y,
					this.ancho, this.alto);
			} else {
				////console.log(ctx);
				ctx.fillStyle = color;
				ctx.fillRect(this.x, this.y, this.ancho, this.alto);
			}
		};
	}

	/**
	 * coloca una bomba luego de presionar espacio
	 */
	var colocarBomba = function () {
		stompClient.send("/app/AccionBomba." + idSala, {}, idJugador);
	};

	return {
		/**
		 * encargado de realizar la conexión con STOMP
		 */
		init() {
			////console.log("***** Iniciando Script!!");
			idJugador = appCookie.getIdJugador(false);
			//console.log("Jugador: " + idJugador);
			// Cargamos elementos clave para dibujar en Tablero
			loadBasicControls();
			// Traer Numero de sala
			idSala = appCookie.getSala();
			//console.log("Este es el numero de Sala en el JS: " + idSala);
			//pedir estado inicial del juego
			getJuego();
			//INICIAMOS CONEXIÓN
			connectAndSubscribe();
		},
		/**
		 * desconecta del STOMP
		 */
		disconnect() {
			if (stompClient !== null) {
				stompClient.disconnect();
			}
			//setConnected(false);
			//console.log("Desconectado");
		}
	};

})();