var appCookie=(function(){

	/**
	 * establece el id del jugador en la cookie
	 * @param {*} id 
	 */
	var _setIdJugador=function(id) {
		document.cookie="iduser="+id;
	};
	
    return {
		/**
		 * establece la cookie en -1 y redirije
		 */
		cerrarSesion() {
			_setIdJugador(-1);
			location.href="login.html";
		},
		setIdJugador:_setIdJugador,
		/**
		 * retorna el id del jugador si no ha iniciado sesión retorna -1
		 * si fueraDeJuego=true y está iniciada la sesión lo envía a jugar.html
		 * si fueraDeJuego=false y NO está iniciada la sesión lo envía a login.html
		 * @param {*} fueraDeJuego 
		 */
        getIdJugador(fueraDeJuego){
			var idJugador=-1;
			document.cookie.split("; ").map(function(e) {
				var _cookie=e.split("=");
				if(_cookie[0]=="iduser")
					idJugador=_cookie[1];
			});
	
			if (!fueraDeJuego && idJugador<0) {
				setTimeout(function(params) {//demoramos un poco
					MJ_simplex("Jugar","Inicia sesión por favor, te vamos a redirigir en 3 segundos...<br>",true);
				},100);
				setTimeout(function(){
					location.href="login.html";
				},3000);
			}
	
			if(fueraDeJuego && idJugador>=0)
				location.href="jugar.html";
			return idJugador;
		}
	}
})();