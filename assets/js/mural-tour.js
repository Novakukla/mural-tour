(function () {
  var STORAGE_KEY = "floridaramaMuralTourSeen";
  var CURRENT_KEY = "floridaramaMuralTourCurrent";
  var DEFAULT_START_ID = "stop-2";

  var tourStops = [
    { id: "stop-1",  title: "Ricky Watts Mural",               short: "Ricky Watts",      where: "Bldg 5 / Fairfield",   x: 62.17224299748253, y: 64.61562063870947 },
    { id: "stop-2",  title: "Cosmic Beams & Sunshine Dreams",  short: "Cosmic Beams",     where: "Bldg 5 Lobby",         x: 75.83890966414918, y: 60.393398416487244 },
    { id: "stop-3",  title: "Hearts Were Meant to Fly",        short: "Hearts",           where: "Bldg 6 Boardwalk",     x: 47.90177539161198, y: 39.471787972484044 },
    { id: "stop-4",  title: "Florida Wildlife Corridor",       short: "Wildlife",         where: "Bldg 7",               x: 31.727798553038078, y: 60.060065083153916 },
    { id: "stop-5",  title: "St. Pete: West to East",          short: "West to East",     where: "Bldg 5 Trail Side",    x: 75.9858664173329, y: 37.930961318984444 },
    { id: "stop-6",  title: "Museum of Motherhood Mural",      short: "Motherhood",       where: "Bldg 7 / Fairfield",   x: 39.61668744192697, y: 61.28228730537613 },
    { id: "stop-7",  title: "The Path of the Wild",            short: "Path of the Wild", where: "Bldg 2",               x: 94.84027777777779, y: 30.25332326616912 },
    { id: "stop-8",  title: "FloridaRAMA Entrance Mural",      short: "Entrance",         where: "Bldg 6 Entrance",      x: 57.39446521970475, y: 57.72673174982058 },
    { id: "stop-9",  title: "FloridaRAMA Exit Doodle Wall",    short: "Exit Wall",        where: "Bldg 6 Exit",          x: 54.9500207752603, y: 61.72673174982057 },
    { id: "stop-10", title: "Chad Mize — St. Pete Athletic", short: "St. Pete Athletic", where: "St. Pete Athletic", x: 97.72916666666667, y: 36.25332326616912 }
  ].map(function (stop, index) {
    stop.order = index + 1;
    return stop;
  });

  var topButton = document.getElementById("totop");
  var stopLinks = Array.prototype.slice.call(document.querySelectorAll(".index a[href^='#stop-']"));
  var stopSections = tourStops
    .map(function (stop) {
      return document.getElementById(stop.id);
    })
    .filter(Boolean);
  var mapEl = document.getElementById("tour-map");
  var progressEl = document.getElementById("tour-progress-count");
  var selectedTitleEl = document.getElementById("selected-stop-title");
  var selectedLocationEl = document.getElementById("selected-stop-location");
  var startButton = document.getElementById("start-selected");
  var resetButton = document.getElementById("reset-tour");
  var mobileQuery = window.matchMedia("(max-width: 820px)");
  var seen = readSeen();
  var currentStopId = localStorage.getItem(CURRENT_KEY) || DEFAULT_START_ID;
  var MAP_IMAGE_SIZE = 900;
  var mapState = {
    scale: 1,
    minScale: 1,
    maxScale: 3,
    x: 0,
    y: 0,
    pointers: {},
    dragStart: null,
    pinchStart: null
  };

  function readSeen() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch (error) {
      return new Set();
    }
  }

  function saveSeen() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  }

  function getStop(id) {
    return tourStops.filter(function (stop) {
      return stop.id === id;
    })[0];
  }

  function getRecommendations(anchorId, limit) {
    // Coordinates are no longer used — recommend by order proximity only.
    var anchor = getStop(anchorId || currentStopId) || getStop(DEFAULT_START_ID);
    var unseen = tourStops.filter(function (stop) {
      return stop.id !== anchor.id && !seen.has(stop.id);
    });

    if (!unseen.length) {
      unseen = tourStops.filter(function (stop) {
        return stop.id !== anchor.id;
      });
    }

    return unseen
      .slice()
      .sort(function (a, b) {
        var aScore = Math.abs(a.order - anchor.order);
        var bScore = Math.abs(b.order - anchor.order);
        return aScore - bScore;
      })
      .slice(0, limit || 3);
  }

  function setCurrentStop(id) {
    currentStopId = id || DEFAULT_START_ID;
    localStorage.setItem(CURRENT_KEY, currentStopId);
    renderAll();
  }

  function openStop(id, markCurrentSeen) {
    var previousId = currentStopId;
    var target = getStop(id);
    if (!target) return;

    if (markCurrentSeen && previousId && previousId !== id) {
      seen.add(previousId);
      saveSeen();
    }

    setCurrentStop(id);
    window.location.hash = id;
    window.scrollTo(0, 0);
  }

  function toggleSeen(id) {
    if (seen.has(id)) {
      seen.delete(id);
    } else {
      seen.add(id);
    }

    saveSeen();
    renderAll(seen.has(id) ? "Marked as seen." : "Moved back to the route.");
  }

  function renderMap() {
    if (!mapEl) return;

    var pins = tourStops.map(function (stop) {
      var classes = ["tour-map__pin"];
      if (seen.has(stop.id)) classes.push("is-seen");
      if (currentStopId === stop.id) classes.push("is-current");

      return [
        '<button class="' + classes.join(" ") + '" type="button" data-select-stop="' + stop.id + '" style="--x:' + (stop.x || 50) + '%;--y:' + (stop.y || 50) + '%" aria-label="Select ' + stop.title + '">',
        '<span class="tour-map__pin-number">' + stop.order + '</span>',
        '<span class="tour-map__pin-label">' + stop.short + '</span>',
        '</button>'
      ].join("");
    }).join("");
    mapEl.innerHTML = [
      '<div class="tour-map__viewport" data-map-viewport>',
      '<div class="tour-map__content" data-map-content>',
      '<img class="tour-map__image" src="assets/img/map.webp" alt="Campus map" loading="lazy" draggable="false" data-map-image>',
      '</div>',
      '<div class="tour-map__pin-layer" data-map-pins>',
      pins,
      '</div>',
      '</div>',
      '<div class="tour-map__zoom-controls" aria-label="Map zoom controls">',
      '<button class="tour-map__control" type="button" data-map-zoom="out" aria-label="Zoom out">-</button>',
      '<button class="tour-map__control tour-map__control--reset" type="button" data-map-reset aria-label="Reset map view">Reset</button>',
      '<button class="tour-map__control" type="button" data-map-zoom="in" aria-label="Zoom in">+</button>',
      '</div>'
    ].join("");
    var image = mapEl.querySelector("[data-map-image]");
    if (image) {
      if (image.complete && image.naturalWidth) {
        MAP_IMAGE_SIZE = Math.min(image.naturalWidth, image.naturalHeight || image.naturalWidth);
      } else {
        image.addEventListener("load", function () {
          MAP_IMAGE_SIZE = Math.min(image.naturalWidth, image.naturalHeight || image.naturalWidth);
          applyMapTransform();
        }, { once: true });
      }
    }
    applyMapTransform();
  }

  function getMapContent() {
    return mapEl ? mapEl.querySelector("[data-map-content]") : null;
  }

  function getMapViewport() {
    return mapEl ? mapEl.querySelector("[data-map-viewport]") : null;
  }

  function updateMapMaxScale() {
    var viewport = getMapViewport();
    if (!viewport) return;

    var rect = viewport.getBoundingClientRect();
    var nativeScale = rect.width ? MAP_IMAGE_SIZE / rect.width : 3;
    mapState.maxScale = Math.max(mapState.minScale, Math.min(3, nativeScale));
    mapState.scale = clamp(mapState.scale, mapState.minScale, mapState.maxScale);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampMapPosition() {
    var viewport = getMapViewport();
    if (!viewport || mapState.scale <= mapState.minScale) {
      mapState.x = 0;
      mapState.y = 0;
      return;
    }

    var rect = viewport.getBoundingClientRect();
    var minX = rect.width - (rect.width * mapState.scale);
    var minY = rect.height - (rect.height * mapState.scale);
    mapState.x = clamp(mapState.x, minX, 0);
    mapState.y = clamp(mapState.y, minY, 0);
  }

  function applyMapTransform() {
    var content = getMapContent();
    if (!content) return;

    updateMapMaxScale();
    clampMapPosition();
    content.style.transform = "translate3d(" + mapState.x + "px, " + mapState.y + "px, 0) scale(" + mapState.scale + ")";
    updatePinPositions();
    mapEl.classList.toggle("is-zoomed", mapState.scale > mapState.minScale);
  }

  function updatePinPositions() {
    var viewport = getMapViewport();
    if (!viewport) return;

    var rect = viewport.getBoundingClientRect();
    Array.prototype.forEach.call(viewport.querySelectorAll(".tour-map__pin"), function (pin) {
      var x = parseFloat(pin.style.getPropertyValue("--x")) || 50;
      var y = parseFloat(pin.style.getPropertyValue("--y")) || 50;
      pin.style.left = (mapState.x + rect.width * mapState.scale * x / 100) + "px";
      pin.style.top = (mapState.y + rect.height * mapState.scale * y / 100) + "px";
    });
  }

  function setMapScale(nextScale, focalPoint) {
    var viewport = getMapViewport();
    if (!viewport) return;

    var rect = viewport.getBoundingClientRect();
    var previousScale = mapState.scale;
    var scale = clamp(nextScale, mapState.minScale, mapState.maxScale);
    var point = focalPoint || {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    var localX = point.x - rect.left;
    var localY = point.y - rect.top;
    var imageX = (localX - mapState.x) / previousScale;
    var imageY = (localY - mapState.y) / previousScale;

    mapState.scale = scale;
    mapState.x = localX - imageX * scale;
    mapState.y = localY - imageY * scale;
    applyMapTransform();
  }

  function resetMapView() {
    mapState.scale = mapState.minScale;
    mapState.x = 0;
    mapState.y = 0;
    applyMapTransform();
  }

  function pointerList() {
    return Object.keys(mapState.pointers).map(function (id) {
      return mapState.pointers[id];
    });
  }

  function pointerDistance(a, b) {
    var dx = a.clientX - b.clientX;
    var dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointerCenter(a, b) {
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    };
  }

  function bindMapGestures() {
    if (!mapEl) return;

    mapEl.addEventListener("wheel", function (event) {
      var viewport = event.target.closest("[data-map-viewport]");
      if (!viewport) return;

      event.preventDefault();
      var direction = event.deltaY > 0 ? -1 : 1;
      setMapScale(mapState.scale + direction * 0.18, { x: event.clientX, y: event.clientY });
    }, { passive: false });

    mapEl.addEventListener("pointerdown", function (event) {
      var viewport = event.target.closest("[data-map-viewport]");
      var interactive = event.target.closest("[data-select-stop], .tour-map__control, .pin-editor__toggle");
      if (!viewport || interactive) return;

      mapState.pointers[event.pointerId] = event;
      try { viewport.setPointerCapture(event.pointerId); } catch (error) {}

      var pointers = pointerList();
      if (pointers.length === 1) {
        mapState.dragStart = {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          x: mapState.x,
          y: mapState.y
        };
        mapState.pinchStart = null;
      } else if (pointers.length === 2) {
        mapState.pinchStart = {
          distance: pointerDistance(pointers[0], pointers[1]),
          scale: mapState.scale,
          center: pointerCenter(pointers[0], pointers[1])
        };
        mapState.dragStart = null;
      }
    });

    mapEl.addEventListener("pointermove", function (event) {
      if (!mapState.pointers[event.pointerId]) return;

      mapState.pointers[event.pointerId] = event;
      var pointers = pointerList();
      if (pointers.length === 2 && mapState.pinchStart) {
        var distance = pointerDistance(pointers[0], pointers[1]);
        var center = pointerCenter(pointers[0], pointers[1]);
        setMapScale(mapState.pinchStart.scale * (distance / mapState.pinchStart.distance), center);
        return;
      }

      if (pointers.length === 1 && mapState.dragStart && mapState.scale > mapState.minScale) {
        mapState.x = mapState.dragStart.x + event.clientX - mapState.dragStart.clientX;
        mapState.y = mapState.dragStart.y + event.clientY - mapState.dragStart.clientY;
        applyMapTransform();
      }
    });

    function endPointer(event) {
      delete mapState.pointers[event.pointerId];
      var pointers = pointerList();
      if (pointers.length === 1) {
        mapState.dragStart = {
          pointerId: pointers[0].pointerId,
          clientX: pointers[0].clientX,
          clientY: pointers[0].clientY,
          x: mapState.x,
          y: mapState.y
        };
        mapState.pinchStart = null;
      } else {
        mapState.dragStart = null;
        mapState.pinchStart = null;
      }
    }

    mapEl.addEventListener("pointerup", endPointer);
    mapEl.addEventListener("pointercancel", endPointer);
    mapEl.addEventListener("lostpointercapture", endPointer);
  }

  function renderSelectedStop() {
    var current = getStop(currentStopId) || getStop(DEFAULT_START_ID);
    if (selectedTitleEl) selectedTitleEl.textContent = current.order + ". " + current.title;
    if (selectedLocationEl) selectedLocationEl.textContent = current.where;
  }

  function routeCard(stop, label, className, markSeenOnOpen) {
    return [
      '<li class="' + className + '">',
      '<a href="#' + stop.id + '" data-open-stop="' + stop.id + '"' + (markSeenOnOpen ? ' data-mark-current-seen="true"' : "") + '>',
      '<span class="route-recs__rank">' + label + '</span>',
      '<strong>' + stop.order + ". " + stop.title + '</strong>',
      '<span>' + stop.where + '</span>',
      '</a>',
      '</li>'
    ].join("");
  }

  function renderStopControls() {
    tourStops.forEach(function (stop) {
      var section = document.getElementById(stop.id);
      if (!section || section.querySelector(".stop-actions")) return;

      var topNav = document.createElement("div");
      topNav.className = "mobile-stop-nav";
      topNav.innerHTML = '<a class="mobile-stop-nav__back stop-action stop-action--map" href="#top" data-back-home="true">Back to Map</a>';
      section.insertBefore(topNav, section.firstElementChild);

      var actions = document.createElement("div");
      actions.className = "stop-actions";
      actions.innerHTML = '<button class="stop-action stop-action--seen" type="button" data-toggle-seen="' + stop.id + '"></button>';

      var facts = section.querySelector(".facts");
      if (facts) facts.insertAdjacentElement("afterend", actions);

      var body = section.querySelector(".body");
      if (body && !body.querySelector(".stop-route")) {
        var route = document.createElement("section");
        route.className = "stop-route";
        route.setAttribute("aria-label", "Best next stops");
        body.appendChild(route);
      }
    });
  }

  function renderStopRecommendations() {
    tourStops.forEach(function (stop) {
      var section = document.getElementById(stop.id);
      var route = section ? section.querySelector(".stop-route") : null;
      if (!route) return;

      var recs = getRecommendations(stop.id, 3);
      route.innerHTML = [
        '<h3>Best next stops</h3>',
        '<ol class="route-recs route-recs--stop">',
        recs.map(function (nextStop, index) {
          return routeCard(nextStop, index === 0 ? "Best next stop" : "Then", "route-recs__item", true);
        }).join(""),
        '</ol>'
      ].join("");
    });
  }

  function updateStopControls() {
    tourStops.forEach(function (stop) {
      var section = document.getElementById(stop.id);
      var seenButton = section ? section.querySelector("[data-toggle-seen]") : null;

      if (section) {
        section.classList.toggle("is-seen", seen.has(stop.id));
        section.classList.toggle("is-current", currentStopId === stop.id);
      }

      if (seenButton) {
        seenButton.textContent = seen.has(stop.id) ? "Seen" : "Mark Seen";
        seenButton.setAttribute("aria-pressed", seen.has(stop.id) ? "true" : "false");
      }
    });
  }

  function updateProgress() {
    if (!progressEl) return;
    progressEl.textContent = seen.size + "/" + tourStops.length + " seen";
  }

  function updateRouteMode() {
    var stopId = window.location.hash.replace("#", "");
    var selectedStop = getStop(stopId);

    document.body.classList.toggle("mobile-stop-view", mobileQuery.matches && Boolean(selectedStop));
    document.body.classList.toggle("mobile-home-view", mobileQuery.matches && !selectedStop);

    stopSections.forEach(function (section) {
      section.classList.toggle("is-selected-stop", selectedStop && section.id === selectedStop.id);
    });

    if (selectedStop && currentStopId !== selectedStop.id) {
      currentStopId = selectedStop.id;
      localStorage.setItem(CURRENT_KEY, currentStopId);
      renderMap();
      renderSelectedStop();
      renderStopRecommendations();
      updateStopControls();
      updateProgress();
    }
  }

  function renderAll() {
    renderMap();
    renderSelectedStop();
    renderStopRecommendations();
    updateStopControls();
    updateProgress();
    updateRouteMode();
  }

  function resetTour() {
    seen.clear();
    saveSeen();
    renderAll("Seen stops reset.");
  }

  function updateTopButton() {
    if (!topButton) return;
    topButton.classList.toggle("is-visible", window.scrollY > 600);
  }

  function scrollCurrentStopToTop() {
    var selected = document.querySelector(".stop.is-selected-stop") || document.getElementById(currentStopId);
    if (selected) {
      selected.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setActiveStop() {
    if (!stopSections.length) return;

    var activeId = stopSections[0].id;
    var marker = window.innerHeight * 0.35;

    stopSections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= marker) {
        activeId = section.id;
      }
    });

    stopLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + activeId);
    });
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var seenButton = event.target.closest("[data-toggle-seen]");
      var openLink = event.target.closest("[data-open-stop]");
      var selectButton = event.target.closest("[data-select-stop]");
      var zoomButton = event.target.closest("[data-map-zoom]");
      var resetMapButton = event.target.closest("[data-map-reset]");
      var backHome = event.target.closest("[data-back-home]");

      if (seenButton) {
        toggleSeen(seenButton.getAttribute("data-toggle-seen"));
        return;
      }

      if (selectButton) {
        event.preventDefault();
        setCurrentStop(selectButton.getAttribute("data-select-stop"));
        return;
      }

      if (openLink) {
        event.preventDefault();
        openStop(openLink.getAttribute("data-open-stop"), openLink.getAttribute("data-mark-current-seen") === "true");
        return;
      }

      if (zoomButton) {
        event.preventDefault();
        setMapScale(mapState.scale + (zoomButton.getAttribute("data-map-zoom") === "in" ? 0.35 : -0.35));
        return;
      }

      if (resetMapButton) {
        event.preventDefault();
        resetMapView();
        return;
      }

      if (backHome) {
        window.setTimeout(updateRouteMode, 0);
      }
    });

    stopLinks.forEach(function (link) {
      link.setAttribute("data-open-stop", link.getAttribute("href").replace("#", ""));
    });

    if (startButton) {
      startButton.addEventListener("click", function () {
        openStop(currentStopId, false);
      });
    }

    if (resetButton) resetButton.addEventListener("click", resetTour);

    if (topButton) {
      topButton.addEventListener("click", function (event) {
        if (!document.body.classList.contains("mobile-stop-view")) return;
        event.preventDefault();
        scrollCurrentStopToTop();
      });
    }

    window.addEventListener("hashchange", updateRouteMode);
    window.addEventListener("scroll", function () {
      updateTopButton();
      setActiveStop();
    }, { passive: true });
    window.addEventListener("resize", function () {
      setActiveStop();
      updateRouteMode();
      applyMapTransform();
    });
  }

  // --- Visual pin editor (developer mode) ---
  function enablePinEditor() {
    if (!mapEl) return;

    // If a toggle already exists, just click it to toggle editor mode.
    var existing = mapEl.querySelector('.pin-editor__toggle');
    if (existing) {
      existing.click();
      return;
    }

    // Create editor toggle
    var editorToggle = document.createElement('button');
    editorToggle.className = 'route-button pin-editor__toggle';
    editorToggle.textContent = 'Edit pins';
    editorToggle.type = 'button';
    editorToggle.setAttribute('aria-pressed', 'false');
    mapEl.appendChild(editorToggle);

    var activeEditor = false;
    var dragging = null;

    function onPointerDown(e) {
      var btn = e.target.closest('.tour-map__pin');
      if (!btn) return;
      dragging = btn;
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var viewport = getMapViewport();
      if (!viewport) return;

      var rect = viewport.getBoundingClientRect();
      var x = Math.max(0, Math.min(100, ((e.clientX - rect.left - mapState.x) / (rect.width * mapState.scale)) * 100));
      var y = Math.max(0, Math.min(100, ((e.clientY - rect.top - mapState.y) / (rect.height * mapState.scale)) * 100));
      dragging.style.setProperty('--x', x + '%');
      dragging.style.setProperty('--y', y + '%');
      updatePinPositions();
    }

    function onPointerUp(e) {
      if (!dragging) return;
      try { dragging.releasePointerCapture(e.pointerId); } catch (err) {}
      // persist position to tourStops and localStorage editor cache
      var stopId = dragging.getAttribute('data-select-stop');
      var x = parseFloat(dragging.style.getPropertyValue('--x')) || 50;
      var y = parseFloat(dragging.style.getPropertyValue('--y')) || 50;
      var stop = getStop(stopId);
      if (stop) {
        stop.x = x;
        stop.y = y;
      }
      var cache = JSON.parse(localStorage.getItem(STORAGE_KEY + ':editor') || '{}');
      cache[stopId] = { x: stop.x, y: stop.y };
      localStorage.setItem(STORAGE_KEY + ':editor', JSON.stringify(cache));
      dragging = null;
    }

    editorToggle.addEventListener('click', function () {
      activeEditor = !activeEditor;
      editorToggle.setAttribute('aria-pressed', activeEditor ? 'true' : 'false');
      editorToggle.textContent = activeEditor ? 'Exit editor' : 'Edit pins';
      mapEl.classList.toggle('pin-editor-active', activeEditor);
      // attach/detach pointer listeners
      if (activeEditor) {
        mapEl.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      } else {
        mapEl.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        // reload to ensure pins render from saved positions
        renderAll();
      }
    });

    // apply any saved editor positions
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY + ':editor') || '{}');
    Object.keys(saved).forEach(function (id) {
      var s = getStop(id);
      if (s) { s.x = saved[id].x; s.y = saved[id].y; }
    });
  }

  // Expose a simple keyboard shortcut: press "e" to toggle editor
  document.addEventListener('keydown', function (ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.isContentEditable)) return;

    if (ev.key === 'e' || ev.key === 'E') {
      ev.preventDefault();
      if (!mapEl) return;
      var toggle = mapEl.querySelector('.pin-editor__toggle');
      if (toggle) {
        toggle.click();
      } else {
        enablePinEditor();
        var newToggle = mapEl.querySelector('.pin-editor__toggle');
        if (newToggle) newToggle.click();
      }
    }
  });

  renderStopControls();
  bindEvents();
  bindMapGestures();
  renderAll();
  updateTopButton();
  setActiveStop();
})();
