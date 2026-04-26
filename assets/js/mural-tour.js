(function () {
  var STORAGE_KEY = "floridaramaMuralTourSeen";
  var CURRENT_KEY = "floridaramaMuralTourCurrent";
  var DEFAULT_START_ID = "stop-2";

  var tourStops = [
    { id: "stop-1", title: "Ricky Watts Mural", short: "Ricky Watts", where: "Bldg 5 / Fairfield", x: 18, y: 30 },
    { id: "stop-2", title: "Cosmic Beams & Sunshine Dreams", short: "Cosmic Beams", where: "Bldg 5 Lobby", x: 32, y: 34 },
    { id: "stop-3", title: "Hearts Were Meant to Fly", short: "Hearts", where: "Bldg 6 Boardwalk", x: 50, y: 58 },
    { id: "stop-4", title: "Florida Wildlife Corridor", short: "Wildlife", where: "Bldg 7", x: 73, y: 44 },
    { id: "stop-5", title: "St. Pete: West to East", short: "West to East", where: "Bldg 5 Trail Side", x: 30, y: 74 },
    { id: "stop-6", title: "Museum of Motherhood Mural", short: "Motherhood", where: "Bldg 7 / Fairfield", x: 79, y: 27 },
    { id: "stop-7", title: "The Path of the Wild", short: "Path of the Wild", where: "Bldg 2", x: 15, y: 82 },
    { id: "stop-8", title: "FloridaRAMA Entrance Mural", short: "Entrance", where: "Bldg 6 Entrance", x: 49, y: 35 },
    { id: "stop-9", title: "FloridaRAMA Exit Doodle Wall", short: "Exit Wall", where: "Bldg 6 Exit", x: 57, y: 47 }
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

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getRecommendations(anchorId, limit) {
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
        var aScore = distance(anchor, a) + Math.abs(a.order - anchor.order) * 2.5;
        var bScore = distance(anchor, b) + Math.abs(b.order - anchor.order) * 2.5;
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

    var path = tourStops.map(function (stop) {
      return stop.x + "," + stop.y;
    }).join(" ");

    var pins = tourStops.map(function (stop) {
      var classes = ["tour-map__pin"];
      if (seen.has(stop.id)) classes.push("is-seen");
      if (currentStopId === stop.id) classes.push("is-current");

      return [
        '<button class="' + classes.join(" ") + '" type="button" data-select-stop="' + stop.id + '" style="--x:' + stop.x + '%;--y:' + stop.y + '%" aria-label="Select ' + stop.title + '">',
        '<span class="tour-map__pin-number">' + stop.order + '</span>',
        '<span class="tour-map__pin-label">' + stop.short + '</span>',
        '</button>'
      ].join("");
    }).join("");

    mapEl.innerHTML = [
      '<svg class="tour-map__path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">',
      '<polyline points="' + path + '"></polyline>',
      '</svg>',
      '<div class="tour-map__label tour-map__label--north">Fairfield Ave S</div>',
      '<div class="tour-map__label tour-map__label--south">Pinellas Trail</div>',
      '<div class="tour-map__building tour-map__building--5">Bldg 5</div>',
      '<div class="tour-map__building tour-map__building--6">Bldg 6</div>',
      '<div class="tour-map__building tour-map__building--7">Bldg 7</div>',
      '<div class="tour-map__building tour-map__building--2">Bldg 2</div>',
      pins
    ].join("");
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
    });
  }

  renderStopControls();
  bindEvents();
  renderAll();
  updateTopButton();
  setActiveStop();
})();
