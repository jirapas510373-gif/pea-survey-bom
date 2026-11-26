(function() {
  "use strict";

  // 0. Helper ผูกไอคอนจาก PEA_ICONS
  function iconHtml(name, size = 16, extraClass = "") {
    if (window.PEA_ICONS && typeof window.PEA_ICONS[name] === "function") {
      return window.PEA_ICONS[name](size, extraClass);
    }
    return "";
  }

  function hydrateIcons(root = document) {
    if (!window.PEA_ICONS) return;
    root.querySelectorAll("[data-icon]").forEach(el => {
      const key = el.dataset.icon;
      const size = parseInt(el.dataset.iconSize || "16", 10);
      const extraClass = el.dataset.iconClass || "";
      if (typeof window.PEA_ICONS[key] === "function") {
        el.innerHTML = window.PEA_ICONS[key](size, extraClass);
      }
    });
  }

  // 1. ฐานข้อมูลอุปกรณ์หัวเสาแรงสูง (ครบ 41 รายการ)
  const HV_TOP_HARDWARE = [
    { type: "SP", system: "1 Phase" },
    { type: "SP", system: "3 Phase" },
    { type: "SP-AL", system: "1 Phase" },
    { type: "SP-AL", system: "3 Phase" },
    { type: "DP", system: "1 Phase" },
    { type: "DP", system: "3 Phase" },
    { type: "DP-AL", system: "1 Phase" },
    { type: "DP-AL", system: "3 Phase" },
    { type: "SP 1.5 M", system: "1 Phase" },
    { type: "SP 1.5 M", system: "3 Phase" },
    { type: "DP 1.5 M", system: "1 Phase" },
    { type: "DP 1.5 M", system: "3 Phase" },
    { type: "CCB(ทางตรง)", system: "1 Phase" },
    { type: "CCB(ทางโค้ง)", system: "1 Phase" },
    { type: "CCB(ทางโค้ง)", system: "3 Phase" },
    { type: "CCB(ทางตรง) 2 CIRCUIT", system: "1 Phase" },
    { type: "CCB(ทางโค้ง) 2 CIRCUIT", system: "3 Phase" },
    { type: "DDE", system: "1 Phase" },
    { type: "DDE", system: "3 Phase" },
    { type: "DDE-AL", system: "1 Phase" },
    { type: "DDE-AL", system: "3 Phase" },
    { type: "DE", system: "1 Phase" },
    { type: "DE", system: "3 Phase" },
    { type: "DE-AL", system: "1 Phase" },
    { type: "DE-AL", system: "3 Phase" },
    { type: "BA", system: "1 Phase" },
    { type: "BA", system: "3 Phase" },
    { type: "BA-AL", system: "1 Phase" },
    { type: "BA-AL", system: "3 Phase" },
    { type: "CSC", system: "1 Phase" },
    { type: "CSC", system: "3 Phase" },
    { type: "CTB", system: "1 Phase" },
    { type: "CTB", system: "3 Phase" },
    { type: "CSC 2 CIRCUIT", system: "1 Phase" },
    { type: "CTB 2 CIRCUIT", system: "3 Phase" },
    { type: "BL", system: "1 Phase" },
    { type: "BL", system: "3 Phase" },
    { type: "BL-AL", system: "1 Phase" },
    { type: "BL-AL", system: "3 Phase" },
    { type: "INSULATOR 57-3", system: "" },
    { type: "INSULATOR SUPPENSION", system: "" }
  ];

  const HOTLINE_CLAMP_OPTIONS = [
    "HOTLINE CLAMP 50 ต.มม.",
    "HOTLINE CLAMP 95 ต.มม.",
    "HOTLINE CLAMP 185 ต.มม."
  ];

  const BAIL_CLAMP_OPTIONS = [
    "BAIL CLAMP 50 ต.มม.",
    "BAIL CLAMP 95 ต.มม.",
    "BAIL CLAMP 185 ต.มม."
  ];

  const CONNECTOR_OPTIONS = [
    "CONNECTOR 25 ต.มม.",
    "CONNECTOR 50 ต.มม.",
    "CONNECTOR 95 ต.มม.",
    "CONNECTOR METER"
  ];

  const POLE_SIZES_LV = ["8", "9"];
  const POLE_SIZES_HV = ["12", "12.2", "14", "14.3"];
  const TR_SIZES = ["30 kVA", "50 kVA", "100 kVA", "160 kVA", "250 kVA", "315 kVA", "400 kVA", "500 kVA", "800 kVA", "1000 kVA"];

  function getRackOptionsForPole(poleSize) {
    const rackPoleKey = (poleSize === "8" || poleSize === "9") ? "8/9" : poleSize;
    const list = [];
    for (let r = 1; r <= 4; r++) {
      list.push(`RACK ${r} | ทางตรง | เสา ${rackPoleKey} ม.`);
      ["DE", "DDE"].forEach(kind => {
        ["25 ต.มม.", "50 ต.มม.", "95 ต.มม."].forEach(wire => {
          list.push(`RACK ${r} ${kind} | ${wire} | เสา ${rackPoleKey} ม.`);
        });
      });
    }
    return list;
  }

  function calcDistanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters) || meters < 0) return "-";
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} กม. (${meters.toFixed(1)} ม.)`;
    }
    return `${meters.toFixed(1)} ม.`;
  }

  function getReferencePoleForPin(poles, coord) {
    if (!poles || !poles.length) return null;
    let nearest = poles[0];
    let minDist = calcDistanceMeters(coord.lat, coord.lng, nearest.lat, nearest.lng);
    for (let i = 1; i < poles.length; i++) {
      const d = calcDistanceMeters(coord.lat, coord.lng, poles[i].lat, poles[i].lng);
      if (d < minDist) {
        minDist = d;
        nearest = poles[i];
      }
    }
    return { pole: nearest, distanceMeters: minDist };
  }

  // 2. Safe Storage & State
  const STORAGE_KEY = "PEA_KWN_SURVEY_PROJECTS_V18";
  let memoryFallback = null;

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    if (memoryFallback) return memoryFallback;
    return createDefaultData();
  }

  function saveData(data) {
    memoryFallback = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function createDefaultData() {
    return {
      activeProjectId: "proj-1",
      projects: [
        {
          id: "proj-1",
          name: "ขยายเขตระบบจำหน่ายแรงสูง+หม้อแปลง 160 kVA บ้านควนขนุน",
          wbs: "C-69-KWN-0101",
          area: "อ.ควนขนุน จ.พัทลุง (KWN-02)",
          surveyor: "แผนกสำรวจประมาณการ กฟภ.สาขาควนขนุน",
          lineSummary: {
            lvRemSystem: "", lvRemDist: "", lvRemUnit: "เมตร",
            lvInsSystem: "3 เฟส 4 สาย", lvInsDist: "240", lvInsUnit: "เมตร",
            hvRemSystem: "", hvRemDist: "", hvRemUnit: "เมตร",
            hvInsSystem: "3 เฟส 33 เควี.", hvInsDist: "180", hvInsUnit: "เมตร"
          },
          poles: [
            {
              id: "p-101",
              code: "P-01",
              lat: 7.736200,
              lng: 100.008500,
              workType: "NEW",
              singleSystem: "HV",
              swapMode: "LV_TO_LV",
              meterRemoveCount: 0,
              meterInstallCount: 0,
              note: "จุดรับไฟแรงสูงต้นทาง",
              installSpec: {
                system: "HV",
                poleSize: "12.2",
                concreteBase: true,
                hasStub: false,
                hvTopList: [{ name: "DE-AL (3 Phase)", qty: 1 }],
                hasHotlineBailClamp: false,
                hotlineClampList: [],
                bailClampList: [],
                dropoutQty: 0,
                tr202Qty: 0,
                hasTransformer: false,
                trSize: "160 kVA",
                rackList: [{ name: "RACK 4 DE | 95 ต.มม. | เสา 12.2 ม.", qty: 1 }],
                connectorList: [{ name: "CONNECTOR 95 ต.มม.", qty: 4 }],
                gy33Qty: 2,
                gy02Qty: 1,
                hvArresterQty: 0,
                hvGroundQty: 1,
                lvArresterQty: 0,
                lvGroundQty: 1
              },
              removeSpec: null
            },
            {
              id: "p-102",
              code: "P-02",
              lat: 7.735650,
              lng: 100.009450,
              workType: "NEW",
              singleSystem: "HV",
              swapMode: "LV_TO_LV",
              meterRemoveCount: 0,
              meterInstallCount: 2,
              note: "จุดแยกสายและติดตั้งหม้อแปลง 160 kVA",
              installSpec: {
                system: "HV",
                poleSize: "12.2",
                concreteBase: false,
                hasStub: false,
                hvTopList: [{ name: "BL-AL (3 Phase)", qty: 1 }],
                hasHotlineBailClamp: true,
                hotlineClampList: [{ name: "HOTLINE CLAMP 50 ต.มม.", qty: 3 }],
                bailClampList: [{ name: "BAIL CLAMP 50 ต.มม.", qty: 3 }],
                dropoutQty: 3,
                tr202Qty: 3,
                hasTransformer: true,
                trSize: "160 kVA",
                rackList: [{ name: "RACK 4 DDE | 95 ต.มม. | เสา 12.2 ม.", qty: 1 }],
                connectorList: [{ name: "CONNECTOR 95 ต.มม.", qty: 4 }],
                gy33Qty: 1,
                gy02Qty: 1,
                hvArresterQty: 3,
                hvGroundQty: 1,
                lvArresterQty: 3,
                lvGroundQty: 1
              },
              removeSpec: null
            }
          ]
        },
        {
          id: "proj-2",
          name: "ปรับปรุงสับเปลี่ยนเสาแรงต่ำชำรุด ต.ป่าพะยอม",
          wbs: "M-69-KWN-0045",
          area: "อ.ป่าพะยอม จ.พัทลุง (KWN-05)",
          surveyor: "ทีมสำรวจ กฟภ.สาขาควนขนุน",
          lineSummary: {
            lvRemSystem: "1 เฟส 2 สาย", lvRemDist: "120", lvRemUnit: "เมตร",
            lvInsSystem: "1 เฟส 3 สาย", lvInsDist: "120", lvInsUnit: "เมตร",
            hvRemSystem: "", hvRemDist: "", hvRemUnit: "เมตร",
            hvInsSystem: "", hvInsDist: "", hvInsUnit: "เมตร"
          },
          poles: [
            {
              id: "p-201",
              code: "S-01",
              lat: 7.734900,
              lng: 100.007900,
              workType: "SWAP",
              singleSystem: "LV",
              swapMode: "LV_TO_LV",
              meterRemoveCount: 1,
              meterInstallCount: 1,
              note: "สับเปลี่ยนเสา 8 ม. เดิมเป็น 9 ม.",
              removeSpec: {
                system: "LV",
                poleSize: "8",
                concreteBase: false,
                hasStub: false,
                hvTopList: [],
                hasHotlineBailClamp: false,
                hotlineClampList: [],
                bailClampList: [],
                dropoutQty: 0,
                tr202Qty: 0,
                hasTransformer: false,
                trSize: "",
                rackList: [{ name: "RACK 2 | ทางตรง | เสา 8/9 ม.", qty: 1 }],
                connectorList: [{ name: "CONNECTOR 25 ต.มม.", qty: 2 }],
                gy33Qty: 0,
                gy02Qty: 0,
                hvArresterQty: 0,
                hvGroundQty: 0,
                lvArresterQty: 0,
                lvGroundQty: 0
              },
              installSpec: {
                system: "LV",
                poleSize: "9",
                concreteBase: false,
                hasStub: false,
                hvTopList: [],
                hasHotlineBailClamp: false,
                hotlineClampList: [],
                bailClampList: [],
                dropoutQty: 0,
                tr202Qty: 0,
                hasTransformer: false,
                trSize: "",
                rackList: [{ name: "RACK 3 | ทางตรง | เสา 8/9 ม.", qty: 1 }],
                connectorList: [{ name: "CONNECTOR 50 ต.มม.", qty: 3 }],
                gy33Qty: 0,
                gy02Qty: 1,
                hvArresterQty: 0,
                hvGroundQty: 0,
                lvArresterQty: 1,
                lvGroundQty: 1
              }
            }
          ]
        }
      ]
    };
  }

  let appState = loadData();
  let selectedCoord = { lat: 7.735800, lng: 100.009200 };
  let mapCenter = { lat: 7.735800, lng: 100.009200 };
  let currentUserLocation = null;
  let activePopupPoleId = null;

  const BASE_Z18_PX_PER_DEG_LNG = (256 * Math.pow(2, 18)) / 360;
  function getPxPerDegLatForZoom(z) {
    const latRad = (mapCenter.lat * Math.PI) / 180;
    const pxPerDegLng = BASE_Z18_PX_PER_DEG_LNG * Math.pow(2, z - 18);
    return {
      pxPerDegLng,
      pxPerDegLat: pxPerDegLng / Math.cos(latRad)
    };
  }

  let zoomFloat = 18.0;
  const MIN_ZOOM = 13.0;
  const MAX_ZOOM = 20.0;
  let isSatellite = true;

  const MAP_SOURCES = [
    { id: "google_sat", name: "Google Sat", label: "Google Satellite" },
    { id: "google_hybrid", name: "Google Hybrid", label: "Google Hybrid (ดาวเทียม+ถนน)" },
    { id: "esri_hd", name: "Esri HD", label: "Esri World Imagery" }
  ];
  let mapSourceIndex = 0;

  let draftSpecs = { install: null, remove: null };
  const tileCache = new Map();

  function lon2tile(lon, zoom) {
    return ((lon + 180) / 360) * Math.pow(2, zoom);
  }
  function lat2tile(lat, zoom) {
    const rad = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom);
  }
  function tile2lon(x, zoom) {
    return (x / Math.pow(2, zoom)) * 360 - 180;
  }
  function tile2lat(y, zoom) {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  function latLngToCanvas(lat, lng, width, height, z = zoomFloat) {
    const { pxPerDegLng, pxPerDegLat } = getPxPerDegLatForZoom(z);
    const x = width / 2 + (lng - mapCenter.lng) * pxPerDegLng;
    const y = height / 2 - (lat - mapCenter.lat) * pxPerDegLat;
    return { x, y };
  }

  function canvasToLatLng(x, y, width, height, z = zoomFloat) {
    const { pxPerDegLng, pxPerDegLat } = getPxPerDegLatForZoom(z);
    const lng = mapCenter.lng + (x - width / 2) / pxPerDegLng;
    const lat = mapCenter.lat - (y - height / 2) / pxPerDegLat;
    return { lat, lng };
  }

  function applyZoomDelta(delta, anchorPixel = null) {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomFloat + delta));
    if (Math.abs(nextZoom - zoomFloat) < 0.0001) return;

    const canvas = document.getElementById("surveyMap");
    if (anchorPixel && canvas) {
      const beforeCoord = canvasToLatLng(anchorPixel.x, anchorPixel.y, canvas.width, canvas.height, zoomFloat);
      zoomFloat = nextZoom;
      const { pxPerDegLng, pxPerDegLat } = getPxPerDegLatForZoom(zoomFloat);
      mapCenter.lng = beforeCoord.lng - (anchorPixel.x - canvas.width / 2) / pxPerDegLng;
      mapCenter.lat = beforeCoord.lat + (anchorPixel.y - canvas.height / 2) / pxPerDegLat;
    } else {
      zoomFloat = nextZoom;
    }

    updateZoomBadge();
    drawMap();
  }

  function setZoomAbsolute(targetZoom, anchorPixel = null) {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    applyZoomDelta(clamped - zoomFloat, anchorPixel);
  }

  function updateZoomBadge() {
    const label = document.getElementById("zoomLevelLabel");
    if (label) {
      const pct = Math.round(Math.pow(2, zoomFloat - 18) * 100);
      label.textContent = `Z${Math.round(zoomFloat)} (${pct}%)`;
    }
  }

  function getTileUrl(sourceId, tx, ty, z) {
    if (sourceId === "google_sat") {
      const srv = (tx + ty) % 4;
      return `https://mt${srv}.google.com/vt/lyrs=s&x=${tx}&y=${ty}&z=${z}`;
    }
    if (sourceId === "google_hybrid") {
      const srv = (tx + ty) % 4;
      return `https://mt${srv}.google.com/vt/lyrs=y&x=${tx}&y=${ty}&z=${z}`;
    }
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`;
  }

  function requestSatelliteTile(sourceId, tx, ty, z) {
    const key = `${sourceId}/${z}/${tx}/${ty}`;
    if (tileCache.has(key)) {
      return tileCache.get(key);
    }
    const entry = { img: new Image(), loaded: false, failed: false };
    entry.img.crossOrigin = "anonymous";

    entry.img.onload = () => {
      entry.loaded = true;
      const srcObj = MAP_SOURCES.find(s => s.id === sourceId);
      updateSatStatusLabel(`ดาวเทียม: ${srcObj ? srcObj.label : sourceId} (Z${z})`);
      drawMap();
    };
    entry.img.onerror = () => {
      entry.failed = true;
      if (sourceId !== "esri_hd") {
        requestSatelliteTile("esri_hd", tx, ty, z);
      }
    };
    entry.img.src = getTileUrl(sourceId, tx, ty, z);
    tileCache.set(key, entry);
    return entry;
  }

  function drawTileWithFallback(ctx, sourceId, tx, ty, tileZ, p1, p2) {
    const tw = Math.ceil(p2.x - p1.x) + 1;
    const th = Math.ceil(p2.y - p1.y) + 1;

    const primary = requestSatelliteTile(sourceId, tx, ty, tileZ);
    if (primary.loaded) {
      ctx.drawImage(primary.img, p1.x, p1.y, tw, th);
      return;
    }

    const esriFallback = (sourceId !== "esri_hd") ? requestSatelliteTile("esri_hd", tx, ty, tileZ) : null;
    if (esriFallback && esriFallback.loaded) {
      ctx.drawImage(esriFallback.img, p1.x, p1.y, tw, th);
      return;
    }

    if (tileZ > 13) {
      const parentZ = tileZ - 1;
      const ptx = Math.floor(tx / 2);
      const pty = Math.floor(ty / 2);
      const parentEntry = tileCache.get(`${sourceId}/${parentZ}/${ptx}/${pty}`) || tileCache.get(`esri_hd/${parentZ}/${ptx}/${pty}`);
      if (parentEntry && parentEntry.loaded) {
        const subX = (tx % 2) * 128;
        const subY = (ty % 2) * 128;
        ctx.drawImage(parentEntry.img, subX, subY, 128, 128, p1.x, p1.y, tw, th);
        return;
      }
    }

    ctx.fillStyle = ((tx + ty) % 2 === 0) ? "#131c2e" : "#172238";
    ctx.fillRect(p1.x, p1.y, tw, th);
  }

  function updateSatStatusLabel(text) {
    const el = document.getElementById("satStatusLabel");
    if (el) el.textContent = text;
  }

  function updateCursorCoordBadge() {
    const proj = getActiveProject();
    const poles = proj ? proj.poles : [];
    const ref = getReferencePoleForPin(poles, selectedCoord);
    const distPart = ref
      ? ` • <span class="dist-highlight">ห่างจาก ${escapeHtml(ref.pole.code)}: ${formatDistance(ref.distanceMeters)}</span>`
      : "";
    document.getElementById("cursorCoordBadge").innerHTML =
      `พิกัดปักหมุด: ${selectedCoord.lat.toFixed(6)}, ${selectedCoord.lng.toFixed(6)}${distPart}`;
  }

  function setSelectedCoord(lat, lng, recenter = false) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    selectedCoord = { lat, lng };
    if (recenter) {
      mapCenter = { lat, lng };
    }
    updateCursorCoordBadge();
    document.getElementById("manualLat").value = selectedCoord.lat.toFixed(6);
    document.getElementById("manualLng").value = selectedCoord.lng.toFixed(6);
    drawMap();
  }

  function locateCurrentUser(centerOnFound = true) {
    if (!navigator.geolocation) {
      alert("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }
    updateSatStatusLabel("กำลังค้นหาตำแหน่งปัจจุบัน...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentUserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15
        };
        if (centerOnFound) {
          setSelectedCoord(currentUserLocation.lat, currentUserLocation.lng, true);
        } else {
          drawMap();
        }
        updateSatStatusLabel(`GPS แม่นยำ ±${Math.round(currentUserLocation.accuracy)} ม.`);
      },
      () => {
        updateSatStatusLabel("ไม่ได้รับสิทธิ์ GPS • คลิกหรือกรอกพิกัดได้เอง");
        if (centerOnFound) {
          alert("ไม่สามารถเข้าถึง GPS ปัจจุบันได้ กรุณาอนุญาต Location หรือคลิกปักหมุดบนแผนที่ได้เลยครับ");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }

  function drawDistanceLabelOnCanvas(ctx, midX, midY, text, bgColor = "rgba(15, 23, 42, 0.9)", borderColor = "#fbbf24", textColor = "#fde047") {
    ctx.save();
    ctx.font = "700 12px 'Sarabun', sans-serif";
    const padX = 7;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;
    const boxH = 20;
    const x = midX - boxW / 2;
    const y = midY - boxH / 2;

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, midX, midY + 0.5);
    ctx.restore();
  }

  function findHitPoleAtPixel(x, y, width, height) {
    const proj = getActiveProject();
    const poles = proj ? proj.poles : [];
    for (let i = poles.length - 1; i >= 0; i--) {
      const p = poles[i];
      const pt = latLngToCanvas(p.lat, p.lng, width, height, zoomFloat);
      const hasTr = p.installSpec && p.installSpec.hasTransformer;
      const hitRadius = (hasTr ? 11 : 8) + 10;
      if (Math.hypot(x - pt.x, y - pt.y) <= hitRadius) {
        return { pole: p, index: i };
      }
    }
    return null;
  }

  function renderPolePopup() {
    const popup = document.getElementById("poleMapPopup");
    if (!popup) return;
    const proj = getActiveProject();
    if (!activePopupPoleId || !proj) {
      popup.classList.add("hidden");
      return;
    }

    const idx = proj.poles.findIndex(p => p.id === activePopupPoleId);
    if (idx === -1) {
      activePopupPoleId = null;
      popup.classList.add("hidden");
      return;
    }

    const p = proj.poles[idx];
    const isHeadOnly = p.workType === "SWAP_HEAD";
    let workLabel = "ปักเสาใหม่";
    if (p.workType === "REMOVE") workLabel = "รื้อถอนเสา";
    else if (p.workType === "SWAP") workLabel = `สับเปลี่ยนเสา (${p.swapMode.replace("_TO_", " → ")})`;
    else if (p.workType === "SWAP_HEAD") workLabel = "สับเปลี่ยนเฉพาะหัวเสา";

    const distText = idx > 0
      ? formatDistance(calcDistanceMeters(proj.poles[idx - 1].lat, proj.poles[idx - 1].lng, p.lat, p.lng))
      : "จุดเริ่มต้น";

    const meterLines = [];
    if (Number(p.meterRemoveCount) > 0) meterLines.push(`รื้อมิเตอร์ ${p.meterRemoveCount} เครื่อง`);
    if (Number(p.meterInstallCount) > 0) meterLines.push(`ติดตั้งมิเตอร์ ${p.meterInstallCount} เครื่อง`);

    popup.innerHTML = `
      <div class="pole-popup-header">
        <div>
          <div class="pole-popup-title">#${idx + 1} ${escapeHtml(p.code)}</div>
          <div class="pole-popup-sub">${escapeHtml(workLabel)} • ระบบ ${escapeHtml(p.singleSystem || (p.installSpec && p.installSpec.system) || "-")}</div>
        </div>
        <button type="button" class="pole-popup-close" data-action="closePolePopup" title="ปิด">✕</button>
      </div>
      <div class="pole-popup-body">
        <div><strong>พิกัด:</strong> ${Number(p.lat).toFixed(6)}, ${Number(p.lng).toFixed(6)}</div>
        <div><strong>ระยะห่างจากเสาก่อนหน้า:</strong> ${escapeHtml(distText)}</div>
        ${p.removeSpec ? `<div style="color:#fca5a5; margin-top:4px;"><strong>รื้อถอน:</strong> ${escapeHtml(formatSpecText(p.removeSpec, false, isHeadOnly))}</div>` : ""}
        ${p.installSpec ? `<div style="color:#86efac; margin-top:4px;"><strong>ติดตั้งใหม่:</strong> ${escapeHtml(formatSpecText(p.installSpec, true, isHeadOnly))}</div>` : ""}
        ${meterLines.length ? `<div style="color:#7dd3fc; margin-top:4px;"><strong>มิเตอร์:</strong> ${escapeHtml(meterLines.join(" | "))}</div>` : ""}
        ${p.note ? `<div style="color:#cbd5e1; margin-top:4px;"><strong>หมายเหตุ:</strong> ${escapeHtml(p.note)}</div>` : ""}
      </div>
      <div class="pole-popup-actions">
        <button type="button" class="btn-outline btn-sm" data-action="focusPoleOnMap" data-id="${p.id}">จัดกึ่งกลาง</button>
        <button type="button" class="btn-primary btn-sm" data-action="editPole" data-id="${p.id}">แก้ไขจุดนี้</button>
      </div>
    `;
    popup.classList.remove("hidden");
  }

  function closePolePopup() {
    activePopupPoleId = null;
    const popup = document.getElementById("poleMapPopup");
    if (popup) popup.classList.add("hidden");
    drawMap();
  }

  function drawMap() {
    const canvas = document.getElementById("surveyMap");
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = rect.height || 450;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const w = canvas.width;
    const h = canvas.height;
    const { pxPerDegLng, pxPerDegLat } = getPxPerDegLatForZoom(zoomFloat);

    ctx.fillStyle = "#0b1320";
    ctx.fillRect(0, 0, w, h);

    const activeSrc = MAP_SOURCES[mapSourceIndex] || MAP_SOURCES[0];

    if (isSatellite) {
      const tileZ = Math.max(13, Math.min(19, Math.round(zoomFloat)));
      const topLeft = canvasToLatLng(0, 0, w, h, zoomFloat);
      const bottomRight = canvasToLatLng(w, h, w, h, zoomFloat);

      const minTx = Math.floor(lon2tile(topLeft.lng, tileZ));
      const maxTx = Math.floor(lon2tile(bottomRight.lng, tileZ));
      const minTy = Math.floor(lat2tile(topLeft.lat, tileZ));
      const maxTy = Math.floor(lat2tile(bottomRight.lat, tileZ));

      for (let tx = minTx; tx <= maxTx; tx++) {
        for (let ty = minTy; ty <= maxTy; ty++) {
          const tLat1 = tile2lat(ty, tileZ);
          const tLng1 = tile2lon(tx, tileZ);
          const tLat2 = tile2lat(ty + 1, tileZ);
          const tLng2 = tile2lon(tx + 1, tileZ);

          const p1 = latLngToCanvas(tLat1, tLng1, w, h, zoomFloat);
          const p2 = latLngToCanvas(tLat2, tLng2, w, h, zoomFloat);
          drawTileWithFallback(ctx, activeSrc.id, tx, ty, tileZ, p1, p2);
        }
      }
    } else {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
      ctx.lineWidth = 1;
      const step = Math.max(24, Math.min(140, 64 * Math.pow(2, zoomFloat - 18)));
      const offsetX = ((w / 2 - mapCenter.lng * pxPerDegLng) % step + step) % step;
      const offsetY = ((h / 2 + mapCenter.lat * pxPerDegLat) % step + step) % step;

      for (let x = offsetX; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = offsetY; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const rStart = latLngToCanvas(7.7354, 100.0055, w, h, zoomFloat);
      const rMid = latLngToCanvas(7.7360, 100.0090, w, h, zoomFloat);
      const rEnd = latLngToCanvas(7.7364, 100.0130, w, h, zoomFloat);
      const roadW = Math.max(6, 18 * Math.pow(2, zoomFloat - 18));

      ctx.strokeStyle = "#263349";
      ctx.lineWidth = roadW;
      ctx.beginPath();
      ctx.moveTo(rStart.x, rStart.y);
      ctx.quadraticCurveTo(rMid.x, rMid.y, rEnd.x, rEnd.y);
      ctx.stroke();

      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = Math.max(1.5, 2.5);
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(rStart.x, rStart.y);
      ctx.quadraticCurveTo(rMid.x, rMid.y, rEnd.x, rEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const proj = getActiveProject();
    const poles = proj ? proj.poles : [];

    if (poles.length > 1) {
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      poles.forEach((p, i) => {
        const pt = latLngToCanvas(p.lat, p.lng, w, h, zoomFloat);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      for (let i = 1; i < poles.length; i++) {
        const prev = poles[i - 1];
        const curr = poles[i];
        const p1 = latLngToCanvas(prev.lat, prev.lng, w, h, zoomFloat);
        const p2 = latLngToCanvas(curr.lat, curr.lng, w, h, zoomFloat);
        const dMeters = calcDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
        drawDistanceLabelOnCanvas(
          ctx,
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2,
          `${dMeters.toFixed(1)} ม.`,
          "rgba(46, 16, 101, 0.92)",
          "#c084fc",
          "#f3e8ff"
        );
      }
    }

    const selPt = latLngToCanvas(selectedCoord.lat, selectedCoord.lng, w, h, zoomFloat);

    const ref = getReferencePoleForPin(poles, selectedCoord);
    if (ref) {
      const refPt = latLngToCanvas(ref.pole.lat, ref.pole.lng, w, h, zoomFloat);
      ctx.save();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(refPt.x, refPt.y);
      ctx.lineTo(selPt.x, selPt.y);
      ctx.stroke();
      ctx.restore();

      const midX = (refPt.x + selPt.x) / 2;
      const midY = (refPt.y + selPt.y) / 2 - 14;
      drawDistanceLabelOnCanvas(
        ctx,
        midX,
        midY,
        `${ref.pole.code} → หมุด: ${formatDistance(ref.distanceMeters)}`,
        "rgba(9, 13, 22, 0.94)",
        "#fbbf24",
        "#fde047"
      );
    }

    poles.forEach(p => {
      const pt = latLngToCanvas(p.lat, p.lng, w, h, zoomFloat);
      let color = "#22c55e";
      if (p.workType === "REMOVE") color = "#ef4444";
      else if (p.workType === "SWAP") color = "#3b82f6";
      else if (p.workType === "SWAP_HEAD") color = "#c084fc";

      const hasTr = p.installSpec && p.installSpec.hasTransformer;
      const isSelectedPopup = p.id === activePopupPoleId;

      if (isSelectedPopup) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (hasTr ? 16 : 13), 0, Math.PI * 2);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, hasTr ? 11 : 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = hasTr ? "#fbbf24" : "#ffffff";
      ctx.stroke();

      ctx.font = "700 13px 'Sarabun', sans-serif";
      const label = hasTr ? `${p.code} [TR ${p.installSpec.trSize}]` : p.code;
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(9, 13, 22, 0.82)";
      ctx.fillRect(pt.x + 11, pt.y - 10, textW + 8, 18);
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(label, pt.x + 15, pt.y + 4);
    });

    if (currentUserLocation) {
      const uPt = latLngToCanvas(currentUserLocation.lat, currentUserLocation.lng, w, h, zoomFloat);
      const degPerMeterLat = 1 / 111320;
      const haloRadiusPx = Math.max(16, Math.min(75, (currentUserLocation.accuracy || 15) * degPerMeterLat * pxPerDegLat));

      ctx.beginPath();
      ctx.arc(uPt.x, uPt.y, haloRadiusPx, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(uPt.x, uPt.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.font = "700 12px 'Sarabun', sans-serif";
      ctx.fillStyle = "#bae6fd";
      ctx.fillText("ตำแหน่งปัจจุบัน", uPt.x + 12, uPt.y + 4);
    }

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(selPt.x, selPt.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(selPt.x - 18, selPt.y); ctx.lineTo(selPt.x + 18, selPt.y);
    ctx.moveTo(selPt.x, selPt.y - 18); ctx.lineTo(selPt.x, selPt.y + 18);
    ctx.stroke();
  }

  function initCanvasPanZoomAndClick() {
    const wrapper = document.getElementById("mapWrapper");
    const canvas = document.getElementById("surveyMap");
    const btnZoomIn = document.getElementById("btnZoomIn");
    const btnZoomOut = document.getElementById("btnZoomOut");

    let isDragging = false;
    let movedDistance = 0;
    let lastX = 0;
    let lastY = 0;
    let initialPinchDist = 0;
    let initialPinchZoom = zoomFloat;

    btnZoomIn.addEventListener("click", (e) => {
      e.stopPropagation();
      applyZoomDelta(0.5);
    });

    btnZoomOut.addEventListener("click", (e) => {
      e.stopPropagation();
      applyZoomDelta(-0.5);
    });

    function onPointerDown(clientX, clientY) {
      isDragging = true;
      movedDistance = 0;
      lastX = clientX;
      lastY = clientY;
      canvas.classList.add("dragging");
    }

    function onPointerMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - lastX;
      const dy = clientY - lastY;
      movedDistance += Math.hypot(dx, dy);
      lastX = clientX;
      lastY = clientY;

      const { pxPerDegLng, pxPerDegLat } = getPxPerDegLatForZoom(zoomFloat);
      mapCenter.lng -= dx / pxPerDegLng;
      mapCenter.lat += dy / pxPerDegLat;
      drawMap();
    }

    function onPointerUp(clientX, clientY) {
      if (!isDragging) return;
      isDragging = false;
      canvas.classList.remove("dragging");

      if (movedDistance < 6) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const hit = findHitPoleAtPixel(x, y, canvas.width, canvas.height);
        if (hit) {
          activePopupPoleId = hit.pole.id;
          renderPolePopup();
          drawMap();
        } else {
          closePolePopup();
          const pt = canvasToLatLng(x, y, canvas.width, canvas.height, zoomFloat);
          setSelectedCoord(pt.lat, pt.lng, false);
        }
      }
    }

    canvas.addEventListener("mousedown", (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener("mouseup", (e) => onPointerUp(e.clientX, e.clientY));

    wrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const step = e.deltaY < 0 ? 0.5 : -0.5;
      applyZoomDelta(step, anchor);
    }, { passive: false });

    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchZoom = zoomFloat;
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (isDragging && e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const zoomOffset = Math.log2(dist / initialPinchDist) * 1.4;
        setZoomAbsolute(initialPinchZoom + zoomOffset);
      }
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      if (isDragging && e.changedTouches.length > 0) {
        onPointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      if (e.touches.length < 2) {
        initialPinchDist = 0;
      }
    });

    window.addEventListener("resize", drawMap);
  }

  // 3. Project, Pole, BOM & CSV Logic
  function getActiveProject() {
    let proj = appState.projects.find(p => p.id === appState.activeProjectId);
    if (!proj && appState.projects.length > 0) {
      proj = appState.projects[0];
      appState.activeProjectId = proj.id;
    }
    return proj;
  }

  function renderProjectUI() {
    const select = document.getElementById("projectSelect");
    select.innerHTML = appState.projects.map(p =>
      `<option value="${p.id}" ${p.id === appState.activeProjectId ? "selected" : ""}>${escapeHtml(p.name)}</option>`
    ).join("");

    const proj = getActiveProject();
    const metaBar = document.getElementById("projectMetaBar");
    if (!proj) {
      metaBar.innerHTML = "<span>ยังไม่มีโปรเจค กรุณากดเปิดโปรเจคใหม่</span>";
      return;
    }

    metaBar.innerHTML = `
      <span>WBS: <strong>${escapeHtml(proj.wbs || "-")}</strong></span>
      <span>พื้นที่: <strong>${escapeHtml(proj.area || "-")}</strong></span>
      <span>ผู้สำรวจ: <strong>${escapeHtml(proj.surveyor || "-")}</strong></span>
    `;

    const ls = proj.lineSummary || {
      lvRemSystem: "", lvRemDist: "", lvRemUnit: "เมตร",
      lvInsSystem: "", lvInsDist: "", lvInsUnit: "เมตร",
      hvRemSystem: "", hvRemDist: "", hvRemUnit: "เมตร",
      hvInsSystem: "", hvInsDist: "", hvInsUnit: "เมตร"
    };

    document.getElementById("lvRemSystem").value = ls.lvRemSystem || "";
    document.getElementById("lvRemDist").value = ls.lvRemDist || "";
    document.getElementById("lvRemUnit").value = ls.lvRemUnit || "เมตร";
    document.getElementById("lvRemDistWrap").classList.toggle("hidden", !ls.lvRemSystem);

    document.getElementById("lvInsSystem").value = ls.lvInsSystem || "";
    document.getElementById("lvInsDist").value = ls.lvInsDist || "";
    document.getElementById("lvInsUnit").value = ls.lvInsUnit || "เมตร";
    document.getElementById("lvInsDistWrap").classList.toggle("hidden", !ls.lvInsSystem);

    document.getElementById("hvRemSystem").value = ls.hvRemSystem || "";
    document.getElementById("hvRemDist").value = ls.hvRemDist || "";
    document.getElementById("hvRemUnit").value = ls.hvRemUnit || "เมตร";
    document.getElementById("hvRemDistWrap").classList.toggle("hidden", !ls.hvRemSystem);

    document.getElementById("hvInsSystem").value = ls.hvInsSystem || "";
    document.getElementById("hvInsDist").value = ls.hvInsDist || "";
    document.getElementById("hvInsUnit").value = ls.hvInsUnit || "เมตร";
    document.getElementById("hvInsDistWrap").classList.toggle("hidden", !ls.hvInsSystem);

    const activeSrc = MAP_SOURCES[mapSourceIndex] || MAP_SOURCES[0];
    const srcBtn = document.getElementById("btnMapSource");
    if (srcBtn) srcBtn.innerHTML = `${iconHtml("satellite", 14)} แหล่งภาพ: ${activeSrc.name}`;

    const mapModeBtn = document.getElementById("btnMapMode");
    if (mapModeBtn) {
      mapModeBtn.innerHTML = isSatellite
        ? `${iconHtml("grid", 14)} โหมด: ดาวเทียม`
        : `${iconHtml("grid", 14)} โหมด: ตารางเส้น`;
    }

    updateZoomBadge();
    updateCursorCoordBadge();
    renderPolePopup();
    renderPoleList();
    renderBOM();
    drawMap();
  }

  function syncWorkIconUI(workType) {
    document.getElementById("workType").value = workType;
    document.querySelectorAll("#workIconGrid .icon-option-card").forEach(card => {
      card.classList.toggle("active", card.dataset.work === workType);
    });
    const isSwapPole = workType === "SWAP";
    document.getElementById("singleSystemWrap").classList.toggle("hidden", isSwapPole);
    document.getElementById("swapSystemWrap").classList.toggle("hidden", !isSwapPole);
  }

  function syncSwapIconUI(mode) {
    document.getElementById("swapMode").value = mode;
    document.querySelectorAll("#swapIconGrid .icon-option-card").forEach(card => {
      card.classList.toggle("active", card.dataset.mode === mode);
    });
  }

  function renderPoleList() {
    const proj = getActiveProject();
    const container = document.getElementById("poleListContainer");
    const poles = proj ? proj.poles : [];
    document.getElementById("tabPoleCount").textContent = poles.length;
    document.getElementById("poleCountBadge").textContent = `จำนวนจุดสำรวจ: ${poles.length} จุด`;

    if (poles.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">ยังไม่มีจุดสำรวจในโปรเจคนี้<br>แตะบนแผนที่หรือกด "+ เพิ่มจุดสำรวจ" เพื่อเริ่มต้น</div>`;
      return;
    }

    container.innerHTML = poles.map((p, idx) => {
      const isHeadOnly = p.workType === "SWAP_HEAD";
      let badgeHtml = "";
      if (p.workType === "NEW") badgeHtml = `<span class="badge badge-new">${iconHtml("poleNew", 13, "icon-new")} ปักเสาใหม่ (${p.singleSystem})</span>`;
      else if (p.workType === "REMOVE") badgeHtml = `<span class="badge badge-rem">${iconHtml("poleRemove", 13, "icon-rem")} รื้อถอนเสา (${p.singleSystem})</span>`;
      else if (p.workType === "SWAP_HEAD") badgeHtml = `<span class="badge badge-head">${iconHtml("poleHead", 13, "icon-head")} สับเปลี่ยนเฉพาะหัวเสา (${p.singleSystem})</span>`;
      else badgeHtml = `<span class="badge badge-swap">${iconHtml("poleSwap", 13, "icon-swap")} สับเปลี่ยนเสา (${p.swapMode.replace("_TO_", " → ")})</span>`;

      const hasTr = p.installSpec && p.installSpec.hasTransformer;
      const trBadge = hasTr ? `<span class="badge badge-tr">${iconHtml("transformer", 13, "icon-tr")} TR ${escapeHtml(p.installSpec.trSize)}</span>` : "";

      const mRem = Number(p.meterRemoveCount) || 0;
      const mIns = Number(p.meterInstallCount) || 0;
      const meterBadges = [
        mRem > 0 ? `<span class="badge badge-mtr">${iconHtml("meter", 13, "icon-lv")} รื้อมิเตอร์ ${mRem} เครื่อง</span>` : "",
        mIns > 0 ? `<span class="badge badge-mtr">${iconHtml("meter", 13, "icon-lv")} ติดมิเตอร์ ${mIns} เครื่อง</span>` : ""
      ].filter(Boolean).join(" ");

      let distBadge = "";
      if (idx > 0) {
        const prev = poles[idx - 1];
        const dMeters = calcDistanceMeters(prev.lat, prev.lng, p.lat, p.lng);
        distBadge = `<span class="badge badge-dist">${iconHtml("crosshair", 12)} ระยะห่างจาก ${escapeHtml(prev.code)}: ${formatDistance(dMeters)}</span>`;
      }

      let summaryHtml = "";
      if (p.removeSpec) {
        summaryHtml += `<div style="color:#fca5a5;"><strong>[รื้อถอน]</strong> ${formatSpecText(p.removeSpec, false, isHeadOnly)}</div>`;
      }
      if (p.installSpec) {
        summaryHtml += `<div style="color:#86efac;"><strong>[ติดตั้งใหม่]</strong> ${formatSpecText(p.installSpec, true, isHeadOnly)}</div>`;
      }

      return `
        <div class="pole-item">
          <div class="pole-item-top">
            <div>
              <strong>#${idx + 1} ${escapeHtml(p.code)}</strong> ${badgeHtml} ${trBadge} ${meterBadges} ${distBadge}
              <div style="font-size:12px; color:var(--text-muted);">Lat: ${Number(p.lat).toFixed(6)}, Lng: ${Number(p.lng).toFixed(6)}</div>
            </div>
            <div style="display:flex; gap:5px;">
              <button class="btn-outline btn-sm" data-action="editPole" data-id="${p.id}">${iconHtml("edit", 13)} แก้ไข</button>
              <button class="btn-red btn-sm" data-action="deletePole" data-id="${p.id}">${iconHtml("trash", 13)} ลบ</button>
            </div>
          </div>
          <div class="pole-details">
            ${summaryHtml}
            ${p.note ? `<div style="color:#94a3b8; margin-top:3px;">หมายเหตุ: ${escapeHtml(p.note)}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  function formatSpecText(spec, isInstall = false, isHeadOnly = false) {
    const poleLabel = isHeadOnly
      ? `เสาเดิม คอร. ${spec.poleSize} ม. (${spec.system}) [ไม่เปลี่ยนเสา]`
      : `เสา คอร. ${spec.poleSize} ม. (${spec.system})`;
    const parts = [poleLabel];

    if (isInstall && spec.concreteBase) {
      parts.push("เทคอนกรีตหุ้มโคนเสา");
    }
    if (isInstall && spec.hasStub) {
      parts.push("ติดตั้งเสาต่อม่อ (STUB)");
    }
    if (spec.hvTopList && spec.hvTopList.length) {
      parts.push("หัวเสา: " + spec.hvTopList.map(h => `${h.name} x${h.qty}`).join(", "));
    }
    if (spec.hasHotlineBailClamp) {
      if (spec.hotlineClampList && spec.hotlineClampList.length) {
        parts.push("Hotline Clamp: " + spec.hotlineClampList.map(c => `${c.name} x${c.qty}`).join(", "));
      }
      if (spec.bailClampList && spec.bailClampList.length) {
        parts.push("Bail Clamp: " + spec.bailClampList.map(c => `${c.name} x${c.qty}`).join(", "));
      }
    }
    if (spec.dropoutQty > 0) parts.push(`Dropout Fuse x${spec.dropoutQty}`);
    if (spec.tr202Qty > 0) parts.push(`TR-202 x${spec.tr202Qty}`);
    if (spec.hasTransformer) parts.push(`หม้อแปลง ${spec.trSize}`);
    if (spec.rackList && spec.rackList.length) {
      parts.push("RACK: " + spec.rackList.map(r => `${r.name} x${r.qty}`).join(", "));
    }
    if (spec.connectorList && spec.connectorList.length) {
      parts.push("CONNECTOR: " + spec.connectorList.map(c => `${c.name} x${c.qty}`).join(", "));
    }
    if (spec.gy33Qty > 0) parts.push(`GY-33 x${spec.gy33Qty}`);
    if (spec.gy02Qty > 0) parts.push(`GY-02 x${spec.gy02Qty}`);
    if (spec.hvArresterQty > 0) parts.push(`ล่อฟ้าแรงสูง x${spec.hvArresterQty}`);
    if (spec.hvGroundQty > 0) parts.push(`กราวด์แรงสูง x${spec.hvGroundQty}`);
    if (spec.lvArresterQty > 0) parts.push(`ล่อฟ้าแรงต่ำ x${spec.lvArresterQty}`);
    if (spec.lvGroundQty > 0) parts.push(`กราวด์แรงต่ำ x${spec.lvGroundQty}`);
    return parts.join(" | ");
  }

  function calculateBOM(proj) {
    const installMap = {};
    const removeMap = {};

    function addItem(targetMap, voltageLevel, category, name, unit, qty) {
      if (!qty || qty <= 0) return;
      const key = `${voltageLevel}||${category}||${name}||${unit}`;
      if (!targetMap[key]) targetMap[key] = { voltageLevel, category, name, unit, qty: 0 };
      targetMap[key].qty += Number(qty);
    }

    function processSpec(spec, targetMap, isInstall, includePole = true) {
      if (!spec) return;
      const vLevel = spec.system === "HV" ? "HV" : "LV";

      if (includePole) {
        addItem(targetMap, vLevel, "1. เสาไฟฟ้า คอร.", `เสาไฟฟ้า คอร. ขนาด ${spec.poleSize} เมตร (${spec.system})`, "ต้น", 1);
      }
      if (isInstall && spec.concreteBase) {
        addItem(targetMap, vLevel, "1. เสาไฟฟ้า คอร.", `งานเทคอนกรีตหุ้มโคนเสา (${spec.system})`, "หลุม", 1);
      }
      if (isInstall && spec.hasStub) {
        addItem(targetMap, vLevel, "1. เสาไฟฟ้า คอร.", `ติดตั้งเสาต่อม่อ (STUB) (${spec.system})`, "ต้น", 1);
      }
      (spec.hvTopList || []).forEach(h => {
        addItem(targetMap, "HV", "2. อุปกรณ์ประกอบหัวเสาแรงสูง", h.name, "ชุด", h.qty);
      });
      if (spec.hasHotlineBailClamp) {
        (spec.hotlineClampList || []).forEach(c => {
          addItem(targetMap, "HV", "2. อุปกรณ์ประกอบหัวเสาแรงสูง", c.name, "ชุด", c.qty);
        });
        (spec.bailClampList || []).forEach(c => {
          addItem(targetMap, "HV", "2. อุปกรณ์ประกอบหัวเสาแรงสูง", c.name, "ชุด", c.qty);
        });
      }
      if (spec.dropoutQty > 0) {
        addItem(targetMap, "HV", "2. อุปกรณ์ประกอบหัวเสาแรงสูง", "ชุดฟิวส์ตัดตอนแรงสูง (Dropout Fuse)", "ชุด", spec.dropoutQty);
      }
      if (spec.tr202Qty > 0) {
        addItem(targetMap, "HV", "2. อุปกรณ์ประกอบหัวเสาแรงสูง", "อุปกรณ์ป้องกันสัตว์ (TR-202)", "ชุด", spec.tr202Qty);
      }
      if (spec.hasTransformer && spec.trSize) {
        addItem(targetMap, "HV", "3. หม้อแปลงจำหน่าย", `หม้อแปลงจำหน่าย ขนาด ${spec.trSize}`, "เครื่อง", 1);
      }
      if (spec.gy33Qty > 0) {
        addItem(targetMap, "HV", "4. ชุดยึดโยงและระบบป้องกัน (HV)", "ชุดยึดโยงแรงสูง (GY-33)", "ชุด", spec.gy33Qty);
      }
      if (spec.hvArresterQty > 0) {
        addItem(targetMap, "HV", "4. ชุดยึดโยงและระบบป้องกัน (HV)", "ล่อฟ้าแรงสูง", "ชุด", spec.hvArresterQty);
      }
      if (spec.hvGroundQty > 0) {
        addItem(targetMap, "HV", "4. ชุดยึดโยงและระบบป้องกัน (HV)", "กราวด์แรงสูง", "ชุด", spec.hvGroundQty);
      }

      (spec.rackList || []).forEach(r => {
        addItem(targetMap, "LV", "5. อุปกรณ์จับยึดสายแรงต่ำ", r.name, "ชุด", r.qty);
      });
      (spec.connectorList || []).forEach(c => {
        addItem(targetMap, "LV", "5. อุปกรณ์จับยึดสายแรงต่ำ", c.name, "ชุด", c.qty);
      });
      if (spec.gy02Qty > 0) {
        addItem(targetMap, "LV", "6. ชุดยึดโยงและระบบป้องกัน (LV)", "ชุดยึดโยงแรงต่ำ (GY-02)", "ชุด", spec.gy02Qty);
      }
      if (spec.lvArresterQty > 0) {
        addItem(targetMap, "LV", "6. ชุดยึดโยงและระบบป้องกัน (LV)", "ล่อฟ้าแรงต่ำ", "ชุด", spec.lvArresterQty);
      }
      if (spec.lvGroundQty > 0) {
        addItem(targetMap, "LV", "6. ชุดยึดโยงและระบบป้องกัน (LV)", "กราวด์แรงต่ำ", "ชุด", spec.lvGroundQty);
      }
    }

    (proj.poles || []).forEach(p => {
      const includePole = p.workType !== "SWAP_HEAD";
      processSpec(p.installSpec, installMap, true, includePole);
      processSpec(p.removeSpec, removeMap, false, includePole);

      const mIns = Number(p.meterInstallCount) || 0;
      const mRem = Number(p.meterRemoveCount) || 0;
      if (mIns > 0) addItem(installMap, "LV", "7. งานมิเตอร์ (LV)", "ติดตั้งมิเตอร์", "เครื่อง", mIns);
      if (mRem > 0) addItem(removeMap, "LV", "7. งานมิเตอร์ (LV)", "รื้อถอนมิเตอร์", "เครื่อง", mRem);
    });

    const sortFn = (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    const allInstall = Object.values(installMap).sort(sortFn);
    const allRemove = Object.values(removeMap).sort(sortFn);

    return {
      installItems: allInstall,
      installHV: allInstall.filter(i => i.voltageLevel === "HV"),
      installLV: allInstall.filter(i => i.voltageLevel === "LV"),
      removeItems: allRemove,
      removeHV: allRemove.filter(i => i.voltageLevel === "HV"),
      removeLV: allRemove.filter(i => i.voltageLevel === "LV")
    };
  }

  function renderBOM() {
    const proj = getActiveProject();
    const container = document.getElementById("bomContainer");
    if (!proj) {
      container.innerHTML = "";
      return;
    }
    const bom = calculateBOM(proj);
    const ls = proj.lineSummary || {};

    let html = `
      <div style="background:#172033; border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px; color:#e2e8f0;">
        <strong>สรุประบบสายและระยะทาง:</strong><br>
        • แรงต่ำรื้อถอน: ${ls.lvRemSystem ? `${ls.lvRemSystem} (${ls.lvRemDist || 0} ${ls.lvRemUnit})` : "-"} |
        • แรงต่ำติดตั้งใหม่: ${ls.lvInsSystem ? `${ls.lvInsSystem} (${ls.lvInsDist || 0} ${ls.lvInsUnit})` : "-"}<br>
        • แรงสูงรื้อถอน: ${ls.hvRemSystem ? `${ls.hvRemSystem} (${ls.hvRemDist || 0} ${ls.hvRemUnit})` : "-"} |
        • แรงสูงติดตั้งใหม่: ${ls.hvInsSystem ? `${ls.hvInsSystem} (${ls.hvInsDist || 0} ${ls.hvInsUnit})` : "-"}
      </div>
    `;

    html += `<h4 style="margin:0 0 8px; color:#86efac;">ก. บัญชีวัสดุติดตั้งใหม่ (New Installation)</h4>`;
    html += `
      <div class="bom-voltage-group hv-group">
        <div class="bom-voltage-title">
          <span style="color:#fde047;">${iconHtml("boltHV", 16, "icon-hv")} หมวดอุปกรณ์แรงสูง (HV) — ติดตั้งใหม่</span>
          <span class="badge badge-hv">${bom.installHV.length} รายการ</span>
        </div>
        ${renderBomTable(bom.installHV, "ไม่มีรายการวัสดุแรงสูงติดตั้งใหม่")}
      </div>
      <div class="bom-voltage-group lv-group">
        <div class="bom-voltage-title">
          <span style="color:#7dd3fc;">${iconHtml("plugLV", 16, "icon-lv")} หมวดอุปกรณ์แรงต่ำ (LV) — ติดตั้งใหม่</span>
          <span class="badge badge-lv">${bom.installLV.length} รายการ</span>
        </div>
        ${renderBomTable(bom.installLV, "ไม่มีรายการวัสดุแรงต่ำติดตั้งใหม่")}
      </div>
    `;

    html += `<h4 style="margin:14px 0 8px; color:#fca5a5;">ข. บัญชีวัสดุรื้อถอนคืนคลัง (Dismantle / Return)</h4>`;
    html += `
      <div class="bom-voltage-group hv-group">
        <div class="bom-voltage-title">
          <span style="color:#fde047;">${iconHtml("boltHV", 16, "icon-hv")} หมวดอุปกรณ์แรงสูง (HV) — รื้อถอนคืนคลัง</span>
          <span class="badge badge-hv">${bom.removeHV.length} รายการ</span>
        </div>
        ${renderBomTable(bom.removeHV, "ไม่มีรายการวัสดุแรงสูงรื้อถอน")}
      </div>
      <div class="bom-voltage-group lv-group">
        <div class="bom-voltage-title">
          <span style="color:#7dd3fc;">${iconHtml("plugLV", 16, "icon-lv")} หมวดอุปกรณ์แรงต่ำ (LV) — รื้อถอนคืนคลัง</span>
          <span class="badge badge-lv">${bom.removeLV.length} รายการ</span>
        </div>
        ${renderBomTable(bom.removeLV, "ไม่มีรายการวัสดุแรงต่ำรื้อถอน")}
      </div>
    `;

    container.innerHTML = html;
  }

  function renderBomTable(items, emptyText) {
    if (!items.length) {
      return `<div style="padding:8px 10px; border:1px dashed var(--border); border-radius:6px; color:var(--text-muted); font-size:12.5px;">${emptyText}</div>`;
    }
    return `
      <table class="bom-table">
        <thead>
          <tr>
            <th style="width:38px;">ที่</th>
            <th>หมวดหมู่</th>
            <th>รายการวัสดุ / อุปกรณ์</th>
            <th class="num" style="width:68px;">จำนวน</th>
            <th style="width:62px;">หน่วย</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(it.category)}</td>
              <td>${escapeHtml(it.name)}</td>
              <td class="num"><strong>${it.qty}</strong></td>
              <td>${escapeHtml(it.unit)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function createDefaultSpec(system) {
    return {
      system: system,
      poleSize: system === "HV" ? "12.2" : "8",
      concreteBase: false,
      hasStub: false,
      hvTopList: [],
      hasHotlineBailClamp: false,
      hotlineClampList: [],
      bailClampList: [],
      dropoutQty: 0,
      tr202Qty: 0,
      hasTransformer: false,
      trSize: "160 kVA",
      rackList: [],
      connectorList: [],
      gy33Qty: 0,
      gy02Qty: 0,
      hvArresterQty: 0,
      hvGroundQty: 0,
      lvArresterQty: 0,
      lvGroundQty: 0
    };
  }

  function syncDraftSpecsWithMode() {
    const workType = document.getElementById("workType").value;
    if (workType === "NEW") {
      const sys = document.getElementById("singleSystem").value;
      if (!draftSpecs.install || draftSpecs.install.system !== sys) draftSpecs.install = createDefaultSpec(sys);
      draftSpecs.remove = null;
    } else if (workType === "REMOVE") {
      const sys = document.getElementById("singleSystem").value;
      if (!draftSpecs.remove || draftSpecs.remove.system !== sys) draftSpecs.remove = createDefaultSpec(sys);
      draftSpecs.install = null;
    } else if (workType === "SWAP_HEAD") {
      const sys = document.getElementById("singleSystem").value;
      if (!draftSpecs.remove || draftSpecs.remove.system !== sys) draftSpecs.remove = createDefaultSpec(sys);
      if (!draftSpecs.install || draftSpecs.install.system !== sys) draftSpecs.install = createDefaultSpec(sys);
      draftSpecs.install.poleSize = draftSpecs.remove.poleSize;
    } else {
      const mode = document.getElementById("swapMode").value;
      syncSwapIconUI(mode);
      const [fromSys, toSys] = mode.split("_TO_");
      if (!draftSpecs.remove || draftSpecs.remove.system !== fromSys) draftSpecs.remove = createDefaultSpec(fromSys);
      if (!draftSpecs.install || draftSpecs.install.system !== toSys) draftSpecs.install = createDefaultSpec(toSys);
    }
  }

  function hasBLHardware(spec) {
    return (spec.hvTopList || []).some(h =>
      h.name === "BL (1 Phase)" ||
      h.name === "BL (3 Phase)" ||
      h.name === "BL-AL (1 Phase)" ||
      h.name === "BL-AL (3 Phase)"
    );
  }

  function renderSpecForms(keepDraft = false) {
    if (!keepDraft) syncDraftSpecsWithMode();
    const workType = document.getElementById("workType").value;
    const isHeadOnly = workType === "SWAP_HEAD";
    const container = document.getElementById("dynamicSpecsContainer");
    let html = "";

    if (draftSpecs.remove) {
      const remTitle = isHeadOnly
        ? "รายละเอียดอุปกรณ์หัวเสาและอุปกรณ์ประกอบเดิมที่รื้อถอน"
        : "รายละเอียดเสาและอุปกรณ์เดิมที่รื้อถอน";
      html += buildSpecBlock("remove", remTitle, draftSpecs.remove, false, isHeadOnly);
    }
    if (draftSpecs.install) {
      const insTitle = isHeadOnly
        ? "รายละเอียดอุปกรณ์หัวเสาและอุปกรณ์ประกอบใหม่ที่ติดตั้ง"
        : "รายละเอียดเสาและอุปกรณ์ใหม่ที่ปักติดตั้ง";
      html += buildSpecBlock("install", insTitle, draftSpecs.install, true, isHeadOnly);
    }
    container.innerHTML = html;
  }

  function buildSpecBlock(role, title, spec, isInstall, isHeadOnly = false) {
    const isHV = spec.system === "HV";
    const poleSizes = isHV ? POLE_SIZES_HV : POLE_SIZES_LV;
    const rackOptions = getRackOptionsForPole(spec.poleSize);
    const showBLQuestions = isHV && hasBLHardware(spec);
    const showClampQuestions = isHV;
    const showConnectorBox = true;

    const hvFilter = spec._hvFilter || "ALL";
    const filteredHv = HV_TOP_HARDWARE.filter(item => {
      if (hvFilter === "1P") return item.system === "1 Phase";
      if (hvFilter === "3P") return item.system === "3 Phase";
      if (hvFilter === "INS") return item.system === "";
      return true;
    });

    const poleSelectLabel = isHeadOnly
      ? `ขนาดเสาเดิมที่ปฏิบัติงาน (ใช้อ้างอิงชนิด RACK - ไม่นับเสาในบัญชีวัสดุ)`
      : `ขนาดเสา คอร. (${isHV ? "แรงสูง" : "แรงต่ำ"}) *`;

    return `
      <div class="spec-section ${isInstall ? "install-box" : "remove-box"}">
        <div class="spec-title">${iconHtml(isHV ? "boltHV" : "plugLV", 17, isHV ? "icon-hv" : "icon-lv")} ${title} [${isHV ? "ระบบแรงสูง HV" : "ระบบแรงต่ำ LV"}]</div>
        ${isHeadOnly && !isInstall ? `
        <div class="head-only-banner">
          ℹ️ โหมดสับเปลี่ยนเฉพาะหัวเสา: ระบบจะคำนวณเฉพาะอุปกรณ์หัวเสา RACK ยึดโยง และอุปกรณ์ประกอบ (ไม่รวมเสา คอร. ในบัญชีวัสดุ)
        </div>` : ""}

        <div class="grid-2">
          <div>
            <label>${poleSelectLabel}</label>
            <select data-spec-change="poleSize" data-role="${role}">
              ${poleSizes.map(sz => `<option value="${sz}" ${spec.poleSize === sz ? "selected" : ""}>เสา คอร. ขนาด ${sz} เมตร</option>`).join("")}
            </select>
          </div>
          ${isHV ? `
          <div>
            <label>ชุดยึดโยงแรงสูง (GY-33) จำนวนชุด</label>
            <input type="number" min="0" value="${spec.gy33Qty || 0}" data-spec-input="gy33Qty" data-role="${role}" />
          </div>` : `
          <div>
            <label>ชุดยึดโยงแรงต่ำ (GY-02) จำนวนชุด</label>
            <input type="number" min="0" value="${spec.gy02Qty || 0}" data-spec-input="gy02Qty" data-role="${role}" />
          </div>`}
        </div>

        ${isInstall ? `
        <div class="concrete-check-row" style="display:flex; flex-direction:column; gap:8px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin:0; color:#fde68a;">
            <input type="checkbox" ${spec.concreteBase ? "checked" : ""} data-spec-change="concreteBase" data-role="${role}" style="width:16px; height:16px;" />
            มีการเทคอนกรีตหุ้มโคนเสาหรือไม่ (ติ๊กหากมี / ปล่อยว่างหากไม่มี)
          </label>
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin:0; color:#fde68a;">
            <input type="checkbox" ${spec.hasStub ? "checked" : ""} data-spec-change="hasStub" data-role="${role}" style="width:16px; height:16px;" />
            ติดตั้งเสาต่อม่อ (STUB) หรือไม่ (ติ๊กหากมีการติดตั้ง / ปล่อยว่างหากไม่ติดตั้ง)
          </label>
        </div>` : ""}

        ${isHV ? `
        <div style="margin-top:10px; padding:10px; background:#0f172a; border:1px solid var(--border); border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
            <label style="margin:0;">${iconHtml("poleHead", 15, "icon-hv")} อุปกรณ์ประกอบหัวเสาแรงสูง (เลือกได้หลายรายการ)</label>
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn-sm ${hvFilter === "ALL" ? "btn-primary" : "btn-outline"}" data-action="filterHvTop" data-role="${role}" data-filter="ALL">ทั้งหมด (${HV_TOP_HARDWARE.length})</button>
              <button type="button" class="btn-sm ${hvFilter === "1P" ? "btn-primary" : "btn-outline"}" data-action="filterHvTop" data-role="${role}" data-filter="1P">1 Phase</button>
              <button type="button" class="btn-sm ${hvFilter === "3P" ? "btn-primary" : "btn-outline"}" data-action="filterHvTop" data-role="${role}" data-filter="3P">3 Phase</button>
              <button type="button" class="btn-sm ${hvFilter === "INS" ? "btn-primary" : "btn-outline"}" data-action="filterHvTop" data-role="${role}" data-filter="INS">Insulator</button>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <select id="hvSelect_${role}" style="flex:1;">
              ${filteredHv.map(h => {
                const label = h.system ? `${h.type} (${h.system})` : h.type;
                return `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
              }).join("")}
            </select>
            <input type="number" id="hvQty_${role}" min="1" value="1" style="width:70px;" />
            <button type="button" class="btn-primary btn-sm" data-action="addHvTop" data-role="${role}">+ เพิ่ม</button>
          </div>
          <div class="chip-list">
            ${(spec.hvTopList || []).map((h, i) => `
              <span class="chip">${escapeHtml(h.name)} × <strong>${h.qty} ชุด</strong>
                <button type="button" data-action="removeHvTop" data-role="${role}" data-idx="${i}">✕</button>
              </span>
            `).join("")}
          </div>

          ${showBLQuestions ? `
          <div class="bl-alert-box">
            <h5>${iconHtml("boltHV", 16, "icon-hv")} พบหัวเสาชนิด BL / BL-AL — กรุณาระบุอุปกรณ์เพิ่มเติม:</h5>
            <div class="grid-2">
              <div>
                <label>ติดตั้งชุดฟิวส์ตัดตอนแรงสูง (Dropout Fuse) จำนวน (ชุด)</label>
                <input type="number" min="0" value="${spec.dropoutQty || 0}" data-spec-input="dropoutQty" data-role="${role}" />
              </div>
              <div>
                <label>ติดตั้งอุปกรณ์ป้องกันสัตว์ (TR-202) จำนวน (ชุด)</label>
                <input type="number" min="0" value="${spec.tr202Qty || 0}" data-spec-input="tr202Qty" data-role="${role}" />
              </div>
            </div>
          </div>` : ""}
        </div>

        ${isInstall ? `
        <div class="tr-box">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin:0; font-size:13.5px; color:#f3e8ff;">
            <input type="checkbox" ${spec.hasTransformer ? "checked" : ""} data-spec-change="hasTransformer" data-role="${role}" style="width:16px; height:16px;" />
            ${iconHtml("transformer", 18, "icon-tr")} ต้องการติดตั้งหม้อแปลงจำหน่ายบนเสาต้นนี้ด้วยหรือไม่?
          </label>
          ${spec.hasTransformer ? `
          <div style="margin-top:8px;">
            <label>เลือกขนาดหม้อแปลง (TR.size)</label>
            <select data-spec-change="trSize" data-role="${role}">
              ${TR_SIZES.map(sz => `<option value="${sz}" ${spec.trSize === sz ? "selected" : ""}>${sz}</option>`).join("")}
            </select>
          </div>` : ""}
        </div>` : ""}

        ${showClampQuestions ? `
        <div class="clamp-alert-box">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin:0; font-size:13.5px; color:#7dd3fc;">
            <input type="checkbox" ${spec.hasHotlineBailClamp ? "checked" : ""} data-spec-change="hasHotlineBailClamp" data-role="${role}" style="width:16px; height:16px;" />
            ${iconHtml("clamp", 17, "icon-hv")} มีการติดตั้ง HOTLINE / BAIL CLAMP หรือไม่?
          </label>
          ${spec.hasHotlineBailClamp ? `
          <div class="grid-2" style="margin-top:10px;">
            <div style="padding:9px; background:#0f172a; border:1px solid rgba(56, 189, 248, 0.35); border-radius:8px;">
              <label>เลือกรายการ HOTLINE CLAMP</label>
              <div style="display:flex; gap:6px;">
                <select id="hotlineSelect_${role}" style="flex:1;">
                  ${HOTLINE_CLAMP_OPTIONS.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join("")}
                </select>
                <input type="number" id="hotlineQty_${role}" min="1" value="1" style="width:68px;" />
                <button type="button" class="btn-blue btn-sm" data-action="addHotlineClamp" data-role="${role}">+ เพิ่ม</button>
              </div>
              <div class="chip-list">
                ${(spec.hotlineClampList || []).map((c, i) => `
                  <span class="chip" style="background:#0c4a6e; border-color:#38bdf8; color:#e0f2fe;">${escapeHtml(c.name)} × <strong>${c.qty} ชุด</strong>
                    <button type="button" data-action="removeHotlineClamp" data-role="${role}" data-idx="${i}">✕</button>
                  </span>
                `).join("")}
              </div>
            </div>

            <div style="padding:9px; background:#0f172a; border:1px solid rgba(56, 189, 248, 0.35); border-radius:8px;">
              <label>เลือกรายการ BAIL CLAMP</label>
              <div style="display:flex; gap:6px;">
                <select id="bailSelect_${role}" style="flex:1;">
                  ${BAIL_CLAMP_OPTIONS.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join("")}
                </select>
                <input type="number" id="bailQty_${role}" min="1" value="1" style="width:68px;" />
                <button type="button" class="btn-blue btn-sm" data-action="addBailClamp" data-role="${role}">+ เพิ่ม</button>
              </div>
              <div class="chip-list">
                ${(spec.bailClampList || []).map((c, i) => `
                  <span class="chip" style="background:#0c4a6e; border-color:#38bdf8; color:#e0f2fe;">${escapeHtml(c.name)} × <strong>${c.qty} ชุด</strong>
                    <button type="button" data-action="removeBailClamp" data-role="${role}" data-idx="${i}">✕</button>
                  </span>
                `).join("")}
              </div>
            </div>
          </div>` : ""}
        </div>` : ""}
        ` : ""}

        <div style="margin-top:10px; padding:10px; background:#0f172a; border:1px solid var(--border); border-radius:8px;">
          <label>${iconHtml("plugLV", 15, "icon-lv")} อุปกรณ์จับยึดสายแรงต่ำ (กรองตามเสา คอร. ขนาด ${spec.poleSize === "8" || spec.poleSize === "9" ? "8/9" : spec.poleSize} ม. อัตโนมัติ)</label>
          <div style="display:flex; gap:6px;">
            <select id="rackSelect_${role}" style="flex:1;">
              ${rackOptions.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("")}
            </select>
            <input type="number" id="rackQty_${role}" min="1" value="1" style="width:70px;" />
            <button type="button" class="btn-green btn-sm" data-action="addRack" data-role="${role}">+ เพิ่ม</button>
          </div>
          <div class="chip-list">
            ${(spec.rackList || []).map((r, i) => `
              <span class="chip" style="background:#14532d; border-color:#22c55e; color:#dcfce7;">${escapeHtml(r.name)} × <strong>${r.qty} ชุด</strong>
                <button type="button" data-action="removeRack" data-role="${role}" data-idx="${i}">✕</button>
              </span>
            `).join("")}
          </div>

          ${showConnectorBox ? `
          <div class="connector-box">
            <label style="color:#86efac;">${iconHtml("clamp", 15, "icon-new")} ระบุรายการและจำนวน CONNECTOR สำหรับงานจับยึดสายแรงต่ำ</label>
            <div style="display:flex; gap:6px;">
              <select id="connectorSelect_${role}" style="flex:1;">
                ${CONNECTOR_OPTIONS.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join("")}
              </select>
              <input type="number" id="connectorQty_${role}" min="1" value="1" style="width:70px;" />
              <button type="button" class="btn-green btn-sm" data-action="addConnector" data-role="${role}">+ เพิ่ม</button>
            </div>
            <div class="chip-list">
              ${(spec.connectorList || []).map((c, i) => `
                <span class="chip" style="background:#064e3b; border-color:#34d399; color:#d1fae5;">${escapeHtml(c.name)} × <strong>${c.qty} ชุด</strong>
                  <button type="button" data-action="removeConnector" data-role="${role}" data-idx="${i}">✕</button>
                </span>
              `).join("")}
            </div>
          </div>` : ""}
        </div>

        <div class="${isHV ? "grid-3" : "grid-2"}" style="margin-top:10px;">
          ${isHV ? `
          <div>
            <label>ชุดยึดโยงแรงต่ำ (GY-02) จำนวนชุด</label>
            <input type="number" min="0" value="${spec.gy02Qty || 0}" data-spec-input="gy02Qty" data-role="${role}" />
          </div>
          <div>
            <label>ติดตั้งล่อฟ้าแรงสูง จำนวนชุด</label>
            <input type="number" min="0" value="${spec.hvArresterQty || 0}" data-spec-input="hvArresterQty" data-role="${role}" />
          </div>
          <div>
            <label>ติดตั้งกราวด์แรงสูง จำนวนชุด</label>
            <input type="number" min="0" value="${spec.hvGroundQty || 0}" data-spec-input="hvGroundQty" data-role="${role}" />
          </div>` : `
          <div>
            <label>ล่อฟ้าแรงต่ำ จำนวนชุด</label>
            <input type="number" min="0" value="${spec.lvArresterQty || 0}" data-spec-input="lvArresterQty" data-role="${role}" />
          </div>
          <div>
            <label>กราวด์แรงต่ำ จำนวนชุด</label>
            <input type="number" min="0" value="${spec.lvGroundQty || 0}" data-spec-input="lvGroundQty" data-role="${role}" />
          </div>`}
        </div>
      </div>
    `;
  }

  function syncMeterModalUI(remCount, insCount) {
    const rVal = Math.max(0, Math.min(8, parseInt(remCount, 10) || 0));
    const iVal = Math.max(0, Math.min(8, parseInt(insCount, 10) || 0));

    const hasRem = rVal > 0;
    const hasIns = iVal > 0;

    document.getElementById("hasMeterRemove").checked = hasRem;
    document.getElementById("meterRemoveCountWrap").classList.toggle("hidden", !hasRem);
    document.getElementById("meterRemoveCount").value = String(hasRem ? rVal : 1);

    document.getElementById("hasMeterInstall").checked = hasIns;
    document.getElementById("meterInstallCountWrap").classList.toggle("hidden", !hasIns);
    document.getElementById("meterInstallCount").value = String(hasIns ? iVal : 1);
  }

  function exportCSV() {
    const proj = getActiveProject();
    if (!proj) return;
    const bom = calculateBOM(proj);
    const ls = proj.lineSummary || {};

    const rows = [
      ["โครงการ", proj.name],
      ["เลขที่ใบสั่งงาน/WBS", proj.wbs || "-"],
      ["พื้นที่/สายป้อน", proj.area || "-"],
      ["ผู้สำรวจ", proj.surveyor || "-"],
      [],
      ["สรุประบบสายและระยะทาง", "ชนิดระบบ", "ระยะทาง", "หน่วย"],
      ["ระบบแรงต่ำที่รื้อถอน", ls.lvRemSystem || "-", ls.lvRemDist || "0", ls.lvRemUnit || "เมตร"],
      ["ระบบแรงต่ำที่ติดตั้งใหม่", ls.lvInsSystem || "-", ls.lvInsDist || "0", ls.lvInsUnit || "เมตร"],
      ["ระบบแรงสูงที่รื้อถอน", ls.hvRemSystem || "-", ls.hvRemDist || "0", ls.hvRemUnit || "เมตร"],
      ["ระบบแรงสูงที่ติดตั้งใหม่", ls.hvInsSystem || "-", ls.hvInsDist || "0", ls.hvInsUnit || "เมตร"],
      [],
      ["=== หมวดอุปกรณ์แรงสูง (HV) - ติดตั้งใหม่ ==="],
      ["ประเภทบัญชี", "ระดับแรงดัน", "หมวดหมู่", "รายการวัสดุ/อุปกรณ์", "จำนวน", "หน่วย"]
    ];

    bom.installHV.forEach(it => rows.push(["ติดตั้งใหม่", "แรงสูง (HV)", it.category, it.name, it.qty, it.unit]));
    if (!bom.installHV.length) rows.push(["ติดตั้งใหม่", "แรงสูง (HV)", "-", "ไม่มีรายการวัสดุแรงสูงติดตั้งใหม่", 0, "-"]);

    rows.push([]);
    rows.push(["=== หมวดอุปกรณ์แรงต่ำ (LV) - ติดตั้งใหม่ ==="]);
    rows.push(["ประเภทบัญชี", "ระดับแรงดัน", "หมวดหมู่", "รายการวัสดุ/อุปกรณ์", "จำนวน", "หน่วย"]);
    bom.installLV.forEach(it => rows.push(["ติดตั้งใหม่", "แรงต่ำ (LV)", it.category, it.name, it.qty, it.unit]));
    if (!bom.installLV.length) rows.push(["ติดตั้งใหม่", "แรงต่ำ (LV)", "-", "ไม่มีรายการวัสดุแรงต่ำติดตั้งใหม่", 0, "-"]);

    rows.push([]);
    rows.push(["=== หมวดอุปกรณ์แรงสูง (HV) - รื้อถอนคืนคลัง ==="]);
    rows.push(["ประเภทบัญชี", "ระดับแรงดัน", "หมวดหมู่", "รายการวัสดุ/อุปกรณ์", "จำนวน", "หน่วย"]);
    bom.removeHV.forEach(it => rows.push(["รื้อถอนคืนคลัง", "แรงสูง (HV)", it.category, it.name, it.qty, it.unit]));
    if (!bom.removeHV.length) rows.push(["รื้อถอนคืนคลัง", "แรงสูง (HV)", "-", "ไม่มีรายการวัสดุแรงสูงรื้อถอน", 0, "-"]);

    rows.push([]);
    rows.push(["=== หมวดอุปกรณ์แรงต่ำ (LV) - รื้อถอนคืนคลัง ==="]);
    rows.push(["ประเภทบัญชี", "ระดับแรงดัน", "หมวดหมู่", "รายการวัสดุ/อุปกรณ์", "จำนวน", "หน่วย"]);
    bom.removeLV.forEach(it => rows.push(["รื้อถอนคืนคลัง", "แรงต่ำ (LV)", it.category, it.name, it.qty, it.unit]));
    if (!bom.removeLV.length) rows.push(["รื้อถอนคืนคลัง", "แรงต่ำ (LV)", "-", "ไม่มีรายการวัสดุแรงต่ำรื้อถอน", 0, "-"]);

    const csvContent = "\uFEFF" + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PEA_BOM_HV_LV_${(proj.wbs || proj.name).replace(/[^a-zA-Z0-9ก-๙_-]/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 4. Event Delegation
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "switchTab") {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
      document.getElementById("tab-poles").classList.toggle("hidden", tab !== "poles");
      document.getElementById("tab-bom").classList.toggle("hidden", tab !== "bom");
    }

    else if (action === "selectWorkType") {
      const workType = btn.dataset.work;
      syncWorkIconUI(workType);
      renderSpecForms(false);
    }

    else if (action === "selectSwapMode") {
      const mode = btn.dataset.mode;
      syncSwapIconUI(mode);
      renderSpecForms(false);
    }

    else if (action === "closePolePopup") {
      closePolePopup();
    }

    else if (action === "focusPoleOnMap") {
      const proj = getActiveProject();
      const pole = proj && proj.poles.find(p => p.id === btn.dataset.id);
      if (pole) {
        mapCenter = { lat: Number(pole.lat), lng: Number(pole.lng) };
        drawMap();
      }
    }

    else if (action === "cycleMapSource") {
      mapSourceIndex = (mapSourceIndex + 1) % MAP_SOURCES.length;
      const activeSrc = MAP_SOURCES[mapSourceIndex];
      btn.innerHTML = `${iconHtml("satellite", 14)} แหล่งภาพ: ${activeSrc.name}`;
      updateSatStatusLabel(`ดาวเทียม: ${activeSrc.label}`);
      drawMap();
    }

    else if (action === "toggleMapMode") {
      isSatellite = !isSatellite;
      btn.innerHTML = isSatellite
        ? `${iconHtml("grid", 14)} โหมด: ดาวเทียม`
        : `${iconHtml("grid", 14)} โหมด: ตารางเส้น`;
      drawMap();
    }

    else if (action === "resetMapView") {
      mapCenter = { lat: selectedCoord.lat, lng: selectedCoord.lng };
      zoomFloat = 18.0;
      updateZoomBadge();
      drawMap();
    }

    else if (action === "applyManualCoord") {
      const latVal = parseFloat(document.getElementById("manualLat").value);
      const lngVal = parseFloat(document.getElementById("manualLng").value);
      if (Number.isNaN(latVal) || Number.isNaN(lngVal)) {
        return alert("กรุณากรอกค่า Latitude และ Longitude ให้ถูกต้อง");
      }
      setSelectedCoord(latVal, lngVal, true);
    }

    else if (action === "getCurrentGPS") {
      locateCurrentUser(true);
    }

    else if (action === "openNewProjectModal") {
      document.getElementById("projectModalTitle").textContent = "เปิดโปรเจคงานสำรวจใหม่";
      document.getElementById("editProjectId").value = "";
      document.getElementById("projName").value = "";
      document.getElementById("projWbs").value = "";
      document.getElementById("projArea").value = "อ.ควนขนุน จ.พัทลุง";
      document.getElementById("projSurveyor").value = "";
      document.getElementById("projectModal").classList.remove("hidden");
    }

    else if (action === "openEditProjectModal") {
      const proj = getActiveProject();
      if (!proj) return;
      document.getElementById("projectModalTitle").textContent = "แก้ไขข้อมูลโปรเจค";
      document.getElementById("editProjectId").value = proj.id;
      document.getElementById("projName").value = proj.name;
      document.getElementById("projWbs").value = proj.wbs || "";
      document.getElementById("projArea").value = proj.area || "";
      document.getElementById("projSurveyor").value = proj.surveyor || "";
      document.getElementById("projectModal").classList.remove("hidden");
    }

    else if (action === "closeProjectModal") {
      document.getElementById("projectModal").classList.add("hidden");
    }

    else if (action === "saveProject") {
      const name = document.getElementById("projName").value.trim();
      if (!name) return alert("กรุณาระบุชื่อโปรเจค");
      const editId = document.getElementById("editProjectId").value;
      if (editId) {
        const proj = appState.projects.find(p => p.id === editId);
        if (proj) {
          proj.name = name;
          proj.wbs = document.getElementById("projWbs").value.trim();
          proj.area = document.getElementById("projArea").value.trim();
          proj.surveyor = document.getElementById("projSurveyor").value.trim();
        }
      } else {
        const newId = "proj-" + Date.now();
        appState.projects.push({
          id: newId,
          name,
          wbs: document.getElementById("projWbs").value.trim(),
          area: document.getElementById("projArea").value.trim(),
          surveyor: document.getElementById("projSurveyor").value.trim(),
          lineSummary: {
            lvRemSystem: "", lvRemDist: "", lvRemUnit: "เมตร",
            lvInsSystem: "", lvInsDist: "", lvInsUnit: "เมตร",
            hvRemSystem: "", hvRemDist: "", hvRemUnit: "เมตร",
            hvInsSystem: "", hvInsDist: "", hvInsUnit: "เมตร"
          },
          poles: []
        });
        appState.activeProjectId = newId;
      }
      saveData(appState);
      document.getElementById("projectModal").classList.add("hidden");
      renderProjectUI();
    }

    else if (action === "deleteCurrentProject") {
      if (appState.projects.length <= 1) return alert("ต้องมีโปรเจคอย่างน้อย 1 โปรเจคในระบบ");
      const proj = getActiveProject();
      if (!confirm(`ยืนยันการลบโปรเจค "${proj.name}" ?`)) return;
      appState.projects = appState.projects.filter(p => p.id !== proj.id);
      appState.activeProjectId = appState.projects[0].id;
      if (activePopupPoleId && !getActiveProject().poles.some(p => p.id === activePopupPoleId)) {
        activePopupPoleId = null;
      }
      saveData(appState);
      renderProjectUI();
    }

    else if (action === "openAddPoleModal") {
      const proj = getActiveProject();
      if (!proj) return;
      document.getElementById("poleModalTitle").textContent = "บันทึกข้อมูลจุดสำรวจใหม่";
      document.getElementById("editPoleId").value = "";
      document.getElementById("poleCode").value = `P-${String(proj.poles.length + 1).padStart(2, "0")}`;
      document.getElementById("poleLat").value = selectedCoord.lat.toFixed(6);
      document.getElementById("poleLng").value = selectedCoord.lng.toFixed(6);
      document.getElementById("singleSystem").value = "LV";
      syncWorkIconUI("NEW");
      syncSwapIconUI("LV_TO_LV");
      syncMeterModalUI(0, 0);
      document.getElementById("poleNote").value = "";
      draftSpecs = { install: createDefaultSpec("LV"), remove: null };
      renderSpecForms(true);
      document.getElementById("poleModal").classList.remove("hidden");
    }

    else if (action === "editPole") {
      const proj = getActiveProject();
      const pole = proj.poles.find(p => p.id === btn.dataset.id);
      if (!pole) return;
      document.getElementById("poleModalTitle").textContent = `แก้ไขจุดสำรวจ (${pole.code})`;
      document.getElementById("editPoleId").value = pole.id;
      document.getElementById("poleCode").value = pole.code;
      document.getElementById("poleLat").value = Number(pole.lat).toFixed(6);
      document.getElementById("poleLng").value = Number(pole.lng).toFixed(6);
      document.getElementById("singleSystem").value = pole.singleSystem || "LV";
      syncWorkIconUI(pole.workType || "NEW");
      syncSwapIconUI(pole.swapMode || "LV_TO_LV");
      syncMeterModalUI(pole.meterRemoveCount || 0, pole.meterInstallCount || 0);
      document.getElementById("poleNote").value = pole.note || "";

      draftSpecs = {
        install: pole.installSpec ? JSON.parse(JSON.stringify(pole.installSpec)) : null,
        remove: pole.removeSpec ? JSON.parse(JSON.stringify(pole.removeSpec)) : null
      };
      ["install", "remove"].forEach(r => {
        if (draftSpecs[r]) {
          draftSpecs[r].hasStub = Boolean(draftSpecs[r].hasStub);
          draftSpecs[r].hvArresterQty = Number(draftSpecs[r].hvArresterQty) || 0;
          draftSpecs[r].hvGroundQty = Number(draftSpecs[r].hvGroundQty) || 0;
          draftSpecs[r].hasHotlineBailClamp = Boolean(draftSpecs[r].hasHotlineBailClamp);
          draftSpecs[r].hotlineClampList = draftSpecs[r].hotlineClampList || [];
          draftSpecs[r].bailClampList = draftSpecs[r].bailClampList || [];
          draftSpecs[r].connectorList = draftSpecs[r].connectorList || [];
        }
      });
      renderSpecForms(true);
      document.getElementById("poleModal").classList.remove("hidden");
    }

    else if (action === "deletePole") {
      const proj = getActiveProject();
      if (!confirm("ยืนยันการลบจุดสำรวจนี้?")) return;
      proj.poles = proj.poles.filter(p => p.id !== btn.dataset.id);
      if (activePopupPoleId === btn.dataset.id) {
        activePopupPoleId = null;
      }
      saveData(appState);
      renderProjectUI();
    }

    else if (action === "closePoleModal") {
      document.getElementById("poleModal").classList.add("hidden");
    }

    else if (action === "filterHvTop") {
      const role = btn.dataset.role;
      draftSpecs[role]._hvFilter = btn.dataset.filter;
      renderSpecForms(true);
    }

    else if (action === "addHvTop") {
      const role = btn.dataset.role;
      const name = document.getElementById(`hvSelect_${role}`).value;
      const qty = Math.max(1, parseInt(document.getElementById(`hvQty_${role}`).value, 10) || 1);
      const list = draftSpecs[role].hvTopList;
      const existing = list.find(i => i.name === name);
      if (existing) existing.qty += qty;
      else list.push({ name, qty });
      renderSpecForms(true);
    }

    else if (action === "removeHvTop") {
      const role = btn.dataset.role;
      const idx = parseInt(btn.dataset.idx, 10);
      draftSpecs[role].hvTopList.splice(idx, 1);
      if (!hasBLHardware(draftSpecs[role])) {
        draftSpecs[role].dropoutQty = 0;
        draftSpecs[role].tr202Qty = 0;
      }
      renderSpecForms(true);
    }

    else if (action === "addHotlineClamp") {
      const role = btn.dataset.role;
      const name = document.getElementById(`hotlineSelect_${role}`).value;
      const qty = Math.max(1, parseInt(document.getElementById(`hotlineQty_${role}`).value, 10) || 1);
      if (!draftSpecs[role].hotlineClampList) draftSpecs[role].hotlineClampList = [];
      const list = draftSpecs[role].hotlineClampList;
      const existing = list.find(i => i.name === name);
      if (existing) existing.qty += qty;
      else list.push({ name, qty });
      renderSpecForms(true);
    }

    else if (action === "removeHotlineClamp") {
      const role = btn.dataset.role;
      const idx = parseInt(btn.dataset.idx, 10);
      draftSpecs[role].hotlineClampList.splice(idx, 1);
      renderSpecForms(true);
    }

    else if (action === "addBailClamp") {
      const role = btn.dataset.role;
      const name = document.getElementById(`bailSelect_${role}`).value;
      const qty = Math.max(1, parseInt(document.getElementById(`bailQty_${role}`).value, 10) || 1);
      if (!draftSpecs[role].bailClampList) draftSpecs[role].bailClampList = [];
      const list = draftSpecs[role].bailClampList;
      const existing = list.find(i => i.name === name);
      if (existing) existing.qty += qty;
      else list.push({ name, qty });
      renderSpecForms(true);
    }

    else if (action === "removeBailClamp") {
      const role = btn.dataset.role;
      const idx = parseInt(btn.dataset.idx, 10);
      draftSpecs[role].bailClampList.splice(idx, 1);
      renderSpecForms(true);
    }

    else if (action === "addRack") {
      const role = btn.dataset.role;
      const name = document.getElementById(`rackSelect_${role}`).value;
      const qty = Math.max(1, parseInt(document.getElementById(`rackQty_${role}`).value, 10) || 1);
      const list = draftSpecs[role].rackList;
      const existing = list.find(i => i.name === name);
      if (existing) existing.qty += qty;
      else list.push({ name, qty });
      renderSpecForms(true);
    }

    else if (action === "removeRack") {
      const role = btn.dataset.role;
      const idx = parseInt(btn.dataset.idx, 10);
      draftSpecs[role].rackList.splice(idx, 1);
      renderSpecForms(true);
    }

    else if (action === "addConnector") {
      const role = btn.dataset.role;
      const name = document.getElementById(`connectorSelect_${role}`).value;
      const qty = Math.max(1, parseInt(document.getElementById(`connectorQty_${role}`).value, 10) || 1);
      if (!draftSpecs[role].connectorList) draftSpecs[role].connectorList = [];
      const list = draftSpecs[role].connectorList;
      const existing = list.find(i => i.name === name);
      if (existing) existing.qty += qty;
      else list.push({ name, qty });
      renderSpecForms(true);
    }

    else if (action === "removeConnector") {
      const role = btn.dataset.role;
      const idx = parseInt(btn.dataset.idx, 10);
      draftSpecs[role].connectorList.splice(idx, 1);
      renderSpecForms(true);
    }

    else if (action === "savePole") {
      const proj = getActiveProject();
      const code = document.getElementById("poleCode").value.trim();
      if (!code) return alert("กรุณาระบุรหัสจุด / เบอร์เสา");

      const latVal = parseFloat(document.getElementById("poleLat").value);
      const lngVal = parseFloat(document.getElementById("poleLng").value);
      const finalLat = Number.isNaN(latVal) ? selectedCoord.lat : latVal;
      const finalLng = Number.isNaN(lngVal) ? selectedCoord.lng : lngVal;

      const hasRemM = document.getElementById("hasMeterRemove").checked;
      const hasInsM = document.getElementById("hasMeterInstall").checked;
      const meterRemoveCount = hasRemM ? (parseInt(document.getElementById("meterRemoveCount").value, 10) || 1) : 0;
      const meterInstallCount = hasInsM ? (parseInt(document.getElementById("meterInstallCount").value, 10) || 1) : 0;

      const poleData = {
        id: document.getElementById("editPoleId").value || ("pole-" + Date.now()),
        code,
        lat: finalLat,
        lng: finalLng,
        workType: document.getElementById("workType").value,
        singleSystem: document.getElementById("singleSystem").value,
        swapMode: document.getElementById("swapMode").value,
        meterRemoveCount,
        meterInstallCount,
        note: document.getElementById("poleNote").value.trim(),
        installSpec: draftSpecs.install ? JSON.parse(JSON.stringify(draftSpecs.install)) : null,
        removeSpec: draftSpecs.remove ? JSON.parse(JSON.stringify(draftSpecs.remove)) : null
      };

      const existingIdx = proj.poles.findIndex(p => p.id === poleData.id);
      if (existingIdx >= 0) proj.poles[existingIdx] = poleData;
      else proj.poles.push(poleData);

      if (activePopupPoleId === poleData.id) {
        renderPolePopup();
      }
      setSelectedCoord(finalLat, finalLng, false);
      saveData(appState);
      document.getElementById("poleModal").classList.add("hidden");
      renderProjectUI();
    }

    else if (action === "exportCSV") {
      exportCSV();
    }

    else if (action === "printReport") {
      window.print();
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;

    if (el.dataset.change === "switchProject") {
      appState.activeProjectId = el.value;
      activePopupPoleId = null;
      saveData(appState);
      renderProjectUI();
    }

    else if (el.dataset.change === "renderSpecForms") {
      renderSpecForms(false);
    }

    else if (el.dataset.change === "onMeterToggle") {
      const remChecked = document.getElementById("hasMeterRemove").checked;
      const insChecked = document.getElementById("hasMeterInstall").checked;
      document.getElementById("meterRemoveCountWrap").classList.toggle("hidden", !remChecked);
      document.getElementById("meterInstallCountWrap").classList.toggle("hidden", !insChecked);
    }

    else if (el.dataset.specChange) {
      const role = el.dataset.role;
      const field = el.dataset.specChange;
      if (field === "hasTransformer") {
        draftSpecs[role].hasTransformer = el.checked;
        renderSpecForms(true);
      } else if (field === "hasHotlineBailClamp") {
        draftSpecs[role].hasHotlineBailClamp = el.checked;
        if (!el.checked) {
          draftSpecs[role].hotlineClampList = [];
          draftSpecs[role].bailClampList = [];
        }
        renderSpecForms(true);
      } else if (field === "concreteBase") {
        draftSpecs[role].concreteBase = el.checked;
      } else if (field === "hasStub") {
        draftSpecs[role].hasStub = el.checked;
      } else if (field === "poleSize") {
        draftSpecs[role].poleSize = el.value;
        draftSpecs[role].rackList = [];
        if (document.getElementById("workType").value === "SWAP_HEAD") {
          const otherRole = role === "remove" ? "install" : "remove";
          if (draftSpecs[otherRole]) {
            draftSpecs[otherRole].poleSize = el.value;
            draftSpecs[otherRole].rackList = [];
          }
        }
        renderSpecForms(true);
      } else {
        draftSpecs[role][field] = el.value;
      }
    }

    else if (el.dataset.change === "updateLineSummary") {
      saveLineSummaryFromUI();
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.specInput) {
      const role = el.dataset.role;
      const field = el.dataset.specInput;
      draftSpecs[role][field] = Math.max(0, parseInt(el.value, 10) || 0);
    } else if (el.dataset.input === "updateLineSummary") {
      saveLineSummaryFromUI();
    }
  });

  function saveLineSummaryFromUI() {
    const proj = getActiveProject();
    if (!proj) return;
    proj.lineSummary = {
      lvRemSystem: document.getElementById("lvRemSystem").value,
      lvRemDist: document.getElementById("lvRemDist").value,
      lvRemUnit: document.getElementById("lvRemUnit").value,
      lvInsSystem: document.getElementById("lvInsSystem").value,
      lvInsDist: document.getElementById("lvInsDist").value,
      lvInsUnit: document.getElementById("lvInsUnit").value,
      hvRemSystem: document.getElementById("hvRemSystem").value,
      hvRemDist: document.getElementById("hvRemDist").value,
      hvRemUnit: document.getElementById("hvRemUnit").value,
      hvInsSystem: document.getElementById("hvInsSystem").value,
      hvInsDist: document.getElementById("hvInsDist").value,
      hvInsUnit: document.getElementById("hvInsUnit").value
    };
    document.getElementById("lvRemDistWrap").classList.toggle("hidden", !proj.lineSummary.lvRemSystem);
    document.getElementById("lvInsDistWrap").classList.toggle("hidden", !proj.lineSummary.lvInsSystem);
    document.getElementById("hvRemDistWrap").classList.toggle("hidden", !proj.lineSummary.hvRemSystem);
    document.getElementById("hvInsDistWrap").classList.toggle("hidden", !proj.lineSummary.hvInsSystem);
    saveData(appState);
    renderBOM();
  }

  function boot() {
    hydrateIcons(document);
    initCanvasPanZoomAndClick();
    renderProjectUI();
    locateCurrentUser(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();