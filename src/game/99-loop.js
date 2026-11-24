/* =====================================================================
   الحلقة الرئيسية
   ===================================================================== */
const gameClock = new THREE.Clock();

function loop() {
  requestAnimationFrame(loop);
  try {
    const wallDt=gameClock.getDelta();
    const dt = Math.min(wallDt, .25);
    seaUniforms.uT.value += dt;
    document.body.classList.toggle('playing', G.state === 'play');

    const simulated=runFixedSimulation(dt,G.state==='play',step=>{
      physics(step);
      return G.state==='play';
    });
    if(G.state==='play'){
      updateMission(simulated||dt);
      updateStreetCadence(simulated);
      updateTaxiVisual(dt);
      G.hudT+=simulated;
      if(G.hudT>.1){G.hudT=0;updateHUD();drawMinimap();}
    }

    // صوت الموتور والبيئة مع محاكاة 5 سرعات ناقل حركة
    if (engGain && AC) {
      const sp = Math.abs(car.speed);
      const on = G.sound && G.state === 'play' && !window.__deferAudio;
      const c = CARS[G.carIdx] || CARS[0];
      const maxSp = Math.max(15, typeof MAXSPEED !== 'undefined' ? MAXSPEED : 45);
      const ratio = clamp(sp / maxSp, 0, 1.15);
      // منحنى RPM يحاكي تعشيق 5 غيارات للسيارة
      const gear = Math.min(4, Math.floor(ratio * 4.5));
      const gearLow = gear / 4.5;
      const gearSpan = 1 / 4.5;
      const rpm = sp < 0.8 ? 0.14 : clamp(0.24 + ((ratio - gearLow) / gearSpan) * 0.72 + gear * 0.04, 0.18, 1.0);
      const baseHz = c.id === 'sport370' || c.id === 'roadster' ? 42 : c.body === 'micro' ? 32 : 36;
      const maxHz = c.id === 'sport370' || c.id === 'roadster' ? 168 : c.body === 'micro' ? 115 : 138;
      const throttle = (keys.KeyW || keys.ArrowUp || touch.gas) ? 1 : 0;
      const engHz = baseHz + rpm * (maxHz - baseHz) + throttle * 6;

      // موازنة ديناميكية للأصوات (Audio Ducking) عند تشغيل أغاني الكاسيت
      const musicActive = typeof isMusicPlaying === 'function' && isMusicPlaying();
      const duckRain = musicActive ? 0.38 : 1.0;
      const duckEngine = musicActive ? 0.65 : 1.0;
      const duckWind = musicActive ? 0.50 : 1.0;

      engGain.gain.setTargetAtTime(on ? (.026 + rpm * .048 + throttle * .018) * duckEngine : 0, AC.currentTime, .09);
      engOsc.frequency.setTargetAtTime(engHz, AC.currentTime, .06);
      if (typeof engOsc2 !== 'undefined' && engOsc2) engOsc2.frequency.setTargetAtTime(engHz * 2, AC.currentTime, .06);
      if (typeof engSub !== 'undefined' && engSub) engSub.frequency.setTargetAtTime(engHz * 0.5, AC.currentTime, .06);
      if (typeof engFilter !== 'undefined' && engFilter) engFilter.frequency.setTargetAtTime(220 + rpm * 540 + throttle * 240, AC.currentTime, .08);
      if (typeof engRumbleGain !== 'undefined' && engRumbleGain) engRumbleGain.gain.setTargetAtTime(on ? (.018 + rpm * .024 + throttle * .014) * duckEngine : 0, AC.currentTime, .09);

      windGain.gain.setTargetAtTime(on ? (Math.pow(clamp(sp / maxSp, 0, 1), 1.4) * .048) * duckWind : 0, AC.currentTime, .2);
      const brakingInput = keys.KeyS || keys.ArrowDown || touch.brk || keys.Space || touch.hb;
      const drifting = Math.abs(car.latVel || 0) > 4.5 && sp > 7;
      skidGain.gain.setTargetAtTime(on && ((keys.Space || touch.hb) && sp > 8 || drifting) ? .062 : 0, AC.currentTime, .07);
      if (brakeGain) {
        const brakePressure = car.brakePedal || (brakingInput ? 1 : 0);
        brakeGain.gain.setTargetAtTime(on && brakingInput && sp > 3 ? .014 + Math.min(.036, brakePressure * .036) : 0, AC.currentTime, .055);
      }
      if (seaGain) {
        const nearSea = clamp(1 - (car.z - 12) / 40, 0, 1);
        const wave = .5 + .5 * Math.sin(performance.now() * .0006);
        seaGain.gain.setTargetAtTime(0, AC.currentTime, .25);
      }
      if (rainGain) {
        rainGain.gain.setTargetAtTime(on ? rainBlend * .026 * duckRain : 0, AC.currentTime, .25);
      }
    }

    if (!window.__deferAudio) { updateEmergencyAudio(); syncRecordedRadio(); }
    if (G.state === 'pause') return;
    updateCamera(dt);
    updateMarkers(dt);

    // السما والبحر يتبعوا اللاعب
    sky.position.set(camera.position.x, 0, camera.position.z);
    clouds.position.x = camera.position.x * .8;
    sea.position.x = camera.position.x;

    updateDayNight(wallDt);
    updateWeather(wallDt);

    renderDriverPhone();
    updateArchitectureDetails();
    if(typeof updateVillageRoads==='function')updateVillageRoads(dt);
    if(typeof updateRailwayCrossing==='function')updateRailwayCrossing(dt);
    updateSceneBudgets(dt);
    if(!window.__deferRender&&G.state!=='cinematic'&&G.state!=='menu')renderer.render(scene, camera);
  } catch(loopErr) {
    console.error('Frame loop non-fatal error:', loopErr);
    try {
      if(!window.__deferRender&&G.state!=='cinematic'&&G.state!=='menu')renderer.render(scene, camera);
    } catch(_) {}
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (typeof applyGraphicsSettings === 'function') applyGraphicsSettings(G.graphicsQuality);
  renderer.setSize(innerWidth, innerHeight);
});

/* بداية */
if (typeof applyGraphicsSettings === 'function') applyGraphicsSettings(G.graphicsQuality);
swapTaxi(G.carIdx);
window.__game = {
  POLICE_FILMS, policeStationArrival, INFRA, infrastructureRoadPoint, updateTaxiVisual, navigationStopHeight, updateMarkers, navigationProgress, rideNavigationAim, selectDrivingSurface, renderScene:()=>{updateDayNight(0);updateArchitectureDetails();renderer.render(scene,camera)}, updateCamera, updateTrafficLights, updateHUD, drawMinimap, updatePeds, startRun, openGarage, ROAD_FURNITURE, onDrivingRoad, roadHeightAt, WALK_SURFACES,
  resumeRendering:()=>{gameClock.getDelta();loop();}, POLICE, issuePoliceCall, updatePoliceMission, finishPoliceClip, playPoliceClip, createPoliceMovie, VEHICLE_SIGNALS, updateVehicleSignals, PERFORMANCE, updateSceneBudgets, updateStreetCadence,
  POLICE_BMW, installPoliceBMW, restorePoliceBMW, selectedPoliceVehicle, selectPoliceVehicle, UPLOADED_MODELS, ensureVehicleModel, makeUploadedCarRig, ASSYUT, REAL_CITY, STREET_LIFE, WALKING_GROUPS, QASHQAI_SOURCE, installQashqai, chooseQashqaiFile,
  RIDE, makeRideOffer, acceptRideOffer, rejectRideOffer, boardRidePassenger, completeRideTrip, fleetTransaction, repairPrice, currentCarCondition, roadRoute, riderRoadStop, startDriverShift, assets: importedModels, surfaces: surfaceAssets, runFixedSimulation, resetSimulationClock, G, M, car, taxi, camera, physics, updateSuspension, updateTraffic, bumpHeightAt,
  setMusic, setStation, setTimePreset, setWeather, swapTaxi, carStats, MUSIC, getAC: () => AC,
  arrow, arrowGlow, passenger, pickupMarker, destMarker,
  BUMPS, CURB_LINES, TREES, TRAFFIC_LIGHTS, traffic, MAP, CARS, UPGRADES, WEATHERS, ACHIEVEMENTS,
  saveProgress, store,
  snapCam: () => {
    const fwd = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    camera.position.set(car.x - fwd.x * 8.2, 4.1, car.z - fwd.z * 8.2);
    camLook.set(car.x + fwd.x * 12, 1.6, car.z + fwd.z * 12);
    camera.lookAt(camLook);
  },
};
updateHUD();
setSound(G.sound);
loop();
initImportedModels().then(async()=>{await loadPoliceFilms();await restoreQashqai();updatePoliceVehicleUI();});
