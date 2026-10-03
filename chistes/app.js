(function () {
  var chistes = window.CHISTES.map(function (c, i) {
    return { id: i, cat: c[0], q: c[1], a: c[2] };
  });
  var cats = window.CATEGORIAS;
  var $ = function (id) { return document.getElementById(id); };

  // Risas guardadas solo en este navegador.
  var risas = {};
  try { risas = JSON.parse(localStorage.getItem("risas") || "{}"); } catch (e) {}
  function guardar() { try { localStorage.setItem("risas", JSON.stringify(risas)); } catch (e) {} }

  // Baraja para no repetir hasta haberlos visto todos.
  var mazo = [], actual = null;
  function barajar() {
    mazo = chistes.map(function (c) { return c.id; });
    for (var i = mazo.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = mazo[i]; mazo[i] = mazo[j]; mazo[j] = t;
    }
    if (actual && mazo[mazo.length - 1] === actual.id) mazo.unshift(mazo.pop());
  }

  function mostrar(c) {
    actual = c;
    $("etiqueta").textContent = cats[c.cat];
    $("planteamiento").textContent = c.q;
    $("remate").textContent = c.a;
    $("remate").hidden = true;
    $("revelar").hidden = false;
    pintarRisa();
    $("contador").textContent = "Chiste " + (c.id + 1) + " de " + chistes.length;
    history.replaceState(null, "", "#" + (c.id + 1));
  }

  function pintarRisa() {
    var si = !!risas[actual.id];
    $("risa").setAttribute("aria-pressed", si ? "true" : "false");
    $("risas").textContent = si ? "¡Me ha hecho gracia!" : "Me ha hecho gracia";
  }

  function siguiente() {
    if (!mazo.length) barajar();
    mostrar(chistes[mazo.pop()]);
  }

  $("revelar").onclick = function () {
    $("remate").hidden = false;
    $("revelar").hidden = true;
    $("siguiente").focus();
  };
  $("siguiente").onclick = siguiente;
  $("risa").onclick = function () {
    if (risas[actual.id]) delete risas[actual.id]; else risas[actual.id] = 1;
    guardar();
    pintarRisa();
  };
  $("compartir").onclick = function () {
    var texto = actual.q + "\n" + actual.a + "\n" + location.href;
    if (navigator.share) {
      navigator.share({ text: texto }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(function () {
        $("compartir").textContent = "¡Copiado!";
        setTimeout(function () { $("compartir").textContent = "Compartir"; }, 1500);
      });
    }
  };

  // Colección completa con filtros y búsqueda.
  var filtro = "todos";
  function boton(clave, texto) {
    var b = document.createElement("button");
    b.textContent = texto;
    b.setAttribute("aria-pressed", clave === filtro ? "true" : "false");
    b.onclick = function () {
      filtro = clave;
      Array.prototype.forEach.call($("filtros").children, function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      pintar();
    };
    $("filtros").appendChild(b);
  }
  boton("todos", "Todos (" + chistes.length + ")");
  Object.keys(cats).forEach(function (k) { boton(k, cats[k]); });

  function normal(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function pintar() {
    var q = normal($("buscar").value.trim());
    var lista = $("lista");
    lista.textContent = "";
    var n = 0;
    chistes.forEach(function (c) {
      if (filtro !== "todos" && c.cat !== filtro) return;
      if (q && normal(c.q + " " + c.a).indexOf(q) < 0) return;
      var li = document.createElement("li");
      var d = document.createElement("details");
      var s = document.createElement("summary");
      var t = document.createElement("span");
      t.className = "tipo"; t.textContent = cats[c.cat];
      s.appendChild(t);
      s.appendChild(document.createTextNode(c.q));
      var p = document.createElement("p");
      p.textContent = c.a;
      d.appendChild(s); d.appendChild(p); li.appendChild(d);
      lista.appendChild(li);
      n++;
    });
    $("vacio").hidden = n > 0;
  }
  $("buscar").oninput = pintar;
  pintar();

  // Arranca con el chiste del enlace (#12) o con uno al azar.
  var inicial = parseInt(location.hash.slice(1), 10);
  barajar();
  if (inicial >= 1 && inicial <= chistes.length) {
    mostrar(chistes[inicial - 1]);
    mazo = mazo.filter(function (id) { return id !== inicial - 1; });
  } else {
    siguiente();
  }
})();
