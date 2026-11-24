/* Street-level Egyptian storefronts: supermarkets with shoppers, mechanic shops with parked cars, pharmacies, and cafes. */
const STREET_SHOPS = { group: new THREE.Group(), shops: [], parkedCars: [] };
if (typeof REAL_CITY !== 'undefined' && REAL_CITY.group) REAL_CITY.group.add(STREET_SHOPS.group);
else if (typeof scene !== 'undefined') scene.add(STREET_SHOPS.group);

function makeShopSignTex(title, sub, bg = '#154360', accent = '#f7c948') {
  return canvasTex(256, 64, g => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 64);
    g.strokeStyle = accent;
    g.lineWidth = 4;
    g.strokeRect(3, 3, 250, 58);
    g.fillStyle = '#ffffff';
    g.font = 'bold 22px Tahoma, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(title, 128, 30);
    g.fillStyle = accent;
    g.font = 'bold 13px Tahoma, Arial, sans-serif';
    g.fillText(sub, 128, 50);
  });
}

function initAssyutStreetShops() {
  if (typeof REAL_CITY === 'undefined' || !REAL_CITY.buildings?.length || typeof ASSYUT === 'undefined') return;
  const shopBuildings = REAL_CITY.buildings.filter(b => b && b.style !== 'mosque' && b.w >= 7 && b.d >= 6);
  const chosen = [];
  for (const b of shopBuildings) {
    if (chosen.some(c => Math.hypot(c.x - b.x, c.z - b.z) < 55)) continue;
    const yaw = b.mesh?.rotation?.y || 0;
    // Front face is local -Z; rotated by yaw around Y: world forward = (-sin(yaw), -cos(yaw))
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const frontDist = b.d / 2 + 1.45;
    const px = b.x + fx * frontDist, pz = b.z + fz * frontDist;
    if (typeof onDrivingRoad === 'function' && onDrivingRoad(px, pz, 1.8)) continue;
    const near = typeof nearestAssyutRoad === 'function' ? nearestAssyutRoad({ x: px, z: pz }) : null;
    if (!near || near.distance < near.width / 2 + 1.2 || near.distance > near.width / 2 + 6.5) continue;
    chosen.push({ b, px, pz, yaw, fx, fz });
    if (chosen.length >= 26) break;
  }

  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.65, metalness: 0.35 });
  const fridgeGlass = new THREE.MeshStandardMaterial({ color: 0xd9f2ff, emissive: 0x4ea8de, emissiveIntensity: 0.35, roughness: 0.2 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xb97a3d, roughness: 0.9 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.92 });
  const oilMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.45, metalness: 0.3 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 });

  const types = ['supermarket', 'mechanic', 'supermarket', 'pharmacy', 'cafe'];
  const supermarketNames = ['سوبر ماركت البركة', 'ماركت النيل', 'سوبر ماركت الشروق', 'أولاد رجب'];
  const mechanicNames = ['ورشة الأسطى حسن', 'ميكانيكا وكهرباء', 'مركز صيانة أسيوط', 'الرحمة للكاوتش'];

  chosen.forEach((spot, idx) => {
    const kind = types[idx % types.length];
    const rh = typeof assyutRoadHeightAt === 'function' ? assyutRoadHeightAt(spot.px, spot.pz) : 0.16;
    const gy = (rh > 0 && rh < 0.4) ? rh : 0.16;
    const g = new THREE.Group();
    g.position.set(spot.px, gy, spot.pz);
    g.rotation.y = spot.yaw;

    if (kind === 'supermarket') {
      const signTex = makeShopSignTex(supermarketNames[idx % supermarketNames.length], 'بقالة · مشروبات · 24 ساعة', '#0f4c5c', '#ffd166');
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.65, 0.12), new THREE.MeshBasicMaterial({ map: signTex }));
      sign.position.set(0, 2.75, 1.15);
      sign.rotation.y = Math.PI;
      g.add(sign);

      // ثلاجة مشروبات مضيئة + استاند بضائع
      const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.85, 0.72), darkMetal);
      fridge.position.set(-1.3, 0.92, 0.9);
      g.add(fridge);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.35), fridgeGlass);
      door.position.set(-1.3, 1.05, 0.53);
      door.rotation.y = Math.PI;
      g.add(door);

      for (const sx of [0.95, 1.65]) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.55), crateMat);
        crate.position.set(sx, 0.26, 0.8);
        crate.castShadow = true;
        g.add(crate);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.45), sx > 1.2 ? greenMat : oilMat);
        top.position.set(sx, 0.63, 0.8);
        g.add(top);
      }

      // زبائن واقفين يشترون أمام السوبر ماركت
      if (typeof makePerson === 'function' && typeof SHIRTS !== 'undefined' && typeof SKIN !== 'undefined') {
        for (let k = 0; k < 2; k++) {
          const shopper = makePerson(pick(SHIRTS), pick(SKIN), k === 0 ? 'woman' : 'adult');
          shopper.position.set(-0.2 + k * 0.85, 0, -0.15);
          shopper.rotation.y = 0.25 - k * 0.5;
          g.add(shopper);
        }
      }
    } else if (kind === 'mechanic') {
      const signTex = makeShopSignTex(mechanicNames[idx % mechanicNames.length], 'سمكرة · دوكو · عفشة وكاوتش', '#3d1c1a', '#ff9f1c');
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.68, 0.12), new THREE.MeshBasicMaterial({ map: signTex }));
      sign.position.set(0, 2.75, 1.15);
      sign.rotation.y = Math.PI;
      g.add(sign);

      // كاوتشات متراصة + برميل زيت
      for (let t = 0; t < 3; t++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.10, 8, 14), tireMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(-1.5, 0.11 + t * 0.18, 0.85);
        g.add(tire);
      }
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.82, 12), oilMat);
      barrel.position.set(1.5, 0.41, 0.85);
      barrel.castShadow = true;
      g.add(barrel);

      // ميكانيكي واقف أمام الورشة
      if (typeof makePerson === 'function' && typeof SKIN !== 'undefined') {
        const mech = makePerson(0x284b63, pick(SKIN), 'adult');
        mech.position.set(0.85, 0, 0.25);
        mech.rotation.y = -0.6;
        g.add(mech);
      }

      // سيارة حقيقية راكنة أمام ورشة الميكانيكا
      const carSlot = new THREE.Group();
      carSlot.position.set(-0.25, 0, -0.95);
      carSlot.rotation.y = 0.12;
      g.add(carSlot);
      STREET_SHOPS.parkedCars.push({ slot: carSlot, key: pick(['traffic_lada', 'traffic_peugeot405', 'traffic_logan', 'traffic_corolla']), color: pick([0xd9d9d9, 0x2b4c7e, 0x8f2d2d, 0x3b4d3e]) });
    } else if (kind === 'pharmacy') {
      const signTex = makeShopSignTex('صيدلية الشفاء', 'أدوية · خدمة 24 ساعة +', '#0b5345', '#2ecc71');
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.62, 0.12), new THREE.MeshBasicMaterial({ map: signTex }));
      sign.position.set(0, 2.75, 1.15);
      sign.rotation.y = Math.PI;
      g.add(sign);
      if (typeof makePerson === 'function' && typeof SHIRTS !== 'undefined' && typeof SKIN !== 'undefined') {
        const person = makePerson(pick(SHIRTS), pick(SKIN), 'elder');
        person.position.set(0.2, 0, 0.1);
        g.add(person);
      }
    } else {
      const signTex = makeShopSignTex('كافيه وقهوة النيل', 'مشروبات ساخنة · عصائر طازجة', '#4a2c18', '#f5b041');
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.62, 0.12), new THREE.MeshBasicMaterial({ map: signTex }));
      sign.position.set(0, 2.75, 1.15);
      sign.rotation.y = Math.PI;
      g.add(sign);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 10), crateMat);
      table.position.set(-0.4, 0.68, 0.25);
      g.add(table);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.68, 8), darkMetal);
      leg.position.set(-0.4, 0.34, 0.25);
      g.add(leg);
      if (typeof makePerson === 'function' && typeof SHIRTS !== 'undefined' && typeof SKIN !== 'undefined') {
        const guest = makePerson(pick(SHIRTS), pick(SKIN), 'adult');
        guest.position.set(0.45, 0, 0.2);
        guest.rotation.y = -1.2;
        g.add(guest);
      }
    }

    STREET_SHOPS.group.add(g);
    STREET_SHOPS.shops.push({ kind, x: spot.px, z: spot.pz });
  });

  function spawnMechanicParkedCars() {
    if (typeof vehicleVisual !== 'function' || typeof importedModels === 'undefined') return false;
    let pending = 0;
    for (const pc of STREET_SHOPS.parkedCars) {
      if (pc.done) continue;
      if (!importedModels?.loaded?.[pc.key]) { pending++; continue; }
      const vis = vehicleVisual(pc.key, pc.color);
      if (vis) {
        vis.scale.setScalar(0.92);
        pc.slot.add(vis);
        pc.done = true;
      }
    }
    return pending === 0;
  }

  if (!spawnMechanicParkedCars() && typeof setInterval === 'function') {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (spawnMechanicParkedCars() || tries > 30) clearInterval(timer);
    }, 600);
  }
}

initAssyutStreetShops();
